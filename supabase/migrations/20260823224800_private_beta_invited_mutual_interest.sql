-- Private-beta Marriage participation is invitation-only and requires the
-- complete reviewed Marriage setup. Reciprocal private discovery interest may
-- create at most one active controlled introduction.

create or replace function private.member_can_participate(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = 'public', 'private'
as $$
  select exists (
    select 1
    from public.users u
    join public.waitlist_applications a on a.user_id = u.id
    join public.member_profiles p on p.user_id = u.id
    join public.member_profile_reviews r on r.user_id = u.id
    join public.member_connection_spaces space
      on space.user_id = u.id
     and space.space = 'marriage'::public.connection_space
     and space.membership_state = 'active'::public.connection_space_membership_state
    join private.marriage_practical_priorities priorities on priorities.user_id = u.id
    where u.id = p_user_id
      and u.account_status = 'active'::public.account_status
      and a.status = 'invited'::public.waitlist_status
      and a.questionnaire_completed_at is not null
      and a.submitted_at is not null
      and p.profile_completed_at is not null
      and priorities.completed_at is not null
      and r.state = 'approved'::public.member_profile_review_state
      and coalesce(
        (
          select s.state
          from public.member_safety_states s
          where s.user_id = u.id
        ),
        'clear'::public.member_safety_state
      ) = 'clear'::public.member_safety_state
      and (
        auth.uid() is null
        or auth.uid() <> p_user_id
        or private.current_auth_session_is_active()
      )
  );
$$;

revoke all on function private.member_can_participate(uuid) from public, anon, authenticated;

-- Historical development data may contain repeated one-sided `noticed` rows.
-- Keep the earliest row for each direction before enforcing idempotency.
with ranked_notices as (
  select
    id,
    row_number() over (
      partition by actor_user_id, candidate_user_id
      order by created_at asc, id asc
    ) as duplicate_rank
  from private.marriage_discovery_actions
  where action = 'noticed'::public.marriage_discovery_action
)
delete from private.marriage_discovery_actions action_row
using ranked_notices duplicate
where action_row.id = duplicate.id
  and duplicate.duplicate_rank > 1;

create unique index if not exists marriage_discovery_actions_noticed_unique_idx
  on private.marriage_discovery_actions (actor_user_id, candidate_user_id)
  where action = 'noticed'::public.marriage_discovery_action;

create or replace function public.record_marriage_discovery_action_v2(
  p_candidate_user_id uuid,
  p_action public.marriage_discovery_action
)
returns table(
  action_id uuid,
  introduction_id uuid,
  mutual_interest boolean
)
language plpgsql
security definer
set search_path = 'public', 'private'
as $$
declare
  v_user_id uuid := auth.uid();
  v_action_id uuid;
  v_introduction_id uuid;
  v_pair_key text;
  v_reverse_noticed boolean := false;
begin
  if v_user_id is null then
    raise exception 'authentication required';
  end if;

  if p_candidate_user_id is null
     or p_candidate_user_id = v_user_id
     or p_action is null then
    raise exception 'marriage discovery action unavailable';
  end if;

  if not private.marriage_member_is_discoverable(v_user_id)
     or not private.marriage_member_is_discoverable(p_candidate_user_id)
     or not private.members_match_hard_constraints(v_user_id, p_candidate_user_id)
     or not private.marriage_discovery_candidate_visible(v_user_id, p_candidate_user_id)
     or private.members_are_blocked(v_user_id, p_candidate_user_id)
     or private.marriage_pair_is_hidden(v_user_id, p_candidate_user_id) then
    raise exception 'marriage discovery action unavailable';
  end if;

  v_pair_key := case
    when v_user_id::text < p_candidate_user_id::text
      then v_user_id::text || ':' || p_candidate_user_id::text
    else p_candidate_user_id::text || ':' || v_user_id::text
  end;

  perform pg_advisory_xact_lock(hashtextextended('mutual-discovery:' || v_pair_key, 0));

  select i.id
  into v_introduction_id
  from private.controlled_introductions i
  where i.pair_key = v_pair_key
    and i.status in ('offered', 'mutually_accepted')
  order by i.created_at desc
  limit 1;

  if v_introduction_id is not null then
    raise exception 'marriage discovery action unavailable';
  end if;

  if p_action = 'noticed'::public.marriage_discovery_action then
    select d.id
    into v_action_id
    from private.marriage_discovery_actions d
    where d.actor_user_id = v_user_id
      and d.candidate_user_id = p_candidate_user_id
      and d.action = 'noticed'::public.marriage_discovery_action
    order by d.created_at asc, d.id asc
    limit 1;

    if v_action_id is null then
      insert into private.marriage_discovery_actions (
        actor_user_id,
        candidate_user_id,
        action
      ) values (
        v_user_id,
        p_candidate_user_id,
        'noticed'::public.marriage_discovery_action
      )
      on conflict (actor_user_id, candidate_user_id)
        where action = 'noticed'::public.marriage_discovery_action
      do nothing
      returning id into v_action_id;

      if v_action_id is null then
        select d.id
        into v_action_id
        from private.marriage_discovery_actions d
        where d.actor_user_id = v_user_id
          and d.candidate_user_id = p_candidate_user_id
          and d.action = 'noticed'::public.marriage_discovery_action
        order by d.created_at asc, d.id asc
        limit 1;
      end if;
    end if;

    select exists (
      select 1
      from private.marriage_discovery_actions reverse_action
      where reverse_action.actor_user_id = p_candidate_user_id
        and reverse_action.candidate_user_id = v_user_id
        and reverse_action.action = 'noticed'::public.marriage_discovery_action
    ) into v_reverse_noticed;

    if v_reverse_noticed then
      -- Re-check all gates while the pair lock is held. This prevents a stale
      -- discovery card from bypassing a new hide/block/eligibility change.
      if not private.marriage_member_is_discoverable(v_user_id)
         or not private.marriage_member_is_discoverable(p_candidate_user_id)
         or not private.members_match_hard_constraints(v_user_id, p_candidate_user_id)
         or not private.marriage_discovery_candidate_visible(v_user_id, p_candidate_user_id)
         or private.members_are_blocked(v_user_id, p_candidate_user_id)
         or private.marriage_pair_is_hidden(v_user_id, p_candidate_user_id) then
        raise exception 'marriage discovery action unavailable';
      end if;

      v_introduction_id := public.create_controlled_introduction(
        v_user_id,
        p_candidate_user_id,
        clock_timestamp() + interval '7 days',
        'mutual-discovery-interest'
      );
    end if;
  else
    insert into private.marriage_discovery_actions (
      actor_user_id,
      candidate_user_id,
      action
    ) values (
      v_user_id,
      p_candidate_user_id,
      p_action
    )
    returning id into v_action_id;
  end if;

  return query
  select v_action_id, v_introduction_id, v_introduction_id is not null;
end;
$$;

revoke all on function public.record_marriage_discovery_action_v2(uuid, public.marriage_discovery_action) from public;
revoke execute on function public.record_marriage_discovery_action_v2(uuid, public.marriage_discovery_action) from anon;
grant execute on function public.record_marriage_discovery_action_v2(uuid, public.marriage_discovery_action) to authenticated;

create or replace function public.record_marriage_discovery_action(
  p_candidate_user_id uuid,
  p_action public.marriage_discovery_action
)
returns uuid
language plpgsql
security definer
set search_path = 'public'
as $$
declare
  v_action_id uuid;
begin
  select result.action_id
  into v_action_id
  from public.record_marriage_discovery_action_v2(
    p_candidate_user_id,
    p_action
  ) result;

  return v_action_id;
end;
$$;

revoke all on function public.record_marriage_discovery_action(uuid, public.marriage_discovery_action) from public;
revoke execute on function public.record_marriage_discovery_action(uuid, public.marriage_discovery_action) from anon;
grant execute on function public.record_marriage_discovery_action(uuid, public.marriage_discovery_action) to authenticated;

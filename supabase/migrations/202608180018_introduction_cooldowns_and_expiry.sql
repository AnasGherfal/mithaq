create or replace function private.introduction_pair_key(
  p_user_a_id uuid,
  p_user_b_id uuid
)
returns text
language sql
immutable
security definer
set search_path = public, private
as $$
  select case
    when p_user_a_id::text < p_user_b_id::text
      then p_user_a_id::text || ':' || p_user_b_id::text
    else p_user_b_id::text || ':' || p_user_a_id::text
  end;
$$;

create or replace function private.introduction_pair_cooldown_until(
  p_user_a_id uuid,
  p_user_b_id uuid
)
returns timestamptz
language sql
stable
security definer
set search_path = public, private
as $$
  select max(
    case i.status
      when 'declined'::public.introduction_status
        then coalesce(i.closed_at, i.created_at) + interval '90 days'
      when 'cancelled'::public.introduction_status
        then coalesce(i.closed_at, i.created_at) + interval '60 days'
      when 'expired'::public.introduction_status
        then coalesce(i.closed_at, i.expires_at, i.created_at) + interval '30 days'
      when 'closed'::public.introduction_status
        then coalesce(i.closed_at, i.created_at) + interval '30 days'
      else null
    end
  )
  from private.controlled_introductions i
  where i.pair_key = private.introduction_pair_key(p_user_a_id, p_user_b_id);
$$;

create or replace function private.introduction_pair_in_cooldown(
  p_user_a_id uuid,
  p_user_b_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public, private
as $$
  select coalesce(
    private.introduction_pair_cooldown_until(p_user_a_id, p_user_b_id) > clock_timestamp(),
    false
  );
$$;

create or replace function public.expire_controlled_introductions(
  p_limit integer default 500
)
returns integer
language plpgsql
security definer
set search_path = public, private
as $$
declare
  v_count integer := 0;
begin
  if p_limit is null or p_limit < 1 or p_limit > 5000 then
    raise exception 'expiry limit must be between 1 and 5000';
  end if;

  with stale as (
    select i.id
    from private.controlled_introductions i
    where i.status = 'offered'::public.introduction_status
      and i.expires_at <= clock_timestamp()
    order by i.expires_at, i.id
    limit p_limit
    for update skip locked
  ), expired as (
    update private.controlled_introductions i
    set status = 'expired'::public.introduction_status,
        closed_at = clock_timestamp()
    from stale
    where i.id = stale.id
    returning i.id
  ), audited as (
    insert into private.controlled_introduction_events (
      introduction_id,
      event_type,
      actor_reference
    )
    select id, 'expired', 'expiry-worker'
    from expired
    returning 1
  )
  select count(*)::integer into v_count from audited;

  return v_count;
end;
$$;

create or replace function public.get_hard_match_candidates(
  p_user_id uuid,
  p_limit integer default 20
)
returns table (
  candidate_user_id uuid,
  submitted_at timestamptz
)
language plpgsql
security definer
set search_path = public, private
as $$
begin
  if p_user_id is null then
    raise exception 'member required';
  end if;

  if p_limit is null or p_limit < 1 or p_limit > 100 then
    raise exception 'candidate limit must be between 1 and 100';
  end if;

  if not private.member_can_participate(p_user_id) then
    raise exception 'member not eligible for matching';
  end if;

  return query
  select
    candidate.id,
    candidate_app.submitted_at
  from public.users candidate
  join public.waitlist_applications candidate_app
    on candidate_app.user_id = candidate.id
  where candidate.id <> p_user_id
    and private.members_match_hard_constraints(p_user_id, candidate.id)
    and not private.introduction_pair_in_cooldown(p_user_id, candidate.id)
    and not exists (
      select 1
      from private.controlled_introductions i
      where i.pair_key = private.introduction_pair_key(p_user_id, candidate.id)
        and (
          i.status = 'mutually_accepted'::public.introduction_status
          or (
            i.status = 'offered'::public.introduction_status
            and i.expires_at > clock_timestamp()
          )
        )
    )
  order by candidate_app.submitted_at asc nulls last, candidate.id
  limit p_limit;
end;
$$;

create or replace function public.create_controlled_introduction(
  p_user_a_id uuid,
  p_user_b_id uuid,
  p_expires_at timestamptz default null,
  p_actor_reference text default 'matching-engine'
)
returns uuid
language plpgsql
security definer
set search_path = public, private
as $$
declare
  v_id uuid;
  v_expires_at timestamptz := coalesce(p_expires_at, clock_timestamp() + interval '7 days');
  v_actor_reference text := nullif(btrim(p_actor_reference), '');
  v_pair_key text;
begin
  if p_user_a_id is null or p_user_b_id is null or p_user_a_id = p_user_b_id then
    raise exception 'invalid introduction pair';
  end if;

  if v_actor_reference is null or char_length(v_actor_reference) > 120 then
    raise exception 'invalid introduction actor';
  end if;

  if v_expires_at <= clock_timestamp() then
    raise exception 'invalid introduction expiry';
  end if;

  if not private.member_can_participate(p_user_a_id)
     or not private.member_can_participate(p_user_b_id) then
    raise exception 'member not eligible for introduction';
  end if;

  if private.members_are_blocked(p_user_a_id, p_user_b_id) then
    raise exception 'introduction pair blocked';
  end if;

  if not private.members_match_hard_constraints(p_user_a_id, p_user_b_id) then
    raise exception 'introduction pair does not meet hard constraints';
  end if;

  v_pair_key := private.introduction_pair_key(p_user_a_id, p_user_b_id);

  with expired as (
    update private.controlled_introductions i
    set status = 'expired'::public.introduction_status,
        closed_at = clock_timestamp()
    where i.pair_key = v_pair_key
      and i.status = 'offered'::public.introduction_status
      and i.expires_at <= clock_timestamp()
    returning i.id
  )
  insert into private.controlled_introduction_events (
    introduction_id,
    event_type,
    actor_reference
  )
  select id, 'expired', 'create-introduction'
  from expired;

  if private.introduction_pair_in_cooldown(p_user_a_id, p_user_b_id) then
    raise exception 'introduction pair in cooldown';
  end if;

  if exists (
    select 1
    from private.controlled_introductions i
    where i.pair_key = v_pair_key
      and i.status in ('offered', 'mutually_accepted')
  ) then
    raise exception 'active introduction already exists';
  end if;

  insert into private.controlled_introductions (
    user_a_id,
    user_b_id,
    expires_at,
    created_by
  ) values (
    p_user_a_id,
    p_user_b_id,
    v_expires_at,
    v_actor_reference
  )
  returning id into v_id;

  insert into private.controlled_introduction_events (
    introduction_id,
    event_type,
    actor_reference
  ) values (
    v_id,
    'created',
    v_actor_reference
  );

  return v_id;
end;
$$;

revoke all on function private.introduction_pair_key(uuid, uuid) from public, anon, authenticated;
grant execute on function private.introduction_pair_key(uuid, uuid) to service_role;

revoke all on function private.introduction_pair_cooldown_until(uuid, uuid) from public, anon, authenticated;
grant execute on function private.introduction_pair_cooldown_until(uuid, uuid) to service_role;

revoke all on function private.introduction_pair_in_cooldown(uuid, uuid) from public, anon, authenticated;
grant execute on function private.introduction_pair_in_cooldown(uuid, uuid) to service_role;

revoke all on function public.expire_controlled_introductions(integer) from public, anon, authenticated;
grant execute on function public.expire_controlled_introductions(integer) to service_role;

revoke all on function public.get_hard_match_candidates(uuid, integer) from public, anon, authenticated;
grant execute on function public.get_hard_match_candidates(uuid, integer) to service_role;

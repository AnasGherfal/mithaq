create type public.marriage_discovery_action as enum ('noticed', 'skipped');

create table private.marriage_discovery_actions (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid not null references public.users(id) on delete cascade,
  candidate_user_id uuid not null references public.users(id) on delete cascade,
  action public.marriage_discovery_action not null,
  created_at timestamptz not null default clock_timestamp(),
  check (actor_user_id <> candidate_user_id)
);

create index marriage_discovery_actions_actor_time_idx
  on private.marriage_discovery_actions (actor_user_id, created_at desc, candidate_user_id);
create index marriage_discovery_actions_candidate_time_idx
  on private.marriage_discovery_actions (candidate_user_id, created_at desc);

revoke all on table private.marriage_discovery_actions from public, anon, authenticated;
grant select, insert, update, delete on table private.marriage_discovery_actions to service_role;

create or replace function private.marriage_member_is_discoverable(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, private
as $$
  select exists (
    select 1
    from public.users u
    join public.member_connection_spaces s
      on s.user_id = u.id
     and s.space = 'marriage'::public.connection_space
     and s.membership_state = 'active'::public.connection_space_membership_state
    join public.waitlist_applications a on a.user_id = u.id
    join public.member_profiles p on p.user_id = u.id
    where u.id = p_user_id
      and u.account_status = 'active'
      and a.status in ('submitted', 'qualified', 'invited')
      and a.submitted_at is not null
      and a.questionnaire_completed_at is not null
      and p.profile_completed_at is not null
      and private.member_can_participate(p_user_id)
  );
$$;

create or replace function public.list_marriage_discovery(p_limit integer default 6)
returns table (
  user_id uuid,
  display_name text,
  about_me text,
  occupation text,
  education text,
  city text,
  origin_region text,
  age_band_id smallint,
  marital_status public.marital_status,
  has_children boolean
)
language plpgsql
security definer
set search_path = public, private
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then raise exception 'authentication required'; end if;
  if p_limit is null or p_limit < 1 or p_limit > 12 then raise exception 'invalid marriage discovery limit'; end if;
  if not private.marriage_member_is_discoverable(v_user_id) then raise exception 'marriage profile required'; end if;

  return query
  select
    p.user_id,
    p.display_name,
    p.about_me,
    p.occupation,
    p.education,
    a.current_city,
    a.libyan_origin_region,
    a.age_band_id,
    a.marital_status,
    a.has_children
  from public.member_profiles p
  join public.waitlist_applications a on a.user_id = p.user_id
  where p.user_id <> v_user_id
    and private.marriage_member_is_discoverable(p.user_id)
    and private.members_match_hard_constraints(v_user_id, p.user_id)
    and not exists (
      select 1 from private.controlled_introductions i
      where i.pair_key = case
        when v_user_id::text < p.user_id::text then v_user_id::text || ':' || p.user_id::text
        else p.user_id::text || ':' || v_user_id::text
      end
      and i.status in ('offered', 'mutually_accepted')
    )
    and not exists (
      select 1 from private.marriage_discovery_actions d
      where d.actor_user_id = v_user_id
        and d.candidate_user_id = p.user_id
        and (
          d.action = 'noticed'::public.marriage_discovery_action
          or d.created_at >= clock_timestamp() - interval '14 days'
        )
    )
  order by md5(p.user_id::text || current_date::text || v_user_id::text)
  limit p_limit;
end;
$$;

create or replace function public.record_marriage_discovery_action(
  p_candidate_user_id uuid,
  p_action public.marriage_discovery_action
)
returns uuid
language plpgsql
security definer
set search_path = public, private
as $$
declare
  v_user_id uuid := auth.uid();
  v_id uuid;
begin
  if v_user_id is null then raise exception 'authentication required'; end if;
  if p_candidate_user_id is null or p_candidate_user_id = v_user_id or p_action is null then
    raise exception 'marriage discovery action unavailable';
  end if;
  if not private.marriage_member_is_discoverable(v_user_id)
     or not private.marriage_member_is_discoverable(p_candidate_user_id)
     or not private.members_match_hard_constraints(v_user_id, p_candidate_user_id)
     or private.members_are_blocked(v_user_id, p_candidate_user_id) then
    raise exception 'marriage discovery action unavailable';
  end if;
  if exists (
    select 1 from private.controlled_introductions i
    where i.pair_key = case
      when v_user_id::text < p_candidate_user_id::text then v_user_id::text || ':' || p_candidate_user_id::text
      else p_candidate_user_id::text || ':' || v_user_id::text
    end
    and i.status in ('offered', 'mutually_accepted')
  ) then raise exception 'marriage discovery action unavailable'; end if;

  insert into private.marriage_discovery_actions (actor_user_id, candidate_user_id, action)
  values (v_user_id, p_candidate_user_id, p_action)
  returning id into v_id;
  return v_id;
end;
$$;

revoke all on function private.marriage_member_is_discoverable(uuid) from public, anon, authenticated;
grant execute on function private.marriage_member_is_discoverable(uuid) to service_role;
revoke all on function public.list_marriage_discovery(integer) from public, anon;
revoke all on function public.record_marriage_discovery_action(uuid, public.marriage_discovery_action) from public, anon;
grant execute on function public.list_marriage_discovery(integer) to authenticated, service_role;
grant execute on function public.record_marriage_discovery_action(uuid, public.marriage_discovery_action) to authenticated, service_role;

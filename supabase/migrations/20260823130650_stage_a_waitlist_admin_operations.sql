create table if not exists private.waitlist_admin_action_log (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid not null references auth.users(id),
  application_id uuid not null references public.waitlist_applications(id),
  from_status public.waitlist_status not null,
  to_status public.waitlist_status not null,
  occurred_at timestamptz not null default clock_timestamp()
);

create index if not exists waitlist_admin_action_log_application_idx
  on private.waitlist_admin_action_log (application_id, occurred_at desc);

create index if not exists waitlist_admin_action_log_actor_idx
  on private.waitlist_admin_action_log (actor_user_id, occurred_at desc);

revoke all on private.waitlist_admin_action_log from public, anon, authenticated;

create or replace function public.list_admin_waitlist_applications(
  p_status public.waitlist_status default null,
  p_limit integer default 100
)
returns table(
  application_id uuid,
  status public.waitlist_status,
  gender public.gender,
  age_band_label text,
  residency_type public.residency_type,
  current_country_code text,
  current_city text,
  marital_status public.marital_status,
  has_children boolean,
  submitted_at timestamptz,
  created_at timestamptz,
  referred_by_invite boolean
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_limit integer := greatest(1, least(coalesce(p_limit, 100), 200));
begin
  if v_user_id is null then
    raise exception 'authentication required';
  end if;

  if not exists (
    select 1
    from private.moderation_staff s
    where s.user_id = v_user_id
      and s.active is true
      and s.role = 'admin'
  ) then
    raise exception 'admin access required';
  end if;

  return query
  select
    a.id,
    a.status,
    a.gender,
    b.label,
    a.residency_type,
    trim(a.current_country_code)::text,
    a.current_city,
    a.marital_status,
    a.has_children,
    a.submitted_at,
    a.created_at,
    exists (
      select 1
      from private.referral_events re
      where re.referred_user_id = a.user_id
        and re.event_type = 'submitted'
    )
  from public.waitlist_applications a
  left join public.age_bands b on b.id = a.age_band_id
  where p_status is null or a.status = p_status
  order by coalesce(a.submitted_at, a.created_at) desc, a.id desc
  limit v_limit;
end;
$$;

revoke all on function public.list_admin_waitlist_applications(public.waitlist_status, integer) from public;
revoke execute on function public.list_admin_waitlist_applications(public.waitlist_status, integer) from anon;
grant execute on function public.list_admin_waitlist_applications(public.waitlist_status, integer) to authenticated;

create or replace function public.admin_set_waitlist_status(
  p_application_id uuid,
  p_to_status public.waitlist_status
)
returns public.waitlist_status
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor_user_id uuid := auth.uid();
  v_from_status public.waitlist_status;
begin
  if v_actor_user_id is null then
    raise exception 'authentication required';
  end if;

  if not exists (
    select 1
    from private.moderation_staff s
    where s.user_id = v_actor_user_id
      and s.active is true
      and s.role = 'admin'
  ) then
    raise exception 'admin access required';
  end if;

  select a.status
  into v_from_status
  from public.waitlist_applications a
  where a.id = p_application_id
  for update;

  if v_from_status is null then
    raise exception 'application not found';
  end if;

  if v_from_status = p_to_status then
    return v_from_status;
  end if;

  if v_from_status in ('withdrawn', 'deleted') then
    raise exception 'terminal application status';
  end if;

  if p_to_status not in ('submitted', 'qualified', 'invited', 'declined') then
    raise exception 'invalid admin status';
  end if;

  if not (
    (v_from_status = 'submitted' and p_to_status in ('qualified', 'declined'))
    or (v_from_status = 'qualified' and p_to_status in ('submitted', 'invited', 'declined'))
    or (v_from_status = 'invited' and p_to_status in ('qualified', 'declined'))
    or (v_from_status = 'declined' and p_to_status = 'submitted')
  ) then
    raise exception 'invalid status transition';
  end if;

  update public.waitlist_applications
  set status = p_to_status,
      updated_at = clock_timestamp()
  where id = p_application_id;

  insert into private.waitlist_admin_action_log (
    actor_user_id,
    application_id,
    from_status,
    to_status
  ) values (
    v_actor_user_id,
    p_application_id,
    v_from_status,
    p_to_status
  );

  return p_to_status;
end;
$$;

revoke all on function public.admin_set_waitlist_status(uuid, public.waitlist_status) from public;
revoke execute on function public.admin_set_waitlist_status(uuid, public.waitlist_status) from anon;
grant execute on function public.admin_set_waitlist_status(uuid, public.waitlist_status) to authenticated;

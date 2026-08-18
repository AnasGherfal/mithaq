create table private.introduction_expiry_runs (
  id uuid primary key default gen_random_uuid(),
  requested_limit integer not null check (requested_limit between 1 and 5000),
  introductions_expired integer not null check (introductions_expired >= 0),
  recorded_at timestamptz not null default clock_timestamp()
);

revoke all on table private.introduction_expiry_runs from public, anon, authenticated;
grant select, insert on table private.introduction_expiry_runs to service_role;

create index introduction_expiry_runs_time_idx
  on private.introduction_expiry_runs (recorded_at desc, id desc);

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

  insert into private.introduction_expiry_runs (
    requested_limit,
    introductions_expired
  ) values (
    p_limit,
    v_count
  );

  return v_count;
end;
$$;

revoke all on function public.expire_controlled_introductions(integer)
from public, anon, authenticated;
grant execute on function public.expire_controlled_introductions(integer)
to service_role;

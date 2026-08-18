create or replace function public.get_release_readiness(
  p_conversation_closed_before timestamptz,
  p_notification_read_before timestamptz,
  p_worker_stale_after interval default interval '2 hours',
  p_max_backlog bigint default 0
)
returns table (
  is_ready boolean,
  blocking_worker_count integer,
  blocking_workers text[]
)
language plpgsql
security definer
set search_path = public, private
as $$
begin
  if p_max_backlog is null or p_max_backlog < 0 or p_max_backlog > 1000000 then
    raise exception 'maximum backlog must be between 0 and 1000000';
  end if;

  return query
  with health as (
    select *
    from public.get_maintenance_health(
      p_conversation_closed_before,
      p_notification_read_before,
      p_worker_stale_after
    )
  ), blockers as (
    select worker_name
    from health
    where worker_status in ('never_run', 'stale')
       or eligible_count > p_max_backlog
  )
  select
    count(*) = 0,
    count(*)::integer,
    coalesce(array_agg(worker_name order by worker_name), '{}'::text[])
  from blockers;
end;
$$;

revoke all on function public.get_release_readiness(timestamptz, timestamptz, interval, bigint)
from public, anon, authenticated;
grant execute on function public.get_release_readiness(timestamptz, timestamptz, interval, bigint)
to service_role;

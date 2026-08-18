create or replace function public.get_maintenance_health(
  p_conversation_closed_before timestamptz,
  p_notification_read_before timestamptz,
  p_worker_stale_after interval default interval '2 hours'
)
returns table (
  worker_name text,
  eligible_count bigint,
  last_run_at timestamptz,
  worker_status text
)
language plpgsql
security definer
set search_path = public, private
as $$
begin
  if p_worker_stale_after is null
     or p_worker_stale_after <= interval '0 seconds'
     or p_worker_stale_after > interval '30 days' then
    raise exception 'worker freshness window must be between 0 and 30 days';
  end if;

  return query
  select
    backlog.worker_name,
    backlog.eligible_count,
    backlog.last_run_at,
    case
      when backlog.last_run_at is null then 'never_run'::text
      when backlog.last_run_at < clock_timestamp() - p_worker_stale_after then 'stale'::text
      when backlog.worker_name = 'account_deletion'
        and deletion_run.run_status = 'failed' then 'failed'::text
      when backlog.worker_name = 'account_deletion'
        and deletion_run.run_status = 'partial' then 'degraded'::text
      when backlog.eligible_count > 0 then 'backlogged'::text
      else 'healthy'::text
    end
  from public.get_maintenance_backlog(
    p_conversation_closed_before,
    p_notification_read_before
  ) backlog
  left join lateral (
    select r.run_status
    from private.account_deletion_worker_runs r
    where backlog.worker_name = 'account_deletion'
    order by r.recorded_at desc, r.id desc
    limit 1
  ) deletion_run on true
  order by backlog.worker_name;
end;
$$;

revoke all on function public.get_maintenance_health(timestamptz, timestamptz, interval)
from public, anon, authenticated;
grant execute on function public.get_maintenance_health(timestamptz, timestamptz, interval)
to service_role;

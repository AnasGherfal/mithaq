create index if not exists member_notifications_read_retention_idx
  on private.member_notifications (read_at, id)
  where read_at is not null;

create table private.notification_retention_runs (
  id uuid primary key default gen_random_uuid(),
  read_before timestamptz not null,
  notification_limit integer not null check (notification_limit between 1 and 10000),
  notifications_deleted integer not null check (notifications_deleted >= 0),
  recorded_at timestamptz not null default clock_timestamp()
);

revoke all on table private.notification_retention_runs from public, anon, authenticated;
grant select, insert on table private.notification_retention_runs to service_role;

create or replace function public.purge_read_member_notifications(
  p_read_before timestamptz,
  p_limit integer default 1000
)
returns integer
language plpgsql
security definer
set search_path = public, private
as $$
declare
  v_notification_ids uuid[] := '{}'::uuid[];
  v_notifications_deleted integer := 0;
begin
  if p_read_before is null or p_read_before >= clock_timestamp() then
    raise exception 'notification retention cutoff must be in the past';
  end if;

  if p_limit is null or p_limit < 1 or p_limit > 10000 then
    raise exception 'notification retention limit must be between 1 and 10000';
  end if;

  select coalesce(array_agg(eligible.id), '{}'::uuid[])
  into v_notification_ids
  from (
    select n.id
    from private.member_notifications n
    where n.read_at is not null
      and n.read_at <= p_read_before
    order by n.read_at, n.id
    limit p_limit
    for update skip locked
  ) eligible;

  if cardinality(v_notification_ids) > 0 then
    delete from private.member_notifications n
    where n.id = any(v_notification_ids);

    get diagnostics v_notifications_deleted = row_count;
  end if;

  insert into private.notification_retention_runs (
    read_before,
    notification_limit,
    notifications_deleted
  ) values (
    p_read_before,
    p_limit,
    v_notifications_deleted
  );

  return v_notifications_deleted;
end;
$$;

revoke all on function public.purge_read_member_notifications(timestamptz, integer)
from public, anon, authenticated;
grant execute on function public.purge_read_member_notifications(timestamptz, integer)
to service_role;

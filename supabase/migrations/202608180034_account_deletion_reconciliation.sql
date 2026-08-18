-- Reconcile the narrow failure window where Auth deletion succeeds but the
-- worker cannot persist the final tombstone update. The public user and deletion
-- request cascade away with Auth, while the private tombstone intentionally
-- survives as durable audit state.

create or replace function public.reconcile_orphaned_account_deletions(
  p_limit integer default 25
)
returns integer
language plpgsql
security definer
set search_path = public, private, auth
as $$
declare
  v_count integer := 0;
begin
  if p_limit is null or p_limit < 1 or p_limit > 100 then
    raise exception 'invalid reconciliation limit';
  end if;

  with orphaned as (
    select t.request_id
    from private.account_deletion_tombstones t
    where t.state = 'processing'
      and t.user_id is not null
      and not exists (
        select 1
        from auth.users au
        where au.id = t.user_id
      )
      and not exists (
        select 1
        from public.users u
        where u.id = t.user_id
      )
      and not exists (
        select 1
        from public.deletion_requests dr
        where dr.id = t.request_id
      )
    order by t.processing_started_at, t.request_id
    limit p_limit
    for update skip locked
  ), reconciled as (
    update private.account_deletion_tombstones t
    set user_id = null,
        state = 'completed',
        completed_at = coalesce(t.completed_at, clock_timestamp()),
        last_error_code = null
    from orphaned o
    where t.request_id = o.request_id
    returning t.request_id
  )
  select count(*)::integer into v_count
  from reconciled;

  return v_count;
end;
$$;

revoke all on function public.reconcile_orphaned_account_deletions(integer)
from public, anon, authenticated;
grant execute on function public.reconcile_orphaned_account_deletions(integer)
to service_role;

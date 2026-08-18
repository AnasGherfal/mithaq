create or replace function public.mark_my_notifications_read_v2(
  p_through_created_at timestamptz,
  p_through_notification_id uuid
)
returns integer
language plpgsql
security definer
set search_path = public, private
as $$
declare
  v_user_id uuid := auth.uid();
  v_count integer := 0;
begin
  if v_user_id is null then
    raise exception 'authentication required';
  end if;

  if p_through_created_at is null or p_through_notification_id is null then
    raise exception 'notification read cursor requires timestamp and id';
  end if;

  if not exists (
    select 1
    from public.users u
    where u.id = v_user_id
      and u.account_status = 'active'
  ) then
    raise exception 'account unavailable';
  end if;

  if not exists (
    select 1
    from private.member_notifications n
    where n.id = p_through_notification_id
      and n.user_id = v_user_id
      and n.created_at = p_through_created_at
  ) then
    raise exception 'notification read cursor unavailable';
  end if;

  update private.member_notifications n
  set read_at = clock_timestamp()
  where n.user_id = v_user_id
    and n.read_at is null
    and (n.created_at, n.id) <= (p_through_created_at, p_through_notification_id);

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke all on function public.mark_my_notifications_read_v2(timestamptz, uuid)
from public, anon, authenticated;
grant execute on function public.mark_my_notifications_read_v2(timestamptz, uuid)
to authenticated, service_role;

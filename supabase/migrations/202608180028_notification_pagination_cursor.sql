create or replace function public.list_my_notifications_v2(
  p_before_created_at timestamptz default null,
  p_before_notification_id uuid default null,
  p_limit integer default 50
)
returns table (
  notification_id uuid,
  notification_kind text,
  introduction_id uuid,
  created_at timestamptz,
  is_read boolean
)
language plpgsql
stable
security definer
set search_path = public, private
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'authentication required';
  end if;

  if p_limit is null or p_limit < 1 or p_limit > 100 then
    raise exception 'notification limit must be between 1 and 100';
  end if;

  if (p_before_created_at is null) <> (p_before_notification_id is null) then
    raise exception 'notification cursor requires timestamp and id';
  end if;

  if not exists (
    select 1
    from public.users u
    where u.id = v_user_id
      and u.account_status = 'active'
  ) then
    raise exception 'account unavailable';
  end if;

  return query
  select
    n.id,
    n.kind,
    n.introduction_id,
    n.created_at,
    n.read_at is not null
  from private.member_notifications n
  where n.user_id = v_user_id
    and (
      p_before_created_at is null
      or (n.created_at, n.id) < (p_before_created_at, p_before_notification_id)
    )
  order by n.created_at desc, n.id desc
  limit p_limit;
end;
$$;

revoke all on function public.list_my_notifications_v2(timestamptz, uuid, integer)
from public, anon, authenticated;
grant execute on function public.list_my_notifications_v2(timestamptz, uuid, integer)
to authenticated, service_role;

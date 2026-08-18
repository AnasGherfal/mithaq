create table private.member_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  kind text not null check (kind in ('introduction_offered', 'message_received')),
  introduction_id uuid not null references private.controlled_introductions(id) on delete cascade,
  message_id uuid references private.conversation_messages(id) on delete cascade,
  created_at timestamptz not null default clock_timestamp(),
  read_at timestamptz,
  check (
    (kind = 'introduction_offered' and message_id is null)
    or (kind = 'message_received' and message_id is not null)
  )
);

create index member_notifications_user_time_idx
  on private.member_notifications (user_id, created_at desc, id desc);

create index member_notifications_user_unread_idx
  on private.member_notifications (user_id, created_at desc)
  where read_at is null;

create unique index member_notifications_intro_offer_unique_idx
  on private.member_notifications (user_id, introduction_id, kind)
  where kind = 'introduction_offered';

create unique index member_notifications_message_unique_idx
  on private.member_notifications (user_id, message_id)
  where message_id is not null;

revoke all on table private.member_notifications from public, anon, authenticated;
grant select, insert, update, delete on table private.member_notifications to service_role;

create or replace function private.notify_controlled_introduction_offered()
returns trigger
language plpgsql
security definer
set search_path = public, private
as $$
begin
  if new.status <> 'offered'::public.introduction_status then
    return new;
  end if;

  insert into private.member_notifications (
    user_id,
    kind,
    introduction_id
  ) values
    (new.user_a_id, 'introduction_offered', new.id),
    (new.user_b_id, 'introduction_offered', new.id)
  on conflict do nothing;

  return new;
end;
$$;

create trigger controlled_introduction_offer_notification
  after insert on private.controlled_introductions
  for each row execute function private.notify_controlled_introduction_offered();

create or replace function private.notify_conversation_message_received()
returns trigger
language plpgsql
security definer
set search_path = public, private
as $$
declare
  v_introduction_id uuid;
  v_recipient_id uuid;
begin
  select
    c.introduction_id,
    case
      when c.user_a_id = new.sender_user_id then c.user_b_id
      when c.user_b_id = new.sender_user_id then c.user_a_id
      else null
    end
  into v_introduction_id, v_recipient_id
  from private.introduction_conversations c
  where c.id = new.conversation_id;

  if v_introduction_id is null or v_recipient_id is null then
    return new;
  end if;

  insert into private.member_notifications (
    user_id,
    kind,
    introduction_id,
    message_id,
    created_at
  ) values (
    v_recipient_id,
    'message_received',
    v_introduction_id,
    new.id,
    new.sent_at
  )
  on conflict do nothing;

  return new;
end;
$$;

create trigger conversation_message_notification
  after insert on private.conversation_messages
  for each row execute function private.notify_conversation_message_received();

create or replace function public.list_my_notifications(
  p_before timestamptz default null,
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
    and (p_before is null or n.created_at < p_before)
  order by n.created_at desc, n.id desc
  limit p_limit;
end;
$$;

create or replace function public.get_my_notification_unread_count()
returns bigint
language plpgsql
stable
security definer
set search_path = public, private
as $$
declare
  v_user_id uuid := auth.uid();
  v_count bigint;
begin
  if v_user_id is null then
    raise exception 'authentication required';
  end if;

  if not exists (
    select 1
    from public.users u
    where u.id = v_user_id
      and u.account_status = 'active'
  ) then
    raise exception 'account unavailable';
  end if;

  select count(*)::bigint
  into v_count
  from private.member_notifications n
  where n.user_id = v_user_id
    and n.read_at is null;

  return v_count;
end;
$$;

create or replace function public.mark_my_notifications_read(
  p_through timestamptz default null
)
returns integer
language plpgsql
security definer
set search_path = public, private
as $$
declare
  v_user_id uuid := auth.uid();
  v_through timestamptz := least(coalesce(p_through, clock_timestamp()), clock_timestamp());
  v_count integer;
begin
  if v_user_id is null then
    raise exception 'authentication required';
  end if;

  if not exists (
    select 1
    from public.users u
    where u.id = v_user_id
      and u.account_status = 'active'
  ) then
    raise exception 'account unavailable';
  end if;

  update private.member_notifications n
  set read_at = clock_timestamp()
  where n.user_id = v_user_id
    and n.read_at is null
    and n.created_at <= v_through;

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke all on function private.notify_controlled_introduction_offered() from public, anon, authenticated;
revoke all on function private.notify_conversation_message_received() from public, anon, authenticated;

revoke all on function public.list_my_notifications(timestamptz, integer) from public, anon, authenticated;
grant execute on function public.list_my_notifications(timestamptz, integer) to authenticated, service_role;

revoke all on function public.get_my_notification_unread_count() from public, anon, authenticated;
grant execute on function public.get_my_notification_unread_count() to authenticated, service_role;

revoke all on function public.mark_my_notifications_read(timestamptz) from public, anon, authenticated;
grant execute on function public.mark_my_notifications_read(timestamptz) to authenticated, service_role;

create or replace function public.list_my_conversation_messages_v2(
  p_introduction_id uuid,
  p_before_sent_at timestamptz default null,
  p_before_message_id uuid default null,
  p_limit integer default 50
)
returns table (
  message_id uuid,
  sender_is_me boolean,
  body text,
  sent_at timestamptz
)
language plpgsql
security definer
set search_path = public, private
as $$
declare
  v_user_id uuid := auth.uid();
  v_conversation_id uuid;
begin
  if v_user_id is null then
    raise exception 'authentication required';
  end if;

  if p_limit is null or p_limit < 1 or p_limit > 100 then
    raise exception 'message limit must be between 1 and 100';
  end if;

  if (p_before_sent_at is null) <> (p_before_message_id is null) then
    raise exception 'message cursor requires timestamp and id';
  end if;

  v_conversation_id := private.member_open_conversation_id(p_introduction_id, v_user_id);
  if v_conversation_id is null then
    raise exception 'conversation unavailable';
  end if;

  return query
  select q.message_id, q.sender_is_me, q.body, q.sent_at
  from (
    select
      m.id as message_id,
      m.sender_user_id = v_user_id as sender_is_me,
      m.body,
      m.sent_at
    from private.conversation_messages m
    where m.conversation_id = v_conversation_id
      and (
        p_before_sent_at is null
        or (m.sent_at, m.id) < (p_before_sent_at, p_before_message_id)
      )
    order by m.sent_at desc, m.id desc
    limit p_limit
  ) q
  order by q.sent_at asc, q.message_id asc;
end;
$$;

revoke all on function public.list_my_conversation_messages_v2(uuid, timestamptz, uuid, integer)
from public, anon, authenticated;
grant execute on function public.list_my_conversation_messages_v2(uuid, timestamptz, uuid, integer)
to authenticated, service_role;

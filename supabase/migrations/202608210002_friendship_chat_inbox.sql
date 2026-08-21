create or replace function public.list_my_friendship_chats()
returns table (
  connection_id uuid,
  counterpart_user_id uuid,
  display_name text,
  city text,
  last_message_body text,
  last_message_at timestamptz,
  unread_count integer
)
language plpgsql
security definer
set search_path = public, private
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'authentication required';
  end if;

  return query
  select
    fc.id,
    case when fc.user_low_id = v_user_id then fc.user_high_id else fc.user_low_id end,
    fp.display_name,
    fp.city,
    lm.body,
    lm.sent_at,
    coalesce((
      select count(*)::integer
      from private.friendship_messages um
      left join private.friendship_conversation_read_state rs
        on rs.conversation_id = c.id
       and rs.user_id = v_user_id
      where um.conversation_id = c.id
        and um.sender_user_id <> v_user_id
        and (rs.read_through is null or um.sent_at > rs.read_through)
    ), 0)
  from private.friendship_connections fc
  join private.friendship_conversations c
    on c.connection_id = fc.id
   and c.status = 'open'::public.conversation_status
  join public.friendship_profiles fp
    on fp.user_id = case when fc.user_low_id = v_user_id then fc.user_high_id else fc.user_low_id end
  left join lateral (
    select m.body, m.sent_at
    from private.friendship_messages m
    where m.conversation_id = c.id
    order by m.sent_at desc, m.id desc
    limit 1
  ) lm on true
  where (fc.user_low_id = v_user_id or fc.user_high_id = v_user_id)
    and not private.members_are_blocked(fc.user_low_id, fc.user_high_id)
    and private.friendship_member_is_eligible(v_user_id)
    and private.friendship_member_is_eligible(
      case when fc.user_low_id = v_user_id then fc.user_high_id else fc.user_low_id end
    )
  order by lm.sent_at desc nulls last, fc.connected_at desc, fc.id;
end;
$$;

revoke all on function public.list_my_friendship_chats() from public, anon;
grant execute on function public.list_my_friendship_chats() to authenticated, service_role;

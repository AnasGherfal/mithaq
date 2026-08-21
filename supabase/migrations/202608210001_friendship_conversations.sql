create table private.friendship_conversations (
  id uuid primary key default gen_random_uuid(),
  connection_id uuid not null unique references private.friendship_connections(id) on delete cascade,
  user_a_id uuid not null references public.users(id) on delete cascade,
  user_b_id uuid not null references public.users(id) on delete cascade,
  status public.conversation_status not null default 'open',
  opened_at timestamptz not null default clock_timestamp(),
  closed_at timestamptz,
  check (user_a_id <> user_b_id),
  check ((status = 'open' and closed_at is null) or (status = 'closed' and closed_at is not null))
);

create index friendship_conversations_user_a_idx
  on private.friendship_conversations (user_a_id, opened_at desc);
create index friendship_conversations_user_b_idx
  on private.friendship_conversations (user_b_id, opened_at desc);

create table private.friendship_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references private.friendship_conversations(id) on delete cascade,
  sender_user_id uuid not null references public.users(id) on delete cascade,
  body text not null,
  client_nonce text not null,
  sent_at timestamptz not null default clock_timestamp(),
  check (char_length(body) between 1 and 2000),
  check (char_length(client_nonce) between 8 and 120),
  unique (conversation_id, sender_user_id, client_nonce)
);

create index friendship_messages_time_idx
  on private.friendship_messages (conversation_id, sent_at desc, id desc);

create table private.friendship_conversation_read_state (
  conversation_id uuid not null references private.friendship_conversations(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  read_through timestamptz,
  updated_at timestamptz not null default clock_timestamp(),
  primary key (conversation_id, user_id)
);

revoke all on table private.friendship_conversations from public, anon, authenticated;
revoke all on table private.friendship_messages from public, anon, authenticated;
revoke all on table private.friendship_conversation_read_state from public, anon, authenticated;
grant select, insert, update, delete on table private.friendship_conversations to service_role;
grant select, insert, update, delete on table private.friendship_messages to service_role;
grant select, insert, update, delete on table private.friendship_conversation_read_state to service_role;

create or replace function private.member_open_friendship_conversation_id(
  p_connection_id uuid,
  p_user_id uuid
)
returns uuid
language plpgsql
stable
security definer
set search_path = public, private
as $$
declare
  v_conversation_id uuid;
  v_other_user_id uuid;
begin
  select c.id,
    case when c.user_a_id = p_user_id then c.user_b_id else c.user_a_id end
  into v_conversation_id, v_other_user_id
  from private.friendship_conversations c
  join private.friendship_connections fc on fc.id = c.connection_id
  where c.connection_id = p_connection_id
    and c.status = 'open'::public.conversation_status
    and (c.user_a_id = p_user_id or c.user_b_id = p_user_id)
    and (fc.user_a_id = p_user_id or fc.user_b_id = p_user_id);

  if v_conversation_id is null or v_other_user_id is null then return null; end if;
  if private.members_are_blocked(p_user_id, v_other_user_id)
     or not private.friendship_member_is_eligible(p_user_id)
     or not private.friendship_member_is_eligible(v_other_user_id) then
    return null;
  end if;
  return v_conversation_id;
end;
$$;

create or replace function public.open_my_friendship_conversation(p_connection_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public, private
as $$
declare
  v_user_id uuid := auth.uid();
  v_connection private.friendship_connections%rowtype;
  v_id uuid;
begin
  if v_user_id is null then raise exception 'authentication required'; end if;

  select * into v_connection
  from private.friendship_connections fc
  where fc.id = p_connection_id
    and (fc.user_a_id = v_user_id or fc.user_b_id = v_user_id);

  if not found then raise exception 'friendship conversation unavailable'; end if;
  if private.members_are_blocked(v_connection.user_a_id, v_connection.user_b_id)
     or not private.friendship_member_is_eligible(v_connection.user_a_id)
     or not private.friendship_member_is_eligible(v_connection.user_b_id) then
    raise exception 'friendship conversation unavailable';
  end if;

  insert into private.friendship_conversations (connection_id, user_a_id, user_b_id)
  values (v_connection.id, v_connection.user_a_id, v_connection.user_b_id)
  on conflict (connection_id) do nothing;

  select id into v_id
  from private.friendship_conversations
  where connection_id = v_connection.id and status = 'open'::public.conversation_status;

  if v_id is null then raise exception 'friendship conversation unavailable'; end if;
  return v_id;
end;
$$;

create or replace function public.list_my_friendship_messages(
  p_connection_id uuid,
  p_before_sent_at timestamptz default null,
  p_before_message_id uuid default null,
  p_limit integer default 50
)
returns table (message_id uuid, sender_is_me boolean, body text, sent_at timestamptz)
language plpgsql
security definer
set search_path = public, private
as $$
declare
  v_user_id uuid := auth.uid();
  v_conversation_id uuid;
begin
  if v_user_id is null then raise exception 'authentication required'; end if;
  if p_limit < 1 or p_limit > 100 then raise exception 'message limit must be between 1 and 100'; end if;

  v_conversation_id := private.member_open_friendship_conversation_id(p_connection_id, v_user_id);
  if v_conversation_id is null then
    v_conversation_id := public.open_my_friendship_conversation(p_connection_id);
  end if;

  return query
  select q.message_id, q.sender_is_me, q.body, q.sent_at
  from (
    select m.id message_id, m.sender_user_id = v_user_id sender_is_me, m.body, m.sent_at
    from private.friendship_messages m
    where m.conversation_id = v_conversation_id
      and (
        p_before_sent_at is null
        or m.sent_at < p_before_sent_at
        or (m.sent_at = p_before_sent_at and p_before_message_id is not null and m.id < p_before_message_id)
      )
    order by m.sent_at desc, m.id desc
    limit p_limit
  ) q
  order by q.sent_at asc, q.message_id asc;
end;
$$;

create or replace function public.send_friendship_message(
  p_connection_id uuid,
  p_body text,
  p_client_nonce text
)
returns uuid
language plpgsql
security definer
set search_path = public, private
as $$
declare
  v_user_id uuid := auth.uid();
  v_conversation_id uuid;
  v_body text := btrim(coalesce(p_body, ''));
  v_nonce text := btrim(coalesce(p_client_nonce, ''));
  v_id uuid;
  v_existing_body text;
  v_recent_count integer;
begin
  if v_user_id is null then raise exception 'authentication required'; end if;
  if char_length(v_body) < 1 or char_length(v_body) > 2000 then raise exception 'message must be between 1 and 2000 characters'; end if;
  if char_length(v_nonce) < 8 or char_length(v_nonce) > 120 then raise exception 'message nonce unavailable'; end if;

  v_conversation_id := public.open_my_friendship_conversation(p_connection_id);

  select m.id, m.body into v_id, v_existing_body
  from private.friendship_messages m
  where m.conversation_id = v_conversation_id
    and m.sender_user_id = v_user_id
    and m.client_nonce = v_nonce;
  if v_id is not null then
    if v_existing_body <> v_body then raise exception 'idempotency conflict'; end if;
    return v_id;
  end if;

  select count(*)::integer into v_recent_count
  from private.friendship_messages m
  where m.conversation_id = v_conversation_id
    and m.sender_user_id = v_user_id
    and m.sent_at >= clock_timestamp() - interval '1 minute';
  if v_recent_count >= 20 then raise exception 'message rate limit reached'; end if;

  insert into private.friendship_messages (conversation_id, sender_user_id, body, client_nonce)
  values (v_conversation_id, v_user_id, v_body, v_nonce)
  returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.mark_my_friendship_conversation_read(
  p_connection_id uuid,
  p_through timestamptz
)
returns boolean
language plpgsql
security definer
set search_path = public, private
as $$
declare
  v_user_id uuid := auth.uid();
  v_conversation_id uuid;
begin
  if v_user_id is null then raise exception 'authentication required'; end if;
  v_conversation_id := private.member_open_friendship_conversation_id(p_connection_id, v_user_id);
  if v_conversation_id is null then raise exception 'friendship conversation unavailable'; end if;

  insert into private.friendship_conversation_read_state (conversation_id, user_id, read_through)
  values (v_conversation_id, v_user_id, p_through)
  on conflict (conversation_id, user_id) do update
    set read_through = greatest(private.friendship_conversation_read_state.read_through, excluded.read_through),
        updated_at = clock_timestamp();
  return true;
end;
$$;

revoke all on function private.member_open_friendship_conversation_id(uuid, uuid) from public, anon, authenticated;
grant execute on function private.member_open_friendship_conversation_id(uuid, uuid) to service_role;

revoke all on function public.open_my_friendship_conversation(uuid) from public, anon;
revoke all on function public.list_my_friendship_messages(uuid, timestamptz, uuid, integer) from public, anon;
revoke all on function public.send_friendship_message(uuid, text, text) from public, anon;
revoke all on function public.mark_my_friendship_conversation_read(uuid, timestamptz) from public, anon;
grant execute on function public.open_my_friendship_conversation(uuid) to authenticated, service_role;
grant execute on function public.list_my_friendship_messages(uuid, timestamptz, uuid, integer) to authenticated, service_role;
grant execute on function public.send_friendship_message(uuid, text, text) to authenticated, service_role;
grant execute on function public.mark_my_friendship_conversation_read(uuid, timestamptz) to authenticated, service_role;
create type public.conversation_status as enum ('open', 'closed');

create table private.introduction_conversations (
  id uuid primary key default gen_random_uuid(),
  introduction_id uuid not null unique references private.controlled_introductions(id) on delete cascade,
  user_a_id uuid not null references public.users(id) on delete cascade,
  user_b_id uuid not null references public.users(id) on delete cascade,
  status public.conversation_status not null default 'open',
  opened_at timestamptz not null default clock_timestamp(),
  closed_at timestamptz,
  check (user_a_id <> user_b_id),
  check ((status = 'open' and closed_at is null) or (status = 'closed' and closed_at is not null))
);

create index introduction_conversations_user_a_idx
  on private.introduction_conversations (user_a_id, opened_at desc);

create index introduction_conversations_user_b_idx
  on private.introduction_conversations (user_b_id, opened_at desc);

create table private.conversation_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references private.introduction_conversations(id) on delete cascade,
  sender_user_id uuid not null references public.users(id) on delete cascade,
  body text not null,
  sent_at timestamptz not null default clock_timestamp(),
  check (char_length(body) between 1 and 2000)
);

create index conversation_messages_time_idx
  on private.conversation_messages (conversation_id, sent_at desc, id desc);

create table private.conversation_events (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references private.introduction_conversations(id) on delete cascade,
  event_type text not null check (event_type in ('opened', 'closed')),
  actor_user_id uuid references public.users(id) on delete set null,
  recorded_at timestamptz not null default clock_timestamp()
);

create index conversation_events_time_idx
  on private.conversation_events (conversation_id, recorded_at, id);

revoke all on table private.introduction_conversations from public, anon, authenticated;
revoke all on table private.conversation_messages from public, anon, authenticated;
revoke all on table private.conversation_events from public, anon, authenticated;

grant select, insert, update, delete on table private.introduction_conversations to service_role;
grant select, insert, update, delete on table private.conversation_messages to service_role;
grant select, insert on table private.conversation_events to service_role;

create or replace function private.member_open_conversation_id(
  p_introduction_id uuid,
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
  if p_introduction_id is null or p_user_id is null then
    return null;
  end if;

  select
    c.id,
    case
      when c.user_a_id = p_user_id then c.user_b_id
      when c.user_b_id = p_user_id then c.user_a_id
      else null
    end
  into v_conversation_id, v_other_user_id
  from private.introduction_conversations c
  join private.controlled_introductions i on i.id = c.introduction_id
  where c.introduction_id = p_introduction_id
    and c.status = 'open'::public.conversation_status
    and i.status = 'mutually_accepted'::public.introduction_status;

  if v_conversation_id is null or v_other_user_id is null then
    return null;
  end if;

  if private.members_are_blocked(p_user_id, v_other_user_id)
     or not private.member_can_participate(p_user_id)
     or not private.member_can_participate(v_other_user_id) then
    return null;
  end if;

  return v_conversation_id;
end;
$$;

create or replace function public.open_my_conversation(
  p_introduction_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public, private
as $$
declare
  v_user_id uuid := auth.uid();
  v_row private.controlled_introductions%rowtype;
  v_conversation_id uuid;
  v_status public.conversation_status;
  v_inserted integer := 0;
begin
  if v_user_id is null then
    raise exception 'authentication required';
  end if;

  select *
  into v_row
  from private.controlled_introductions i
  where i.id = p_introduction_id;

  if not found or (v_row.user_a_id <> v_user_id and v_row.user_b_id <> v_user_id) then
    raise exception 'conversation unavailable';
  end if;

  if v_row.status <> 'mutually_accepted'::public.introduction_status then
    raise exception 'conversation unavailable';
  end if;

  if private.members_are_blocked(v_row.user_a_id, v_row.user_b_id)
     or not private.member_can_participate(v_row.user_a_id)
     or not private.member_can_participate(v_row.user_b_id) then
    raise exception 'conversation unavailable';
  end if;

  insert into private.introduction_conversations (
    introduction_id,
    user_a_id,
    user_b_id
  ) values (
    v_row.id,
    v_row.user_a_id,
    v_row.user_b_id
  )
  on conflict (introduction_id) do nothing;

  get diagnostics v_inserted = row_count;

  select c.id, c.status
  into v_conversation_id, v_status
  from private.introduction_conversations c
  where c.introduction_id = v_row.id;

  if v_conversation_id is null or v_status <> 'open'::public.conversation_status then
    raise exception 'conversation unavailable';
  end if;

  if v_inserted = 1 then
    insert into private.conversation_events (
      conversation_id,
      event_type,
      actor_user_id
    ) values (
      v_conversation_id,
      'opened',
      v_user_id
    );
  end if;

  return v_conversation_id;
end;
$$;

create or replace function public.list_my_conversation_messages(
  p_introduction_id uuid,
  p_before timestamptz default null,
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
      and (p_before is null or m.sent_at < p_before)
    order by m.sent_at desc, m.id desc
    limit p_limit
  ) q
  order by q.sent_at asc, q.message_id asc;
end;
$$;

create or replace function public.send_conversation_message(
  p_introduction_id uuid,
  p_body text
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
  v_message_id uuid;
  v_recent_count integer;
begin
  if v_user_id is null then
    raise exception 'authentication required';
  end if;

  if char_length(v_body) < 1 or char_length(v_body) > 2000 then
    raise exception 'message must be between 1 and 2000 characters';
  end if;

  v_conversation_id := public.open_my_conversation(p_introduction_id);

  select count(*)::integer
  into v_recent_count
  from private.conversation_messages m
  where m.conversation_id = v_conversation_id
    and m.sender_user_id = v_user_id
    and m.sent_at >= clock_timestamp() - interval '1 minute';

  if v_recent_count >= 20 then
    raise exception 'message rate limit reached';
  end if;

  insert into private.conversation_messages (
    conversation_id,
    sender_user_id,
    body
  ) values (
    v_conversation_id,
    v_user_id,
    v_body
  )
  returning id into v_message_id;

  return v_message_id;
end;
$$;

create or replace function public.end_my_conversation(
  p_introduction_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = public, private
as $$
declare
  v_user_id uuid := auth.uid();
  v_row private.controlled_introductions%rowtype;
  v_conversation_id uuid;
begin
  if v_user_id is null then
    raise exception 'authentication required';
  end if;

  select *
  into v_row
  from private.controlled_introductions i
  where i.id = p_introduction_id
  for update;

  if not found or (v_row.user_a_id <> v_user_id and v_row.user_b_id <> v_user_id) then
    raise exception 'conversation unavailable';
  end if;

  if v_row.status = 'closed'::public.introduction_status then
    return false;
  end if;

  if v_row.status <> 'mutually_accepted'::public.introduction_status then
    raise exception 'conversation unavailable';
  end if;

  select c.id
  into v_conversation_id
  from private.introduction_conversations c
  where c.introduction_id = p_introduction_id;

  if v_conversation_id is not null then
    update private.introduction_conversations
    set status = 'closed'::public.conversation_status,
        closed_at = clock_timestamp()
    where id = v_conversation_id
      and status = 'open'::public.conversation_status;

    if found then
      insert into private.conversation_events (
        conversation_id,
        event_type,
        actor_user_id
      ) values (
        v_conversation_id,
        'closed',
        v_user_id
      );
    end if;
  end if;

  update private.controlled_introductions
  set status = 'closed'::public.introduction_status,
      closed_at = clock_timestamp()
  where id = p_introduction_id;

  insert into private.controlled_introduction_events (
    introduction_id,
    event_type,
    actor_user_id,
    actor_reference
  ) values (
    p_introduction_id,
    'closed',
    v_user_id,
    'member-conversation-end'
  );

  return true;
end;
$$;

revoke all on function private.member_open_conversation_id(uuid, uuid) from public, anon, authenticated;
grant execute on function private.member_open_conversation_id(uuid, uuid) to service_role;

revoke all on function public.open_my_conversation(uuid) from public, anon, authenticated;
grant execute on function public.open_my_conversation(uuid) to authenticated, service_role;

revoke all on function public.list_my_conversation_messages(uuid, timestamptz, integer) from public, anon, authenticated;
grant execute on function public.list_my_conversation_messages(uuid, timestamptz, integer) to authenticated, service_role;

revoke all on function public.send_conversation_message(uuid, text) from public, anon, authenticated;
grant execute on function public.send_conversation_message(uuid, text) to authenticated, service_role;

revoke all on function public.end_my_conversation(uuid) from public, anon, authenticated;
grant execute on function public.end_my_conversation(uuid) to authenticated, service_role;

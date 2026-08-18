create or replace function public.send_conversation_message_idempotent(
  p_introduction_id uuid,
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
  v_message_id uuid;
  v_existing_body text;
  v_recent_count integer;
begin
  if v_user_id is null then
    raise exception 'authentication required';
  end if;

  if char_length(v_body) < 1 or char_length(v_body) > 2000 then
    raise exception 'message must be between 1 and 2000 characters';
  end if;

  if char_length(v_nonce) < 16
     or char_length(v_nonce) > 100
     or v_nonce !~ '^[A-Za-z0-9:_-]+$' then
    raise exception 'invalid message nonce';
  end if;

  v_conversation_id := public.open_my_conversation(p_introduction_id);

  -- Serialize sends from one member inside one conversation. Without this,
  -- concurrent requests can all observe the same pre-insert count and exceed
  -- the per-minute cap before any of them commits.
  perform pg_advisory_xact_lock(
    hashtextextended(v_conversation_id::text || ':' || v_user_id::text, 0)
  );

  select m.id, m.body
  into v_message_id, v_existing_body
  from private.conversation_messages m
  where m.conversation_id = v_conversation_id
    and m.sender_user_id = v_user_id
    and m.client_nonce = v_nonce;

  if v_message_id is not null then
    if v_existing_body <> v_body then
      raise exception 'message idempotency conflict';
    end if;
    return v_message_id;
  end if;

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
    body,
    client_nonce
  ) values (
    v_conversation_id,
    v_user_id,
    v_body,
    v_nonce
  )
  returning id into v_message_id;

  return v_message_id;
end;
$$;

revoke all on function public.send_conversation_message_idempotent(uuid, text, text)
from public, anon, authenticated;
grant execute on function public.send_conversation_message_idempotent(uuid, text, text)
to authenticated, service_role;

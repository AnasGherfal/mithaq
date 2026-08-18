create or replace function public.purge_closed_conversation_messages(
  p_closed_before timestamptz,
  p_limit integer default 500
)
returns integer
language plpgsql
security definer
set search_path = public, private
as $$
declare
  v_conversation_ids uuid[] := '{}'::uuid[];
  v_conversations_selected integer := 0;
  v_messages_deleted integer := 0;
begin
  if p_closed_before is null or p_closed_before >= clock_timestamp() then
    raise exception 'retention cutoff must be in the past';
  end if;

  if p_limit is null or p_limit < 1 or p_limit > 5000 then
    raise exception 'retention limit must be between 1 and 5000';
  end if;

  select
    coalesce(array_agg(eligible.id), '{}'::uuid[]),
    count(*)::integer
  into v_conversation_ids, v_conversations_selected
  from (
    select c.id
    from private.introduction_conversations c
    where c.status = 'closed'::public.conversation_status
      and c.closed_at is not null
      and c.closed_at <= p_closed_before
      and not exists (
        select 1
        from public.safety_reports r
        where r.status not in (
          'dismissed'::public.safety_report_status,
          'closed'::public.safety_report_status
        )
          and (
            (r.reporter_user_id = c.user_a_id and r.target_user_id = c.user_b_id)
            or
            (r.reporter_user_id = c.user_b_id and r.target_user_id = c.user_a_id)
          )
      )
      and not exists (
        select 1
        from private.member_notifications n
        join private.conversation_messages unread_message
          on unread_message.id = n.message_id
        where unread_message.conversation_id = c.id
          and n.kind = 'message_received'
          and n.read_at is null
      )
    order by c.closed_at, c.id
    limit p_limit
    for update skip locked
  ) eligible;

  if v_conversations_selected > 0 then
    delete from private.conversation_messages m
    where m.conversation_id = any(v_conversation_ids);

    get diagnostics v_messages_deleted = row_count;
  end if;

  insert into private.conversation_retention_runs (
    closed_before,
    conversation_limit,
    conversations_selected,
    messages_deleted
  ) values (
    p_closed_before,
    p_limit,
    v_conversations_selected,
    v_messages_deleted
  );

  return v_messages_deleted;
end;
$$;

revoke all on function public.purge_closed_conversation_messages(timestamptz, integer)
from public, anon, authenticated;
grant execute on function public.purge_closed_conversation_messages(timestamptz, integer)
to service_role;

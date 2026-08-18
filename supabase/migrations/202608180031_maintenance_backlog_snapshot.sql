create or replace function public.get_maintenance_backlog(
  p_conversation_closed_before timestamptz,
  p_notification_read_before timestamptz
)
returns table (
  worker_name text,
  eligible_count bigint,
  last_run_at timestamptz
)
language plpgsql
security definer
set search_path = public, private
as $$
begin
  if p_conversation_closed_before is null
     or p_conversation_closed_before >= clock_timestamp() then
    raise exception 'conversation retention cutoff must be in the past';
  end if;

  if p_notification_read_before is null
     or p_notification_read_before >= clock_timestamp() then
    raise exception 'notification retention cutoff must be in the past';
  end if;

  return query
  select
    'account_deletion'::text,
    count(*)::bigint,
    (
      select max(coalesce(t.completed_at, t.processing_started_at))
      from private.account_deletion_tombstones t
    )
  from public.deletion_requests dr
  join public.users u on u.id = dr.user_id
  where dr.request_scope = 'entire_account'
    and u.account_status = 'deletion_pending'
    and (
      (
        dr.status in ('requested', 'identity_confirmed')
        and coalesce(dr.due_at, dr.requested_at) <= clock_timestamp()
      )
      or (
        dr.status = 'in_progress'
        and dr.processing_started_at < clock_timestamp() - interval '20 minutes'
      )
    );

  return query
  select
    'introduction_expiry'::text,
    count(*)::bigint,
    (
      select max(e.recorded_at)
      from private.controlled_introduction_events e
      where e.event_type = 'expired'
        and e.actor_reference in ('expiry-worker', 'create-introduction', 'member-response')
    )
  from private.controlled_introductions i
  where i.status = 'offered'::public.introduction_status
    and i.expires_at <= clock_timestamp();

  return query
  select
    'conversation_retention'::text,
    count(*)::bigint,
    (
      select max(r.recorded_at)
      from private.conversation_retention_runs r
    )
  from private.introduction_conversations c
  where c.status = 'closed'::public.conversation_status
    and c.closed_at is not null
    and c.closed_at <= p_conversation_closed_before
    and exists (
      select 1
      from private.conversation_messages m
      where m.conversation_id = c.id
    )
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
      join private.conversation_messages m on m.id = n.message_id
      where m.conversation_id = c.id
        and n.read_at is null
    );

  return query
  select
    'notification_retention'::text,
    count(*)::bigint,
    (
      select max(r.recorded_at)
      from private.notification_retention_runs r
    )
  from private.member_notifications n
  where n.read_at is not null
    and n.read_at <= p_notification_read_before;
end;
$$;

revoke all on function public.get_maintenance_backlog(timestamptz, timestamptz)
from public, anon, authenticated;
grant execute on function public.get_maintenance_backlog(timestamptz, timestamptz)
to service_role;

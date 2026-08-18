create table private.account_deletion_worker_runs (
  id uuid primary key default gen_random_uuid(),
  run_status text not null check (run_status in ('succeeded', 'partial', 'failed')),
  reconciled integer not null check (reconciled >= 0),
  claimed integer not null check (claimed >= 0),
  completed integer not null check (completed >= 0),
  failed integer not null check (failed >= 0),
  error_code text check (error_code is null or char_length(error_code) <= 120),
  recorded_at timestamptz not null default clock_timestamp(),
  check (completed + failed <= claimed),
  check ((run_status = 'succeeded' and error_code is null) or run_status <> 'succeeded')
);

revoke all on table private.account_deletion_worker_runs from public, anon, authenticated;
grant select, insert on table private.account_deletion_worker_runs to service_role;

create index account_deletion_worker_runs_time_idx
  on private.account_deletion_worker_runs (recorded_at desc, id desc);

create or replace function public.record_account_deletion_worker_run(
  p_run_status text,
  p_reconciled integer,
  p_claimed integer,
  p_completed integer,
  p_failed integer,
  p_error_code text default null
)
returns uuid
language plpgsql
security definer
set search_path = public, private
as $$
declare
  v_id uuid;
  v_error_code text := nullif(btrim(p_error_code), '');
begin
  if p_run_status not in ('succeeded', 'partial', 'failed') then
    raise exception 'invalid worker run status';
  end if;

  if p_reconciled is null or p_reconciled < 0
     or p_claimed is null or p_claimed < 0
     or p_completed is null or p_completed < 0
     or p_failed is null or p_failed < 0
     or p_completed + p_failed > p_claimed then
    raise exception 'invalid worker run counts';
  end if;

  if v_error_code is not null and char_length(v_error_code) > 120 then
    raise exception 'worker error code too long';
  end if;

  if p_run_status = 'succeeded' and v_error_code is not null then
    raise exception 'successful worker run cannot have an error code';
  end if;

  insert into private.account_deletion_worker_runs (
    run_status,
    reconciled,
    claimed,
    completed,
    failed,
    error_code
  ) values (
    p_run_status,
    p_reconciled,
    p_claimed,
    p_completed,
    p_failed,
    v_error_code
  )
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.record_account_deletion_worker_run(text, integer, integer, integer, integer, text)
from public, anon, authenticated;
grant execute on function public.record_account_deletion_worker_run(text, integer, integer, integer, integer, text)
to service_role;

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
      select max(r.recorded_at)
      from private.account_deletion_worker_runs r
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
      select max(r.recorded_at)
      from private.introduction_expiry_runs r
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

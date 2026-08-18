create table private.safety_report_events (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.safety_reports(id) on delete cascade,
  from_status public.safety_report_status not null,
  to_status public.safety_report_status not null,
  note_code text check (note_code is null or char_length(note_code) <= 80),
  actor_reference text not null check (char_length(actor_reference) between 1 and 120),
  recorded_at timestamptz not null default now(),
  check (from_status <> to_status)
);

create index safety_report_events_report_time_idx
  on private.safety_report_events (report_id, recorded_at);

revoke all on table private.safety_report_events from public, anon, authenticated;
grant select, insert on table private.safety_report_events to service_role;

create or replace function public.transition_safety_report(
  p_report_id uuid,
  p_to_status public.safety_report_status,
  p_note_code text default null,
  p_actor_reference text default 'system'
)
returns boolean
language plpgsql
security definer
set search_path = public, private
as $$
declare
  v_from_status public.safety_report_status;
  v_note_code text := nullif(btrim(p_note_code), '');
  v_actor_reference text := nullif(btrim(p_actor_reference), '');
  v_allowed boolean := false;
begin
  if p_report_id is null or p_to_status is null then
    raise exception 'invalid moderation transition';
  end if;

  if v_note_code is not null and char_length(v_note_code) > 80 then
    raise exception 'moderation note code too long';
  end if;

  if v_actor_reference is null or char_length(v_actor_reference) > 120 then
    raise exception 'invalid moderation actor';
  end if;

  select r.status into v_from_status
  from public.safety_reports r
  where r.id = p_report_id
  for update;

  if v_from_status is null then
    return false;
  end if;

  if v_from_status = p_to_status then
    return false;
  end if;

  v_allowed := case v_from_status
    when 'submitted' then p_to_status in ('triaged', 'dismissed', 'closed')
    when 'triaged' then p_to_status in ('investigating', 'actioned', 'dismissed', 'closed')
    when 'investigating' then p_to_status in ('actioned', 'dismissed', 'closed')
    when 'actioned' then p_to_status = 'closed'
    when 'dismissed' then p_to_status = 'closed'
    when 'closed' then false
    else false
  end;

  if not v_allowed then
    raise exception 'invalid moderation transition';
  end if;

  update public.safety_reports
  set status = p_to_status,
      status_updated_at = now()
  where id = p_report_id;

  insert into private.safety_report_events (
    report_id,
    from_status,
    to_status,
    note_code,
    actor_reference
  ) values (
    p_report_id,
    v_from_status,
    p_to_status,
    v_note_code,
    v_actor_reference
  );

  return true;
end;
$$;

revoke all on function public.transition_safety_report(uuid, public.safety_report_status, text, text)
from public, anon, authenticated;
grant execute on function public.transition_safety_report(uuid, public.safety_report_status, text, text)
to service_role;

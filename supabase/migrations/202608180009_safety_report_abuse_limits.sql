create index safety_reports_reporter_time_idx
  on public.safety_reports (reporter_user_id, reported_at desc);

create or replace function public.submit_safety_report(
  p_target_user_id uuid,
  p_category public.safety_report_category,
  p_details text default null,
  p_block_target boolean default true
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_details text := nullif(btrim(p_details), '');
  v_report_id uuid;
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

  if p_target_user_id is null or p_target_user_id = v_user_id then
    raise exception 'invalid report target';
  end if;

  if not exists (
    select 1
    from public.users u
    where u.id = p_target_user_id
      and u.account_status <> 'deleted'
  ) then
    raise exception 'member unavailable';
  end if;

  if p_category is null then
    raise exception 'report category required';
  end if;

  if v_details is not null and char_length(v_details) > 1200 then
    raise exception 'report details too long';
  end if;

  if exists (
    select 1
    from public.safety_reports r
    where r.reporter_user_id = v_user_id
      and r.target_user_id = p_target_user_id
      and r.category = p_category
      and r.reported_at > now() - interval '15 minutes'
  ) then
    raise exception 'report recently submitted';
  end if;

  if (
    select count(*)
    from public.safety_reports r
    where r.reporter_user_id = v_user_id
      and r.reported_at > now() - interval '24 hours'
  ) >= 10 then
    raise exception 'report rate limit reached';
  end if;

  insert into public.safety_reports (
    reporter_user_id,
    target_user_id,
    category,
    details
  ) values (
    v_user_id,
    p_target_user_id,
    p_category,
    v_details
  )
  returning id into v_report_id;

  if coalesce(p_block_target, true) then
    insert into public.member_blocks (blocker_user_id, blocked_user_id)
    values (v_user_id, p_target_user_id)
    on conflict (blocker_user_id, blocked_user_id) do nothing;
  end if;

  return v_report_id;
end;
$$;

revoke all on function public.submit_safety_report(uuid, public.safety_report_category, text, boolean) from public, anon;
grant execute on function public.submit_safety_report(uuid, public.safety_report_category, text, boolean) to authenticated, service_role;

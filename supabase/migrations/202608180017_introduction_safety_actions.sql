create or replace function private.introduction_counterpart(
  p_introduction_id uuid,
  p_user_id uuid
)
returns uuid
language sql
stable
security definer
set search_path = public, private
as $$
  select case
    when i.user_a_id = p_user_id then i.user_b_id
    when i.user_b_id = p_user_id then i.user_a_id
    else null
  end
  from private.controlled_introductions i
  where i.id = p_introduction_id;
$$;

create or replace function public.block_introduction_member(
  p_introduction_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = public, private
as $$
declare
  v_user_id uuid := auth.uid();
  v_target_user_id uuid;
begin
  if v_user_id is null then
    raise exception 'authentication required';
  end if;

  if not exists (
    select 1 from public.users u
    where u.id = v_user_id and u.account_status = 'active'
  ) then
    raise exception 'account unavailable';
  end if;

  v_target_user_id := private.introduction_counterpart(p_introduction_id, v_user_id);
  if v_target_user_id is null then
    raise exception 'introduction unavailable';
  end if;

  insert into public.member_blocks (blocker_user_id, blocked_user_id)
  values (v_user_id, v_target_user_id)
  on conflict (blocker_user_id, blocked_user_id) do nothing;

  return true;
end;
$$;

create or replace function public.submit_introduction_safety_report(
  p_introduction_id uuid,
  p_category public.safety_report_category,
  p_details text default null,
  p_block_target boolean default true
)
returns uuid
language plpgsql
security definer
set search_path = public, private
as $$
declare
  v_user_id uuid := auth.uid();
  v_target_user_id uuid;
  v_details text := nullif(btrim(p_details), '');
  v_report_id uuid;
begin
  if v_user_id is null then
    raise exception 'authentication required';
  end if;

  if not exists (
    select 1 from public.users u
    where u.id = v_user_id and u.account_status = 'active'
  ) then
    raise exception 'account unavailable';
  end if;

  v_target_user_id := private.introduction_counterpart(p_introduction_id, v_user_id);
  if v_target_user_id is null then
    raise exception 'introduction unavailable';
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
      and r.target_user_id = v_target_user_id
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
    v_target_user_id,
    p_category,
    v_details
  )
  returning id into v_report_id;

  if coalesce(p_block_target, true) then
    insert into public.member_blocks (blocker_user_id, blocked_user_id)
    values (v_user_id, v_target_user_id)
    on conflict (blocker_user_id, blocked_user_id) do nothing;
  end if;

  return v_report_id;
end;
$$;

revoke all on function private.introduction_counterpart(uuid, uuid) from public, anon, authenticated;
grant execute on function private.introduction_counterpart(uuid, uuid) to service_role;

revoke all on function public.block_introduction_member(uuid) from public, anon;
grant execute on function public.block_introduction_member(uuid) to authenticated, service_role;

revoke all on function public.submit_introduction_safety_report(uuid, public.safety_report_category, text, boolean)
from public, anon;
grant execute on function public.submit_introduction_safety_report(uuid, public.safety_report_category, text, boolean)
to authenticated, service_role;

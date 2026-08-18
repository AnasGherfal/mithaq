create type public.safety_report_category as enum (
  'fake_identity',
  'harassment',
  'inappropriate_content',
  'fraud_or_money',
  'safety_concern',
  'other'
);

create type public.safety_report_status as enum (
  'submitted',
  'triaged',
  'investigating',
  'actioned',
  'dismissed',
  'closed'
);

create table public.member_blocks (
  blocker_user_id uuid not null references public.users(id) on delete cascade,
  blocked_user_id uuid not null references public.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_user_id, blocked_user_id),
  check (blocker_user_id <> blocked_user_id)
);

create table public.safety_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_user_id uuid not null references public.users(id) on delete cascade,
  target_user_id uuid not null references public.users(id) on delete cascade,
  category public.safety_report_category not null,
  details text check (details is null or char_length(details) <= 1200),
  status public.safety_report_status not null default 'submitted',
  reported_at timestamptz not null default now(),
  status_updated_at timestamptz not null default now(),
  check (reporter_user_id <> target_user_id)
);

create index member_blocks_blocked_idx
  on public.member_blocks (blocked_user_id, blocker_user_id);

create index safety_reports_status_time_idx
  on public.safety_reports (status, reported_at);

create index safety_reports_target_time_idx
  on public.safety_reports (target_user_id, reported_at);

alter table public.member_blocks enable row level security;
alter table public.safety_reports enable row level security;

create policy "members read own blocks"
on public.member_blocks
for select
to authenticated
using (blocker_user_id = auth.uid());

create policy "members read own safety reports"
on public.safety_reports
for select
to authenticated
using (reporter_user_id = auth.uid());

revoke all on table public.member_blocks from public, anon;
revoke all on table public.safety_reports from public, anon;
revoke insert, update, delete on table public.member_blocks from authenticated;
revoke insert, update, delete on table public.safety_reports from authenticated;
grant select on table public.member_blocks to authenticated;
grant select on table public.safety_reports to authenticated;
grant select, insert, update, delete on table public.member_blocks to service_role;
grant select, insert, update, delete on table public.safety_reports to service_role;

create or replace function public.block_member(
  p_target_user_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_row_count integer := 0;
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
    raise exception 'invalid block target';
  end if;

  if not exists (
    select 1
    from public.users u
    where u.id = p_target_user_id
      and u.account_status <> 'deleted'
  ) then
    raise exception 'member unavailable';
  end if;

  insert into public.member_blocks (blocker_user_id, blocked_user_id)
  values (v_user_id, p_target_user_id)
  on conflict (blocker_user_id, blocked_user_id) do nothing;

  get diagnostics v_row_count = row_count;
  return v_row_count > 0;
end;
$$;

create or replace function public.unblock_member(
  p_target_user_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_row_count integer := 0;
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
    raise exception 'invalid block target';
  end if;

  delete from public.member_blocks b
  where b.blocker_user_id = v_user_id
    and b.blocked_user_id = p_target_user_id;

  get diagnostics v_row_count = row_count;
  return v_row_count > 0;
end;
$$;

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

revoke all on function public.block_member(uuid) from public, anon;
revoke all on function public.unblock_member(uuid) from public, anon;
revoke all on function public.submit_safety_report(uuid, public.safety_report_category, text, boolean) from public, anon;

grant execute on function public.block_member(uuid) to authenticated, service_role;
grant execute on function public.unblock_member(uuid) to authenticated, service_role;
grant execute on function public.submit_safety_report(uuid, public.safety_report_category, text, boolean) to authenticated, service_role;

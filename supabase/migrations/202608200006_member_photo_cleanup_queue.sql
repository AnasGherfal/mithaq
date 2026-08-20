create type private.member_photo_cleanup_state as enum (
  'pending',
  'processing',
  'completed',
  'failed'
);

create table private.member_photo_cleanup_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete set null,
  storage_path text not null,
  reason text not null check (reason in ('delete', 'replace', 'registration_failure')),
  state private.member_photo_cleanup_state not null default 'pending',
  attempt_count integer not null default 0 check (attempt_count >= 0),
  available_at timestamptz not null default clock_timestamp(),
  processing_started_at timestamptz,
  completed_at timestamptz,
  last_error_code text check (last_error_code is null or char_length(last_error_code) <= 120),
  created_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default clock_timestamp(),
  unique (storage_path)
);

create index member_photo_cleanup_jobs_due_idx
  on private.member_photo_cleanup_jobs (state, available_at, created_at)
  where state in ('pending', 'failed');

revoke all on table private.member_photo_cleanup_jobs
  from public, anon, authenticated;
grant select, insert, update, delete on table private.member_photo_cleanup_jobs
  to service_role;

create or replace function public.queue_my_member_photo_cleanup(
  p_storage_path text,
  p_reason text
)
returns boolean
language plpgsql
security definer
set search_path = public, private
as $$
declare
  v_user_id uuid := auth.uid();
  v_storage_path text := nullif(btrim(p_storage_path), '');
  v_reason text := nullif(btrim(p_reason), '');
begin
  if v_user_id is null then
    raise exception 'authentication required';
  end if;

  if v_storage_path is null
     or char_length(v_storage_path) > 320
     or v_storage_path not like v_user_id::text || '/%' then
    raise exception 'invalid member photo cleanup path';
  end if;

  if v_reason not in ('delete', 'replace', 'registration_failure') then
    raise exception 'invalid member photo cleanup reason';
  end if;

  insert into private.member_photo_cleanup_jobs (
    user_id,
    storage_path,
    reason,
    state,
    attempt_count,
    available_at,
    processing_started_at,
    completed_at,
    last_error_code,
    updated_at
  ) values (
    v_user_id,
    v_storage_path,
    v_reason,
    'pending'::private.member_photo_cleanup_state,
    0,
    clock_timestamp(),
    null,
    null,
    null,
    clock_timestamp()
  )
  on conflict (storage_path) do update
  set user_id = excluded.user_id,
      reason = excluded.reason,
      state = 'pending'::private.member_photo_cleanup_state,
      available_at = clock_timestamp(),
      processing_started_at = null,
      completed_at = null,
      last_error_code = null,
      updated_at = clock_timestamp();

  return true;
end;
$$;

create or replace function public.claim_member_photo_cleanup_jobs(
  p_limit integer default 25
)
returns table (
  job_id uuid,
  storage_path text
)
language plpgsql
security definer
set search_path = public, private
as $$
begin
  if p_limit < 1 or p_limit > 100 then
    raise exception 'invalid limit';
  end if;

  return query
  with candidates as (
    select j.id
    from private.member_photo_cleanup_jobs j
    where (
      j.state in (
        'pending'::private.member_photo_cleanup_state,
        'failed'::private.member_photo_cleanup_state
      )
      and j.available_at <= clock_timestamp()
    ) or (
      j.state = 'processing'::private.member_photo_cleanup_state
      and j.processing_started_at < clock_timestamp() - interval '20 minutes'
    )
    order by j.available_at, j.created_at, j.id
    for update skip locked
    limit p_limit
  ), claimed as (
    update private.member_photo_cleanup_jobs j
    set state = 'processing'::private.member_photo_cleanup_state,
        processing_started_at = clock_timestamp(),
        attempt_count = j.attempt_count + 1,
        last_error_code = null,
        updated_at = clock_timestamp()
    from candidates c
    where j.id = c.id
    returning j.id, j.storage_path
  )
  select c.id, c.storage_path
  from claimed c;
end;
$$;

create or replace function public.complete_member_photo_cleanup_job(
  p_job_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = public, private
as $$
begin
  update private.member_photo_cleanup_jobs
  set state = 'completed'::private.member_photo_cleanup_state,
      completed_at = clock_timestamp(),
      processing_started_at = null,
      last_error_code = null,
      updated_at = clock_timestamp()
  where id = p_job_id
    and state = 'processing'::private.member_photo_cleanup_state;

  return found;
end;
$$;

create or replace function public.fail_member_photo_cleanup_job(
  p_job_id uuid,
  p_error_code text
)
returns boolean
language plpgsql
security definer
set search_path = public, private
as $$
declare
  v_error_code text := left(coalesce(nullif(btrim(p_error_code), ''), 'cleanup_failed'), 120);
begin
  update private.member_photo_cleanup_jobs
  set state = 'failed'::private.member_photo_cleanup_state,
      available_at = clock_timestamp() + least(
        interval '24 hours',
        interval '5 minutes' * greatest(1, attempt_count)
      ),
      processing_started_at = null,
      last_error_code = v_error_code,
      updated_at = clock_timestamp()
  where id = p_job_id
    and state = 'processing'::private.member_photo_cleanup_state;

  return found;
end;
$$;

revoke all on function public.queue_my_member_photo_cleanup(text, text)
  from public, anon;
grant execute on function public.queue_my_member_photo_cleanup(text, text)
  to authenticated, service_role;

revoke all on function public.claim_member_photo_cleanup_jobs(integer)
  from public, anon, authenticated;
revoke all on function public.complete_member_photo_cleanup_job(uuid)
  from public, anon, authenticated;
revoke all on function public.fail_member_photo_cleanup_job(uuid, text)
  from public, anon, authenticated;

grant execute on function public.claim_member_photo_cleanup_jobs(integer)
  to service_role;
grant execute on function public.complete_member_photo_cleanup_job(uuid)
  to service_role;
grant execute on function public.fail_member_photo_cleanup_job(uuid, text)
  to service_role;

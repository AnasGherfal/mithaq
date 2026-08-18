alter table public.deletion_requests
  add column if not exists processing_started_at timestamptz,
  add column if not exists attempt_count integer not null default 0 check (attempt_count >= 0),
  add column if not exists last_error_code text check (last_error_code is null or char_length(last_error_code) <= 120);

create table if not exists private.account_deletion_tombstones (
  request_id uuid primary key,
  user_id uuid,
  requested_at timestamptz not null,
  processing_started_at timestamptz not null,
  completed_at timestamptz,
  state text not null check (state in ('processing', 'completed', 'failed')),
  attempt_count integer not null default 1 check (attempt_count > 0),
  last_error_code text check (last_error_code is null or char_length(last_error_code) <= 120)
);

revoke all on table private.account_deletion_tombstones from public, anon, authenticated;

create or replace function public.claim_due_account_deletions(
  p_limit integer default 25
)
returns table (
  request_id uuid,
  user_id uuid
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
    select dr.id, dr.user_id, dr.requested_at
    from public.deletion_requests dr
    join public.users u on u.id = dr.user_id
    where dr.request_scope = 'entire_account'
      and u.account_status = 'deletion_pending'
      and (
        (
          dr.status in ('requested', 'identity_confirmed')
          and coalesce(dr.due_at, dr.requested_at) <= now()
        )
        or (
          dr.status = 'in_progress'
          and dr.processing_started_at < now() - interval '20 minutes'
        )
      )
    order by coalesce(dr.due_at, dr.requested_at), dr.requested_at, dr.id
    for update of dr skip locked
    limit p_limit
  ), claimed as (
    update public.deletion_requests dr
    set status = 'in_progress',
        confirmed_at = coalesce(dr.confirmed_at, now()),
        processing_started_at = now(),
        attempt_count = dr.attempt_count + 1,
        last_error_code = null
    from candidates c
    where dr.id = c.id
    returning dr.id, dr.user_id, dr.requested_at, dr.processing_started_at, dr.attempt_count
  ), tombstones as (
    insert into private.account_deletion_tombstones (
      request_id,
      user_id,
      requested_at,
      processing_started_at,
      state,
      attempt_count,
      last_error_code
    )
    select
      c.id,
      c.user_id,
      c.requested_at,
      c.processing_started_at,
      'processing',
      c.attempt_count,
      null
    from claimed c
    on conflict (request_id) do update
    set user_id = excluded.user_id,
        processing_started_at = excluded.processing_started_at,
        state = 'processing',
        attempt_count = excluded.attempt_count,
        last_error_code = null
    returning request_id
  )
  select c.id, c.user_id
  from claimed c
  join tombstones t on t.request_id = c.id;
end;
$$;

create or replace function public.mark_account_deletion_failed(
  p_request_id uuid,
  p_error_code text
)
returns void
language plpgsql
security definer
set search_path = public, private
as $$
declare
  v_error_code text := left(coalesce(nullif(trim(p_error_code), ''), 'unknown_error'), 120);
begin
  update public.deletion_requests
  set status = 'requested',
      processing_started_at = null,
      due_at = greatest(coalesce(due_at, now()), now() + interval '1 hour'),
      last_error_code = v_error_code
  where id = p_request_id
    and request_scope = 'entire_account'
    and status = 'in_progress';

  update private.account_deletion_tombstones
  set state = 'failed',
      last_error_code = v_error_code
  where request_id = p_request_id;
end;
$$;

create or replace function public.mark_account_deletion_completed(
  p_request_id uuid
)
returns void
language plpgsql
security definer
set search_path = public, private
as $$
begin
  update private.account_deletion_tombstones
  set user_id = null,
      state = 'completed',
      completed_at = now(),
      last_error_code = null
  where request_id = p_request_id;
end;
$$;

revoke all on function public.claim_due_account_deletions(integer) from public, anon, authenticated;
revoke all on function public.mark_account_deletion_failed(uuid, text) from public, anon, authenticated;
revoke all on function public.mark_account_deletion_completed(uuid) from public, anon, authenticated;

grant execute on function public.claim_due_account_deletions(integer) to service_role;
grant execute on function public.mark_account_deletion_failed(uuid, text) to service_role;
grant execute on function public.mark_account_deletion_completed(uuid) to service_role;

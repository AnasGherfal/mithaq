create type public.member_safety_state as enum (
  'clear',
  'restricted',
  'suspended'
);

create table public.member_safety_states (
  user_id uuid primary key references public.users(id) on delete cascade,
  state public.member_safety_state not null default 'clear',
  reason_code text check (reason_code is null or char_length(reason_code) <= 80),
  review_after timestamptz,
  updated_at timestamptz not null default now()
);

alter table public.member_safety_states enable row level security;

create policy "members read own safety state"
on public.member_safety_states
for select
to authenticated
using (user_id = auth.uid());

revoke all on table public.member_safety_states from public, anon;
revoke insert, update, delete on table public.member_safety_states from authenticated;
grant select on table public.member_safety_states to authenticated;
grant select, insert, update, delete on table public.member_safety_states to service_role;

create table private.member_safety_state_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  from_state public.member_safety_state not null,
  to_state public.member_safety_state not null,
  reason_code text check (reason_code is null or char_length(reason_code) <= 80),
  actor_reference text not null check (char_length(actor_reference) between 1 and 120),
  review_after timestamptz,
  recorded_at timestamptz not null default now(),
  check (from_state <> to_state)
);

create index member_safety_state_events_user_time_idx
  on private.member_safety_state_events (user_id, recorded_at);

revoke all on table private.member_safety_state_events from public, anon, authenticated;
grant select, insert on table private.member_safety_state_events to service_role;

create or replace function public.set_member_safety_state(
  p_user_id uuid,
  p_state public.member_safety_state,
  p_reason_code text default null,
  p_actor_reference text default 'system',
  p_review_after timestamptz default null
)
returns boolean
language plpgsql
security definer
set search_path = public, private
as $$
declare
  v_from_state public.member_safety_state := 'clear';
  v_reason_code text := nullif(btrim(p_reason_code), '');
  v_actor_reference text := nullif(btrim(p_actor_reference), '');
begin
  if p_user_id is null or p_state is null then
    raise exception 'invalid safety state transition';
  end if;

  if v_reason_code is not null and char_length(v_reason_code) > 80 then
    raise exception 'safety reason code too long';
  end if;

  if v_actor_reference is null or char_length(v_actor_reference) > 120 then
    raise exception 'invalid safety actor';
  end if;

  if not exists (
    select 1
    from public.users u
    where u.id = p_user_id
      and u.account_status <> 'deleted'
  ) then
    raise exception 'member unavailable';
  end if;

  select s.state into v_from_state
  from public.member_safety_states s
  where s.user_id = p_user_id
  for update;

  v_from_state := coalesce(v_from_state, 'clear'::public.member_safety_state);

  if v_from_state = p_state then
    return false;
  end if;

  if p_state = 'clear' then
    v_reason_code := null;
    p_review_after := null;
  end if;

  insert into public.member_safety_states (
    user_id,
    state,
    reason_code,
    review_after,
    updated_at
  ) values (
    p_user_id,
    p_state,
    v_reason_code,
    p_review_after,
    now()
  )
  on conflict (user_id) do update
  set state = excluded.state,
      reason_code = excluded.reason_code,
      review_after = excluded.review_after,
      updated_at = excluded.updated_at;

  insert into private.member_safety_state_events (
    user_id,
    from_state,
    to_state,
    reason_code,
    actor_reference,
    review_after
  ) values (
    p_user_id,
    v_from_state,
    p_state,
    v_reason_code,
    v_actor_reference,
    p_review_after
  );

  return true;
end;
$$;

create or replace function private.member_can_participate(
  p_user_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public, private
as $$
  select exists (
    select 1
    from public.users u
    where u.id = p_user_id
      and u.account_status = 'active'
      and coalesce(
        (
          select s.state
          from public.member_safety_states s
          where s.user_id = p_user_id
        ),
        'clear'::public.member_safety_state
      ) = 'clear'::public.member_safety_state
  );
$$;

revoke all on function public.set_member_safety_state(uuid, public.member_safety_state, text, text, timestamptz)
from public, anon, authenticated;
grant execute on function public.set_member_safety_state(uuid, public.member_safety_state, text, text, timestamptz)
to service_role;

revoke all on function private.member_can_participate(uuid) from public, anon, authenticated;
grant execute on function private.member_can_participate(uuid) to service_role;

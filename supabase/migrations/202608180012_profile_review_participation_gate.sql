create type public.member_profile_review_state as enum (
  'pending',
  'approved',
  'needs_changes',
  'rejected'
);

create table public.member_profile_reviews (
  user_id uuid primary key references public.users(id) on delete cascade,
  state public.member_profile_review_state not null default 'pending',
  review_after timestamptz,
  updated_at timestamptz not null default now()
);

alter table public.member_profile_reviews enable row level security;

create policy "members read own profile review state"
on public.member_profile_reviews
for select
to authenticated
using (user_id = auth.uid());

revoke all on table public.member_profile_reviews from public, anon;
revoke insert, update, delete on table public.member_profile_reviews from authenticated;
grant select on table public.member_profile_reviews to authenticated;
grant select, insert, update, delete on table public.member_profile_reviews to service_role;

create table private.member_profile_review_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  from_state public.member_profile_review_state not null,
  to_state public.member_profile_review_state not null,
  note_code text check (note_code is null or char_length(note_code) <= 80),
  actor_reference text not null check (char_length(actor_reference) between 1 and 120),
  review_after timestamptz,
  recorded_at timestamptz not null default now(),
  check (from_state <> to_state)
);

create index member_profile_review_events_user_time_idx
  on private.member_profile_review_events (user_id, recorded_at);

revoke all on table private.member_profile_review_events from public, anon, authenticated;
grant select, insert on table private.member_profile_review_events to service_role;

create or replace function public.set_member_profile_review_state(
  p_user_id uuid,
  p_state public.member_profile_review_state,
  p_note_code text default null,
  p_actor_reference text default 'system',
  p_review_after timestamptz default null
)
returns boolean
language plpgsql
security definer
set search_path = public, private
as $$
declare
  v_from_state public.member_profile_review_state := 'pending';
  v_note_code text := nullif(btrim(p_note_code), '');
  v_actor_reference text := nullif(btrim(p_actor_reference), '');
  v_has_row boolean := false;
begin
  if p_user_id is null or p_state is null then
    raise exception 'invalid profile review transition';
  end if;

  if v_note_code is not null and char_length(v_note_code) > 80 then
    raise exception 'profile review note code too long';
  end if;

  if v_actor_reference is null or char_length(v_actor_reference) > 120 then
    raise exception 'invalid profile review actor';
  end if;

  if not exists (
    select 1
    from public.users u
    where u.id = p_user_id
      and u.account_status = 'active'
  ) then
    raise exception 'member unavailable';
  end if;

  if p_state = 'approved' and not exists (
    select 1
    from public.member_profiles p
    join public.waitlist_applications a on a.user_id = p.user_id
    where p.user_id = p_user_id
      and p.profile_completed_at is not null
      and a.status in ('submitted', 'qualified', 'invited')
      and a.questionnaire_completed_at is not null
      and a.submitted_at is not null
  ) then
    raise exception 'profile not eligible for approval';
  end if;

  select r.state
  into v_from_state
  from public.member_profile_reviews r
  where r.user_id = p_user_id
  for update;

  v_has_row := found;
  v_from_state := coalesce(v_from_state, 'pending'::public.member_profile_review_state);

  if v_from_state = p_state then
    return false;
  end if;

  if p_state = 'approved' then
    p_review_after := null;
  end if;

  insert into public.member_profile_reviews (
    user_id,
    state,
    review_after,
    updated_at
  ) values (
    p_user_id,
    p_state,
    p_review_after,
    now()
  )
  on conflict (user_id) do update
  set state = excluded.state,
      review_after = excluded.review_after,
      updated_at = excluded.updated_at;

  insert into private.member_profile_review_events (
    user_id,
    from_state,
    to_state,
    note_code,
    actor_reference,
    review_after
  ) values (
    p_user_id,
    v_from_state,
    p_state,
    v_note_code,
    v_actor_reference,
    p_review_after
  );

  return true;
end;
$$;

create or replace function private.reset_profile_review_on_content_change()
returns trigger
language plpgsql
security definer
set search_path = public, private
as $$
declare
  v_from_state public.member_profile_review_state;
begin
  if not (
    old.display_name is distinct from new.display_name
    or old.about_me is distinct from new.about_me
    or old.occupation is distinct from new.occupation
    or old.education is distinct from new.education
  ) then
    return new;
  end if;

  select r.state
  into v_from_state
  from public.member_profile_reviews r
  where r.user_id = new.user_id
  for update;

  if not found or v_from_state = 'pending'::public.member_profile_review_state then
    return new;
  end if;

  update public.member_profile_reviews
  set state = 'pending'::public.member_profile_review_state,
      review_after = null,
      updated_at = now()
  where user_id = new.user_id;

  insert into private.member_profile_review_events (
    user_id,
    from_state,
    to_state,
    note_code,
    actor_reference,
    review_after
  ) values (
    new.user_id,
    v_from_state,
    'pending'::public.member_profile_review_state,
    'profile_content_changed',
    'profile-change',
    null
  );

  return new;
end;
$$;

create trigger member_profiles_reset_review_after_content_change
  after update of display_name, about_me, occupation, education
  on public.member_profiles
  for each row
  execute function private.reset_profile_review_on_content_change();

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
    join public.waitlist_applications a on a.user_id = u.id
    join public.member_profiles p on p.user_id = u.id
    join public.member_profile_reviews r on r.user_id = u.id
    where u.id = p_user_id
      and u.account_status = 'active'
      and a.status in ('submitted', 'qualified', 'invited')
      and a.questionnaire_completed_at is not null
      and a.submitted_at is not null
      and p.profile_completed_at is not null
      and r.state = 'approved'::public.member_profile_review_state
      and coalesce(
        (
          select s.state
          from public.member_safety_states s
          where s.user_id = u.id
        ),
        'clear'::public.member_safety_state
      ) = 'clear'::public.member_safety_state
  );
$$;

revoke all on function public.set_member_profile_review_state(uuid, public.member_profile_review_state, text, text, timestamptz)
from public, anon, authenticated;
grant execute on function public.set_member_profile_review_state(uuid, public.member_profile_review_state, text, text, timestamptz)
to service_role;

revoke all on function private.reset_profile_review_on_content_change() from public, anon, authenticated;
grant execute on function private.reset_profile_review_on_content_change() to service_role;

revoke all on function private.member_can_participate(uuid) from public, anon, authenticated;
grant execute on function private.member_can_participate(uuid) to service_role;

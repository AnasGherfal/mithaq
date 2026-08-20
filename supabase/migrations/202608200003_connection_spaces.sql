create type public.connection_space as enum (
  'marriage',
  'friendship'
);

create type public.connection_space_membership_state as enum (
  'active',
  'paused'
);

create table public.member_connection_spaces (
  user_id uuid not null references public.users(id) on delete cascade,
  space public.connection_space not null,
  membership_state public.connection_space_membership_state not null default 'active',
  is_current boolean not null default false,
  joined_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default clock_timestamp(),
  primary key (user_id, space)
);

create unique index member_connection_spaces_one_current_idx
  on public.member_connection_spaces (user_id)
  where is_current;

create index member_connection_spaces_space_state_idx
  on public.member_connection_spaces (space, membership_state, joined_at);

alter table public.member_connection_spaces enable row level security;

create policy "connection spaces read own"
on public.member_connection_spaces
for select
to authenticated
using (user_id = auth.uid());

revoke all on table public.member_connection_spaces from public, anon;
revoke insert, update, delete on table public.member_connection_spaces from authenticated;
grant select on table public.member_connection_spaces to authenticated;
grant select, insert, update, delete on table public.member_connection_spaces to service_role;

create table public.friendship_profiles (
  user_id uuid primary key references public.users(id) on delete cascade,
  display_name text,
  about_me text,
  city text,
  interests text[] not null default '{}'::text[],
  profile_completed_at timestamptz,
  created_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default clock_timestamp(),
  check (display_name is null or char_length(display_name) between 2 and 50),
  check (about_me is null or char_length(about_me) between 1 and 600),
  check (city is null or char_length(city) between 1 and 100),
  check (cardinality(interests) <= 8)
);

alter table public.friendship_profiles enable row level security;

create policy "friendship profiles read own"
on public.friendship_profiles
for select
to authenticated
using (user_id = auth.uid());

revoke all on table public.friendship_profiles from public, anon;
revoke insert, update, delete on table public.friendship_profiles from authenticated;
grant select on table public.friendship_profiles to authenticated;
grant select, insert, update, delete on table public.friendship_profiles to service_role;

-- Existing members entered Mithaq through the marriage registration journey, so
-- preserve that space for them. Newly verified accounts choose a space after
-- OTP instead of being silently enrolled in both products.
insert into public.member_connection_spaces (
  user_id,
  space,
  membership_state,
  is_current
)
select
  u.id,
  'marriage'::public.connection_space,
  'active'::public.connection_space_membership_state,
  true
from public.users u
where exists (
  select 1
  from public.waitlist_applications a
  where a.user_id = u.id
)
on conflict (user_id, space) do nothing;

create or replace function public.list_my_connection_spaces()
returns table (
  space public.connection_space,
  membership_state public.connection_space_membership_state,
  is_current boolean,
  profile_completed boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'authentication required';
  end if;

  return query
  select
    available.space,
    membership.membership_state,
    coalesce(membership.is_current, false),
    case available.space
      when 'marriage'::public.connection_space then exists (
        select 1
        from public.member_profiles p
        where p.user_id = v_user_id
          and p.profile_completed_at is not null
      )
      when 'friendship'::public.connection_space then exists (
        select 1
        from public.friendship_profiles p
        where p.user_id = v_user_id
          and p.profile_completed_at is not null
      )
    end
  from unnest(enum_range(null::public.connection_space)) available(space)
  left join public.member_connection_spaces membership
    on membership.user_id = v_user_id
   and membership.space = available.space
  order by available.space;
end;
$$;

create or replace function public.join_my_connection_space(
  p_space public.connection_space
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_has_current boolean;
begin
  if v_user_id is null then
    raise exception 'authentication required';
  end if;

  if p_space is null then
    raise exception 'connection space required';
  end if;

  if not exists (
    select 1
    from public.users u
    where u.id = v_user_id
      and u.account_status = 'active'
  ) then
    raise exception 'account unavailable';
  end if;

  select exists (
    select 1
    from public.member_connection_spaces s
    where s.user_id = v_user_id
      and s.is_current
  ) into v_has_current;

  insert into public.member_connection_spaces (
    user_id,
    space,
    membership_state,
    is_current,
    joined_at,
    updated_at
  ) values (
    v_user_id,
    p_space,
    'active'::public.connection_space_membership_state,
    not v_has_current,
    clock_timestamp(),
    clock_timestamp()
  )
  on conflict (user_id, space) do update
  set membership_state = 'active'::public.connection_space_membership_state,
      updated_at = clock_timestamp();

  return true;
end;
$$;

create or replace function public.set_my_current_connection_space(
  p_space public.connection_space
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'authentication required';
  end if;

  if p_space is null then
    raise exception 'connection space required';
  end if;

  if not exists (
    select 1
    from public.users u
    where u.id = v_user_id
      and u.account_status = 'active'
  ) then
    raise exception 'account unavailable';
  end if;

  if not exists (
    select 1
    from public.member_connection_spaces s
    where s.user_id = v_user_id
      and s.space = p_space
      and s.membership_state = 'active'
  ) then
    raise exception 'connection space unavailable';
  end if;

  update public.member_connection_spaces
  set is_current = false,
      updated_at = clock_timestamp()
  where user_id = v_user_id
    and is_current;

  update public.member_connection_spaces
  set is_current = true,
      updated_at = clock_timestamp()
  where user_id = v_user_id
    and space = p_space
    and membership_state = 'active';

  return true;
end;
$$;

create or replace function public.get_my_friendship_profile()
returns table (
  display_name text,
  about_me text,
  city text,
  interests text[],
  profile_completed_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'authentication required';
  end if;

  return query
  select
    p.display_name,
    p.about_me,
    p.city,
    p.interests,
    p.profile_completed_at
  from public.friendship_profiles p
  where p.user_id = v_user_id;
end;
$$;

create or replace function public.save_my_friendship_profile(
  p_display_name text,
  p_about_me text,
  p_city text,
  p_interests text[] default '{}'::text[]
)
returns table (
  profile_completed boolean,
  profile_completed_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_display_name text := nullif(btrim(p_display_name), '');
  v_about_me text := nullif(btrim(p_about_me), '');
  v_city text := nullif(btrim(p_city), '');
  v_interests text[];
  v_completed boolean;
  v_completed_at timestamptz;
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

  if not exists (
    select 1
    from public.member_connection_spaces s
    where s.user_id = v_user_id
      and s.space = 'friendship'::public.connection_space
      and s.membership_state = 'active'
  ) then
    raise exception 'friendship space required';
  end if;

  if v_display_name is not null
     and char_length(v_display_name) not between 2 and 50 then
    raise exception 'invalid friendship display name';
  end if;

  if v_about_me is not null and char_length(v_about_me) > 600 then
    raise exception 'invalid friendship introduction';
  end if;

  if v_city is not null and char_length(v_city) > 100 then
    raise exception 'invalid friendship city';
  end if;

  if exists (
    select 1
    from unnest(coalesce(p_interests, '{}'::text[])) value
    where nullif(btrim(value), '') is not null
      and char_length(btrim(value)) not between 2 and 40
  ) then
    raise exception 'invalid friendship interest';
  end if;

  select coalesce(array_agg(normalized.value order by normalized.first_position), '{}'::text[])
  into v_interests
  from (
    select
      lower(btrim(value)) as normalized_value,
      min(btrim(value)) as value,
      min(position) as first_position
    from unnest(coalesce(p_interests, '{}'::text[])) with ordinality input(value, position)
    where nullif(btrim(value), '') is not null
    group by lower(btrim(value))
    order by min(position)
    limit 8
  ) normalized;

  v_completed :=
    v_display_name is not null
    and v_about_me is not null
    and char_length(v_about_me) >= 40
    and v_city is not null
    and cardinality(v_interests) >= 2;

  v_completed_at := case when v_completed then clock_timestamp() else null end;

  insert into public.friendship_profiles (
    user_id,
    display_name,
    about_me,
    city,
    interests,
    profile_completed_at,
    created_at,
    updated_at
  ) values (
    v_user_id,
    v_display_name,
    v_about_me,
    v_city,
    v_interests,
    v_completed_at,
    clock_timestamp(),
    clock_timestamp()
  )
  on conflict (user_id) do update
  set display_name = excluded.display_name,
      about_me = excluded.about_me,
      city = excluded.city,
      interests = excluded.interests,
      profile_completed_at = excluded.profile_completed_at,
      updated_at = clock_timestamp();

  return query
  select v_completed, v_completed_at;
end;
$$;

revoke all on function public.list_my_connection_spaces() from public, anon;
revoke all on function public.join_my_connection_space(public.connection_space) from public, anon;
revoke all on function public.set_my_current_connection_space(public.connection_space) from public, anon;
revoke all on function public.get_my_friendship_profile() from public, anon;
revoke all on function public.save_my_friendship_profile(text, text, text, text[]) from public, anon;

grant execute on function public.list_my_connection_spaces() to authenticated, service_role;
grant execute on function public.join_my_connection_space(public.connection_space) to authenticated, service_role;
grant execute on function public.set_my_current_connection_space(public.connection_space) to authenticated, service_role;
grant execute on function public.get_my_friendship_profile() to authenticated, service_role;
grant execute on function public.save_my_friendship_profile(text, text, text, text[]) to authenticated, service_role;

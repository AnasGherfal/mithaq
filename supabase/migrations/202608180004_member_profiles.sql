create table public.member_profiles (
  user_id uuid primary key references public.users(id) on delete cascade,
  display_name text check (display_name is null or char_length(display_name) between 2 and 50),
  about_me text check (about_me is null or char_length(about_me) between 1 and 600),
  occupation text check (occupation is null or char_length(occupation) <= 100),
  education text check (education is null or char_length(education) <= 100),
  profile_completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.member_profiles enable row level security;

create policy "member profiles read own"
on public.member_profiles
for select
to authenticated
using (user_id = auth.uid());

revoke all on table public.member_profiles from public, anon;
revoke insert, update, delete on table public.member_profiles from authenticated;
grant select on table public.member_profiles to authenticated;

create or replace function public.save_member_profile(
  p_display_name text,
  p_about_me text,
  p_occupation text default null,
  p_education text default null
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
  v_occupation text := nullif(btrim(p_occupation), '');
  v_education text := nullif(btrim(p_education), '');
  v_complete boolean;
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

  if v_display_name is not null and char_length(v_display_name) not between 2 and 50 then
    raise exception 'invalid display name';
  end if;

  if v_about_me is not null and char_length(v_about_me) > 600 then
    raise exception 'about me is too long';
  end if;

  if v_occupation is not null and char_length(v_occupation) > 100 then
    raise exception 'occupation is too long';
  end if;

  if v_education is not null and char_length(v_education) > 100 then
    raise exception 'education is too long';
  end if;

  v_complete :=
    v_display_name is not null
    and v_about_me is not null
    and char_length(v_about_me) >= 40;

  insert into public.member_profiles (
    user_id,
    display_name,
    about_me,
    occupation,
    education,
    profile_completed_at,
    updated_at
  ) values (
    v_user_id,
    v_display_name,
    v_about_me,
    v_occupation,
    v_education,
    case when v_complete then now() else null end,
    now()
  )
  on conflict (user_id) do update
  set display_name = excluded.display_name,
      about_me = excluded.about_me,
      occupation = excluded.occupation,
      education = excluded.education,
      profile_completed_at = case
        when v_complete then coalesce(member_profiles.profile_completed_at, now())
        else null
      end,
      updated_at = now()
  returning member_profiles.profile_completed_at into v_completed_at;

  return query
  select v_complete, v_completed_at;
end;
$$;

revoke all on function public.save_member_profile(text, text, text, text) from public, anon;
grant execute on function public.save_member_profile(text, text, text, text) to authenticated, service_role;

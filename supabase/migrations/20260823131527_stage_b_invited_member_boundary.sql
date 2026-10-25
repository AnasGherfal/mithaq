create or replace function private.is_invited_marriage_user(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.waitlist_applications a
    where a.user_id = p_user_id
      and a.status = 'invited'::public.waitlist_status
      and a.submitted_at is not null
      and a.questionnaire_completed_at is not null
  );
$$;

revoke all on function private.is_invited_marriage_user(uuid) from public, anon, authenticated;

create or replace function public.join_my_connection_space(p_space public.connection_space)
returns boolean
language plpgsql
security definer
set search_path = 'public'
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then raise exception 'authentication required'; end if;
  if p_space is distinct from 'marriage'::public.connection_space then raise exception 'connection space unavailable'; end if;
  if not exists (
    select 1 from public.users u
    where u.id = v_user_id and u.account_status = 'active'::public.account_status
  ) then raise exception 'account unavailable'; end if;
  if not private.is_invited_marriage_user(v_user_id) then raise exception 'invitation required'; end if;

  update public.member_connection_spaces
  set is_current = false, updated_at = clock_timestamp()
  where user_id = v_user_id and is_current;

  insert into public.member_connection_spaces (
    user_id, space, membership_state, is_current, joined_at, updated_at
  ) values (
    v_user_id, 'marriage'::public.connection_space,
    'active'::public.connection_space_membership_state, true,
    clock_timestamp(), clock_timestamp()
  )
  on conflict (user_id, space) do update
  set membership_state = 'active'::public.connection_space_membership_state,
      is_current = true,
      updated_at = clock_timestamp();

  return true;
end;
$$;

create or replace function public.save_member_profile(
  p_display_name text,
  p_about_me text,
  p_occupation text default null,
  p_education text default null
)
returns table(profile_completed boolean, profile_completed_at timestamptz)
language plpgsql
security definer
set search_path = 'public'
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
  if v_user_id is null then raise exception 'authentication required'; end if;
  if not exists (
    select 1 from public.users u
    where u.id = v_user_id and u.account_status = 'active'
  ) then raise exception 'account unavailable'; end if;
  if not private.is_invited_marriage_user(v_user_id) then raise exception 'invitation required'; end if;

  if v_display_name is not null and char_length(v_display_name) not between 2 and 50 then raise exception 'invalid display name'; end if;
  if v_about_me is not null and char_length(v_about_me) > 600 then raise exception 'about me is too long'; end if;
  if v_occupation is not null and char_length(v_occupation) > 100 then raise exception 'occupation is too long'; end if;
  if v_education is not null and char_length(v_education) > 100 then raise exception 'education is too long'; end if;

  v_complete := v_display_name is not null and v_about_me is not null and char_length(v_about_me) >= 40;

  insert into public.member_profiles (
    user_id, display_name, about_me, occupation, education, profile_completed_at, updated_at
  ) values (
    v_user_id, v_display_name, v_about_me, v_occupation, v_education,
    case when v_complete then now() else null end, now()
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

  return query select v_complete, v_completed_at;
end;
$$;

create or replace function public.set_profile_disclosure_preferences(
  p_share_occupation boolean,
  p_share_education boolean,
  p_share_origin_region boolean
)
returns table(share_occupation boolean, share_education boolean, share_origin_region boolean)
language plpgsql
security definer
set search_path = 'public'
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then raise exception 'authentication required'; end if;
  if not exists (
    select 1 from public.users u
    where u.id = v_user_id and u.account_status = 'active'
  ) then raise exception 'account unavailable'; end if;
  if not private.is_invited_marriage_user(v_user_id) then raise exception 'invitation required'; end if;

  update public.member_profiles p
  set share_occupation = coalesce(p_share_occupation, false),
      share_education = coalesce(p_share_education, false),
      share_origin_region = coalesce(p_share_origin_region, false),
      updated_at = now()
  where p.user_id = v_user_id and p.profile_completed_at is not null;

  if not found then raise exception 'complete profile required'; end if;

  return query
  select p.share_occupation, p.share_education, p.share_origin_region
  from public.member_profiles p where p.user_id = v_user_id;
end;
$$;

create or replace function public.save_my_marriage_practical_priorities(
  p_living_arrangement text,
  p_children_plan text,
  p_work_after_marriage text,
  p_wedding_style text
)
returns table(
  living_arrangement text,
  children_plan text,
  work_after_marriage text,
  wedding_style text,
  completed_at timestamptz
)
language plpgsql
security definer
set search_path = 'public', 'private'
as $$
declare
  v_user_id uuid := auth.uid();
  v_now timestamptz := clock_timestamp();
begin
  if v_user_id is null then raise exception 'authentication required'; end if;
  if not exists (
    select 1 from public.users u
    where u.id = v_user_id and u.account_status = 'active'
  ) then raise exception 'account unavailable'; end if;
  if not private.is_invited_marriage_user(v_user_id) then raise exception 'invitation required'; end if;
  if not exists (
    select 1 from public.member_connection_spaces s
    where s.user_id = v_user_id
      and s.space = 'marriage'::public.connection_space
      and s.membership_state = 'active'::public.connection_space_membership_state
  ) then raise exception 'marriage space required'; end if;

  if p_living_arrangement is null or p_living_arrangement not in ('independent_home', 'with_family_initially', 'with_family_long_term', 'flexible') then raise exception 'invalid living arrangement'; end if;
  if p_children_plan is null or p_children_plan not in ('want_children', 'do_not_want_children', 'unsure') then raise exception 'invalid children plan'; end if;
  if p_work_after_marriage is null or p_work_after_marriage not in ('both_work', 'one_may_pause', 'open_to_discuss', 'no_preference') then raise exception 'invalid work preference'; end if;
  if p_wedding_style is null or p_wedding_style not in ('simple', 'moderate', 'large', 'discuss_together') then raise exception 'invalid wedding style'; end if;

  insert into private.marriage_practical_priorities (
    user_id, living_arrangement, children_plan, work_after_marriage,
    wedding_style, completed_at, created_at, updated_at
  ) values (
    v_user_id, p_living_arrangement, p_children_plan, p_work_after_marriage,
    p_wedding_style, v_now, v_now, v_now
  )
  on conflict (user_id) do update
  set living_arrangement = excluded.living_arrangement,
      children_plan = excluded.children_plan,
      work_after_marriage = excluded.work_after_marriage,
      wedding_style = excluded.wedding_style,
      completed_at = coalesce(private.marriage_practical_priorities.completed_at, excluded.completed_at),
      updated_at = excluded.updated_at;

  return query
  select p.living_arrangement, p.children_plan, p.work_after_marriage, p.wedding_style, p.completed_at
  from private.marriage_practical_priorities p where p.user_id = v_user_id;
end;
$$;

create or replace function public.set_my_marriage_visibility(p_visibility_mode public.marriage_visibility_mode)
returns public.marriage_visibility_mode
language plpgsql
security definer
set search_path = 'public'
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then raise exception 'authentication required'; end if;
  if p_visibility_mode is null then raise exception 'visibility choice required'; end if;
  if not exists (
    select 1 from public.users u
    where u.id = v_user_id and u.account_status = 'active'
  ) then raise exception 'account unavailable'; end if;
  if not private.is_invited_marriage_user(v_user_id) then raise exception 'invitation required'; end if;
  if not exists (
    select 1 from public.member_connection_spaces s
    where s.user_id = v_user_id
      and s.space = 'marriage'::public.connection_space
      and s.membership_state = 'active'::public.connection_space_membership_state
  ) then raise exception 'marriage space unavailable'; end if;

  insert into public.marriage_visibility_settings (user_id, visibility_mode, updated_at)
  values (v_user_id, p_visibility_mode, clock_timestamp())
  on conflict (user_id) do update
  set visibility_mode = excluded.visibility_mode, updated_at = excluded.updated_at;

  return p_visibility_mode;
end;
$$;

create or replace function public.get_own_introduction_preview()
returns table(
  display_name text,
  about_me text,
  occupation text,
  education text,
  gender public.gender,
  age_band_id smallint,
  country_code character,
  city text,
  origin_region text,
  marital_status public.marital_status,
  has_children boolean
)
language plpgsql
security definer
set search_path = 'public'
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then raise exception 'authentication required'; end if;
  if not exists (
    select 1 from public.users u
    where u.id = v_user_id and u.account_status = 'active'
  ) then raise exception 'account unavailable'; end if;
  if not private.is_invited_marriage_user(v_user_id) then raise exception 'invitation required'; end if;

  if not exists (
    select 1
    from public.waitlist_applications a
    join public.member_profiles p on p.user_id = a.user_id
    where a.user_id = v_user_id
      and a.status = 'invited'
      and a.submitted_at is not null
      and a.questionnaire_completed_at is not null
      and p.profile_completed_at is not null
  ) then raise exception 'profile preview unavailable'; end if;

  return query
  select
    p.display_name,
    p.about_me,
    case when p.share_occupation then p.occupation else null end,
    case when p.share_education then p.education else null end,
    a.gender,
    a.age_band_id,
    a.current_country_code,
    a.current_city,
    case when p.share_origin_region then a.libyan_origin_region else null end,
    a.marital_status,
    a.has_children
  from public.member_profiles p
  join public.waitlist_applications a on a.user_id = p.user_id
  where p.user_id = v_user_id
    and p.profile_completed_at is not null
    and a.status = 'invited'
    and a.submitted_at is not null
    and a.questionnaire_completed_at is not null;
end;
$$;

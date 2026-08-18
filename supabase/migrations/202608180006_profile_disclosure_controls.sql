alter table public.member_profiles
add column share_occupation boolean not null default false,
add column share_education boolean not null default false,
add column share_origin_region boolean not null default false;

create or replace function public.set_profile_disclosure_preferences(
  p_share_occupation boolean,
  p_share_education boolean,
  p_share_origin_region boolean
)
returns table (
  share_occupation boolean,
  share_education boolean,
  share_origin_region boolean
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

  if not exists (
    select 1
    from public.users u
    where u.id = v_user_id
      and u.account_status = 'active'
  ) then
    raise exception 'account unavailable';
  end if;

  update public.member_profiles p
  set share_occupation = coalesce(p_share_occupation, false),
      share_education = coalesce(p_share_education, false),
      share_origin_region = coalesce(p_share_origin_region, false),
      updated_at = now()
  where p.user_id = v_user_id
    and p.profile_completed_at is not null;

  if not found then
    raise exception 'complete profile required';
  end if;

  return query
  select
    p.share_occupation,
    p.share_education,
    p.share_origin_region
  from public.member_profiles p
  where p.user_id = v_user_id;
end;
$$;

revoke all on function public.set_profile_disclosure_preferences(boolean, boolean, boolean) from public, anon;
grant execute on function public.set_profile_disclosure_preferences(boolean, boolean, boolean) to authenticated, service_role;

create or replace function public.get_own_introduction_preview()
returns table (
  display_name text,
  about_me text,
  occupation text,
  education text,
  gender public.gender,
  age_band_id smallint,
  country_code char(2),
  city text,
  origin_region text,
  marital_status public.marital_status,
  has_children boolean
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
    from public.waitlist_applications a
    join public.member_profiles p on p.user_id = a.user_id
    where a.user_id = v_user_id
      and a.status in ('submitted', 'qualified', 'invited')
      and a.submitted_at is not null
      and a.questionnaire_completed_at is not null
      and p.profile_completed_at is not null
  ) then
    raise exception 'profile preview unavailable';
  end if;

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
    and a.status in ('submitted', 'qualified', 'invited')
    and a.submitted_at is not null
    and a.questionnaire_completed_at is not null;
end;
$$;

revoke all on function public.get_own_introduction_preview() from public, anon;
grant execute on function public.get_own_introduction_preview() to authenticated;

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
    p.occupation,
    p.education,
    a.gender,
    a.age_band_id,
    a.current_country_code,
    a.current_city,
    a.libyan_origin_region,
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

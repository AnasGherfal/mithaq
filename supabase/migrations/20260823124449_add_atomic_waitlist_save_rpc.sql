create or replace function public.save_my_waitlist(
  p_gender public.gender,
  p_age_band_id smallint,
  p_residency_type public.residency_type,
  p_current_country_code text,
  p_current_city text,
  p_libyan_origin_region text,
  p_marital_status public.marital_status,
  p_has_children boolean,
  p_libyan_self_attestation boolean,
  p_marriage_timeline public.marriage_timeline,
  p_willing_identity_verification boolean,
  p_photo_privacy_preference public.photo_privacy_preference,
  p_family_involvement_preference public.family_involvement_preference,
  p_relocation_willingness public.tristate_preference,
  p_open_to_libya boolean,
  p_open_to_diaspora boolean,
  p_preferred_partner_age_min smallint,
  p_preferred_partner_age_max smallint,
  p_accepts_partner_with_children public.tristate_preference,
  p_accepted_marital_statuses public.marital_status[],
  p_preferred_country_codes text[] default '{}'::text[]
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_application_id uuid;
  v_now timestamptz := clock_timestamp();
begin
  if v_user_id is null then raise exception 'authentication required'; end if;

  if not exists (
    select 1 from public.users u
    where u.id = v_user_id and u.account_status = 'active'
  ) then raise exception 'account unavailable'; end if;

  if p_libyan_self_attestation is not true then raise exception 'libyan self attestation required'; end if;

  if not exists (select 1 from public.age_bands b where b.id = p_age_band_id) then
    raise exception 'invalid age band';
  end if;

  if p_current_country_code is null or upper(trim(p_current_country_code)) !~ '^[A-Z]{2}$' then
    raise exception 'invalid country code';
  end if;

  if p_current_city is null or char_length(trim(p_current_city)) < 2 then
    raise exception 'current city required';
  end if;

  if not (p_open_to_libya or p_open_to_diaspora) then
    raise exception 'at least one location preference required';
  end if;

  if p_preferred_partner_age_min < 18
    or p_preferred_partner_age_max < p_preferred_partner_age_min
    or p_preferred_partner_age_max > 80 then
    raise exception 'invalid partner age range';
  end if;

  if coalesce(cardinality(p_accepted_marital_statuses), 0) = 0 then
    raise exception 'accepted marital statuses required';
  end if;

  if exists (
    select 1
    from unnest(coalesce(p_preferred_country_codes, '{}'::text[])) as c(code)
    where trim(c.code) <> '' and upper(trim(c.code)) !~ '^[A-Z]{2}$'
  ) then raise exception 'invalid preferred country code'; end if;

  select a.id into v_application_id
  from public.waitlist_applications a
  where a.user_id = v_user_id
  for update;

  if v_application_id is null then
    insert into public.waitlist_applications (
      user_id, gender, age_band_id, residency_type, current_country_code, current_city,
      libyan_origin_region, marital_status, has_children, libyan_self_attestation,
      questionnaire_completed_at, updated_at
    ) values (
      v_user_id, p_gender, p_age_band_id, p_residency_type,
      upper(trim(p_current_country_code))::char(2), trim(p_current_city),
      nullif(trim(p_libyan_origin_region), ''), p_marital_status, p_has_children,
      p_libyan_self_attestation, v_now, v_now
    ) returning id into v_application_id;
  else
    update public.waitlist_applications
    set gender = p_gender,
        age_band_id = p_age_band_id,
        residency_type = p_residency_type,
        current_country_code = upper(trim(p_current_country_code))::char(2),
        current_city = trim(p_current_city),
        libyan_origin_region = nullif(trim(p_libyan_origin_region), ''),
        marital_status = p_marital_status,
        has_children = p_has_children,
        libyan_self_attestation = p_libyan_self_attestation,
        questionnaire_completed_at = v_now,
        updated_at = v_now
    where id = v_application_id;
  end if;

  insert into public.waitlist_preferences (
    application_id, marriage_timeline, willing_identity_verification,
    photo_privacy_preference, family_involvement_preference, relocation_willingness,
    open_to_libya, open_to_diaspora, preferred_partner_age_min,
    preferred_partner_age_max, accepts_partner_with_children, updated_at
  ) values (
    v_application_id, p_marriage_timeline, p_willing_identity_verification,
    p_photo_privacy_preference, p_family_involvement_preference, p_relocation_willingness,
    p_open_to_libya, p_open_to_diaspora, p_preferred_partner_age_min,
    p_preferred_partner_age_max, p_accepts_partner_with_children, v_now
  )
  on conflict (application_id) do update
  set marriage_timeline = excluded.marriage_timeline,
      willing_identity_verification = excluded.willing_identity_verification,
      photo_privacy_preference = excluded.photo_privacy_preference,
      family_involvement_preference = excluded.family_involvement_preference,
      relocation_willingness = excluded.relocation_willingness,
      open_to_libya = excluded.open_to_libya,
      open_to_diaspora = excluded.open_to_diaspora,
      preferred_partner_age_min = excluded.preferred_partner_age_min,
      preferred_partner_age_max = excluded.preferred_partner_age_max,
      accepts_partner_with_children = excluded.accepts_partner_with_children,
      updated_at = excluded.updated_at;

  delete from public.waitlist_accepted_marital_statuses where application_id = v_application_id;
  insert into public.waitlist_accepted_marital_statuses (application_id, marital_status)
  select v_application_id, s.marital_status
  from (select distinct unnest(p_accepted_marital_statuses) as marital_status) s;

  delete from public.waitlist_preferred_countries where application_id = v_application_id;
  insert into public.waitlist_preferred_countries (application_id, country_code)
  select v_application_id, upper(trim(c.code))::char(2)
  from unnest(coalesce(p_preferred_country_codes, '{}'::text[])) as c(code)
  where trim(c.code) <> ''
  group by upper(trim(c.code));

  return v_application_id;
end;
$$;

revoke all on function public.save_my_waitlist(
  public.gender, smallint, public.residency_type, text, text, text,
  public.marital_status, boolean, boolean, public.marriage_timeline, boolean,
  public.photo_privacy_preference, public.family_involvement_preference,
  public.tristate_preference, boolean, boolean, smallint, smallint,
  public.tristate_preference, public.marital_status[], text[]
) from public;

grant execute on function public.save_my_waitlist(
  public.gender, smallint, public.residency_type, text, text, text,
  public.marital_status, boolean, boolean, public.marriage_timeline, boolean,
  public.photo_privacy_preference, public.family_involvement_preference,
  public.tristate_preference, boolean, boolean, smallint, smallint,
  public.tristate_preference, public.marital_status[], text[]
) to authenticated;

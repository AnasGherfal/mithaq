-- Keep lifecycle, audit, and deletion state under server-side control even when
-- an authenticated client calls PostgREST directly instead of using the app UI.

revoke insert, update, delete on public.users from authenticated;
grant update (preferred_locale, timezone, phone_country_iso, updated_at) on public.users to authenticated;

revoke insert, update, delete on public.waitlist_applications from authenticated;
grant insert (
  user_id,
  questionnaire_version,
  gender,
  age_band_id,
  residency_type,
  current_country_code,
  current_city,
  libyan_origin_region,
  marital_status,
  has_children,
  libyan_self_attestation,
  questionnaire_completed_at,
  updated_at
) on public.waitlist_applications to authenticated;
grant update (
  user_id,
  questionnaire_version,
  gender,
  age_band_id,
  residency_type,
  current_country_code,
  current_city,
  libyan_origin_region,
  marital_status,
  has_children,
  libyan_self_attestation,
  questionnaire_completed_at,
  updated_at
) on public.waitlist_applications to authenticated;

revoke insert, update, delete on public.waitlist_preferences from authenticated;
grant insert (
  application_id,
  marriage_timeline,
  willing_identity_verification,
  photo_privacy_preference,
  family_involvement_preference,
  relocation_willingness,
  open_to_libya,
  open_to_diaspora,
  preferred_partner_age_min,
  preferred_partner_age_max,
  accepts_partner_with_children,
  updated_at
) on public.waitlist_preferences to authenticated;
grant update (
  application_id,
  marriage_timeline,
  willing_identity_verification,
  photo_privacy_preference,
  family_involvement_preference,
  relocation_willingness,
  open_to_libya,
  open_to_diaspora,
  preferred_partner_age_min,
  preferred_partner_age_max,
  accepts_partner_with_children,
  updated_at
) on public.waitlist_preferences to authenticated;

revoke update on public.waitlist_accepted_marital_statuses from authenticated;
revoke update on public.waitlist_preferred_countries from authenticated;

revoke insert, update, delete on public.waitlist_consents from authenticated;
revoke insert, update, delete on public.deletion_requests from authenticated;

-- Reading one's own application remains available after a deletion request so
-- the Privacy Center can explain account state. Questionnaire writes require an
-- active account.
drop policy if exists "applications insert own" on public.waitlist_applications;
drop policy if exists "applications update own" on public.waitlist_applications;

create policy "applications insert own active"
on public.waitlist_applications
for insert
to authenticated
with check (
  user_id = auth.uid()
  and exists (
    select 1
    from public.users u
    where u.id = auth.uid()
      and u.account_status = 'active'
  )
);

create policy "applications update own active"
on public.waitlist_applications
for update
to authenticated
using (
  user_id = auth.uid()
  and exists (
    select 1
    from public.users u
    where u.id = auth.uid()
      and u.account_status = 'active'
  )
)
with check (
  user_id = auth.uid()
  and exists (
    select 1
    from public.users u
    where u.id = auth.uid()
      and u.account_status = 'active'
  )
);

drop policy if exists "preferences insert own" on public.waitlist_preferences;
drop policy if exists "preferences update own" on public.waitlist_preferences;

create policy "preferences insert own active"
on public.waitlist_preferences
for insert
to authenticated
with check (
  exists (
    select 1
    from public.waitlist_applications a
    join public.users u on u.id = a.user_id
    where a.id = application_id
      and a.user_id = auth.uid()
      and u.account_status = 'active'
  )
);

create policy "preferences update own active"
on public.waitlist_preferences
for update
to authenticated
using (
  exists (
    select 1
    from public.waitlist_applications a
    join public.users u on u.id = a.user_id
    where a.id = application_id
      and a.user_id = auth.uid()
      and u.account_status = 'active'
  )
)
with check (
  exists (
    select 1
    from public.waitlist_applications a
    join public.users u on u.id = a.user_id
    where a.id = application_id
      and a.user_id = auth.uid()
      and u.account_status = 'active'
  )
);

drop policy if exists "accepted statuses own" on public.waitlist_accepted_marital_statuses;

create policy "accepted statuses read own"
on public.waitlist_accepted_marital_statuses
for select
to authenticated
using (
  exists (
    select 1
    from public.waitlist_applications a
    where a.id = application_id
      and a.user_id = auth.uid()
  )
);

create policy "accepted statuses insert own active"
on public.waitlist_accepted_marital_statuses
for insert
to authenticated
with check (
  exists (
    select 1
    from public.waitlist_applications a
    join public.users u on u.id = a.user_id
    where a.id = application_id
      and a.user_id = auth.uid()
      and u.account_status = 'active'
  )
);

create policy "accepted statuses delete own active"
on public.waitlist_accepted_marital_statuses
for delete
to authenticated
using (
  exists (
    select 1
    from public.waitlist_applications a
    join public.users u on u.id = a.user_id
    where a.id = application_id
      and a.user_id = auth.uid()
      and u.account_status = 'active'
  )
);

drop policy if exists "preferred countries own" on public.waitlist_preferred_countries;

create policy "preferred countries read own"
on public.waitlist_preferred_countries
for select
to authenticated
using (
  exists (
    select 1
    from public.waitlist_applications a
    where a.id = application_id
      and a.user_id = auth.uid()
  )
);

create policy "preferred countries insert own active"
on public.waitlist_preferred_countries
for insert
to authenticated
with check (
  exists (
    select 1
    from public.waitlist_applications a
    join public.users u on u.id = a.user_id
    where a.id = application_id
      and a.user_id = auth.uid()
      and u.account_status = 'active'
  )
);

create policy "preferred countries delete own active"
on public.waitlist_preferred_countries
for delete
to authenticated
using (
  exists (
    select 1
    from public.waitlist_applications a
    join public.users u on u.id = a.user_id
    where a.id = application_id
      and a.user_id = auth.uid()
      and u.account_status = 'active'
  )
);

-- Finalization validates the full questionnaire server-side and refuses accounts
-- that are no longer active. Client-set timestamps alone are never enough.
create or replace function public.finalize_waitlist(
  p_locale text,
  p_communications boolean default false
)
returns text
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_user_id uuid := auth.uid();
  v_application public.waitlist_applications%rowtype;
  v_preferences public.waitlist_preferences%rowtype;
  v_code text;
  v_now timestamptz := now();
begin
  if v_user_id is null then
    raise exception 'authentication required';
  end if;

  if p_locale not in ('ar', 'en') then
    raise exception 'invalid locale';
  end if;

  if not exists (
    select 1
    from public.users
    where id = v_user_id
      and account_status = 'active'
  ) then
    raise exception 'account unavailable';
  end if;

  select * into v_application
  from public.waitlist_applications
  where user_id = v_user_id
  for update;

  if v_application.id is null
    or v_application.questionnaire_completed_at is null
    or v_application.gender is null
    or v_application.age_band_id is null
    or v_application.residency_type is null
    or v_application.current_country_code is null
    or v_application.current_city is null
    or v_application.marital_status is null
    or v_application.has_children is null
    or v_application.libyan_self_attestation is not true
  then
    raise exception 'questionnaire incomplete';
  end if;

  select * into v_preferences
  from public.waitlist_preferences
  where application_id = v_application.id;

  if v_preferences.application_id is null
    or v_preferences.marriage_timeline is null
    or v_preferences.willing_identity_verification is null
    or v_preferences.photo_privacy_preference is null
    or v_preferences.family_involvement_preference is null
    or v_preferences.relocation_willingness is null
    or v_preferences.open_to_libya is null
    or v_preferences.open_to_diaspora is null
    or not (v_preferences.open_to_libya or v_preferences.open_to_diaspora)
    or v_preferences.preferred_partner_age_min is null
    or v_preferences.preferred_partner_age_max is null
    or v_preferences.accepts_partner_with_children is null
  then
    raise exception 'questionnaire incomplete';
  end if;

  if not exists (
    select 1
    from public.waitlist_accepted_marital_statuses
    where application_id = v_application.id
  ) then
    raise exception 'questionnaire incomplete';
  end if;

  if v_application.status = 'submitted' then
    select code into v_code
    from public.referral_codes
    where owner_user_id = v_user_id
      and status = 'active';

    return v_code;
  end if;

  update public.waitlist_applications
  set status = 'submitted', submitted_at = v_now, updated_at = v_now
  where id = v_application.id;

  insert into public.waitlist_consents (
    user_id, consent_type, event_type, document_version, document_sha256, locale, recorded_at
  )
  values
    (v_user_id, 'age_18_plus', 'granted', '2026-08-17.v1', encode(digest('mithaq-age-18-plus-2026-08-17.v1', 'sha256'), 'hex'), p_locale, v_now),
    (v_user_id, 'terms', 'granted', '2026-08-17.prelaunch-v1', encode(digest('mithaq-terms-prelaunch-2026-08-17.v1', 'sha256'), 'hex'), p_locale, v_now),
    (v_user_id, 'privacy', 'granted', '2026-08-17.prelaunch-v1', encode(digest('mithaq-privacy-prelaunch-2026-08-17.v1', 'sha256'), 'hex'), p_locale, v_now),
    (v_user_id, 'waitlist_processing', 'granted', '2026-08-17.v1', encode(digest('mithaq-waitlist-processing-2026-08-17.v1', 'sha256'), 'hex'), p_locale, v_now);

  if p_communications then
    insert into public.waitlist_consents (
      user_id, consent_type, event_type, document_version, document_sha256, locale, recorded_at
    ) values (
      v_user_id,
      'communications',
      'granted',
      '2026-08-17.v1',
      encode(digest('mithaq-communications-2026-08-17.v1', 'sha256'), 'hex'),
      p_locale,
      v_now
    );
  end if;

  select code into v_code
  from public.referral_codes
  where owner_user_id = v_user_id
    and status = 'active';

  if v_code is null then
    loop
      v_code := upper(substr(encode(gen_random_bytes(8), 'hex'), 1, 12));
      begin
        insert into public.referral_codes (owner_user_id, code)
        values (v_user_id, v_code);
        exit;
      exception when unique_violation then
        null;
      end;
    end loop;
  end if;

  return v_code;
end;
$$;

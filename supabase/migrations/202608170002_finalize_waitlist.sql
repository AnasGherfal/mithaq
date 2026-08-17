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
  v_application_id uuid;
  v_code text;
  v_now timestamptz := now();
begin
  if v_user_id is null then
    raise exception 'authentication required';
  end if;

  if p_locale not in ('ar', 'en') then
    raise exception 'invalid locale';
  end if;

  select id into v_application_id
  from public.waitlist_applications
  where user_id = v_user_id
    and questionnaire_completed_at is not null
  for update;

  if v_application_id is null then
    raise exception 'questionnaire incomplete';
  end if;

  update public.waitlist_applications
  set status = 'submitted', submitted_at = coalesce(submitted_at, v_now), updated_at = v_now
  where id = v_application_id;

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
  where owner_user_id = v_user_id and status = 'active';

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

revoke all on function public.finalize_waitlist(text, boolean) from public;
grant execute on function public.finalize_waitlist(text, boolean) to authenticated;

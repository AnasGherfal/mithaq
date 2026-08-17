create unique index if not exists referral_events_session_event_unique
  on private.referral_events (referral_code_id, anonymous_session_id, event_type)
  where anonymous_session_id is not null;

create or replace function public.record_referral_open(
  p_code text,
  p_session_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = public, private, extensions
as $$
declare
  v_referral_code_id uuid;
begin
  if p_code is null or p_code !~ '^[A-Z0-9]{8,16}$' then
    return false;
  end if;

  select id into v_referral_code_id
  from public.referral_codes
  where code = upper(p_code)
    and status = 'active'
    and (expires_at is null or expires_at > now());

  if v_referral_code_id is null then
    return false;
  end if;

  insert into private.referral_events (
    referral_code_id,
    anonymous_session_id,
    event_type
  ) values (
    v_referral_code_id,
    p_session_id,
    'opened'
  ) on conflict do nothing;

  return true;
end;
$$;

revoke all on function public.record_referral_open(text, uuid) from public;
grant execute on function public.record_referral_open(text, uuid) to anon, authenticated;

create or replace function public.record_referral_milestone(
  p_session_id uuid,
  p_event_type text
)
returns boolean
language plpgsql
security definer
set search_path = public, private, extensions
as $$
declare
  v_referral_code_id uuid;
  v_user_id uuid := auth.uid();
begin
  if p_event_type not in ('started', 'phone_verified', 'submitted') then
    raise exception 'invalid referral event type';
  end if;

  select referral_code_id into v_referral_code_id
  from private.referral_events
  where anonymous_session_id = p_session_id
    and event_type = 'opened'
  order by occurred_at asc
  limit 1;

  if v_referral_code_id is null then
    return false;
  end if;

  if p_event_type in ('phone_verified', 'submitted') and v_user_id is null then
    return false;
  end if;

  insert into private.referral_events (
    referral_code_id,
    referred_user_id,
    anonymous_session_id,
    event_type
  ) values (
    v_referral_code_id,
    v_user_id,
    p_session_id,
    p_event_type
  ) on conflict do nothing;

  return true;
end;
$$;

revoke all on function public.record_referral_milestone(uuid, text) from public;
grant execute on function public.record_referral_milestone(uuid, text) to anon, authenticated;

create or replace function public.get_my_referral_conversion_count()
returns integer
language sql
security definer
stable
set search_path = public, private
as $$
  select count(distinct e.anonymous_session_id)::integer
  from public.referral_codes c
  join private.referral_events e on e.referral_code_id = c.id
  where c.owner_user_id = auth.uid()
    and e.event_type = 'submitted';
$$;

revoke all on function public.get_my_referral_conversion_count() from public;
grant execute on function public.get_my_referral_conversion_count() to authenticated;

create or replace function public.withdraw_communications_consent(
  p_locale text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_latest public.waitlist_consents%rowtype;
begin
  if v_user_id is null then
    raise exception 'authentication required';
  end if;

  if p_locale not in ('ar', 'en') then
    raise exception 'invalid locale';
  end if;

  select * into v_latest
  from public.waitlist_consents
  where user_id = v_user_id
    and consent_type = 'communications'
  order by recorded_at desc, id desc
  limit 1;

  if v_latest.id is null or v_latest.event_type = 'withdrawn' then
    return false;
  end if;

  insert into public.waitlist_consents (
    user_id,
    consent_type,
    event_type,
    document_version,
    document_sha256,
    locale,
    supersedes_id
  ) values (
    v_user_id,
    'communications',
    'withdrawn',
    v_latest.document_version,
    v_latest.document_sha256,
    p_locale,
    v_latest.id
  );

  return true;
end;
$$;

revoke all on function public.withdraw_communications_consent(text) from public;
grant execute on function public.withdraw_communications_consent(text) to authenticated;

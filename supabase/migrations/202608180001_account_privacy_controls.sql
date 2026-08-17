create or replace function public.set_communications_consent(
  p_enabled boolean,
  p_locale text
)
returns boolean
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_user_id uuid := auth.uid();
  v_latest public.waitlist_consents%rowtype;
  v_event public.consent_event_type := case when p_enabled then 'granted' else 'withdrawn' end;
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

  if v_latest.id is not null and v_latest.event_type = v_event then
    return false;
  end if;

  if v_latest.id is null and not p_enabled then
    return false;
  end if;

  insert into public.waitlist_consents (
    user_id,
    consent_type,
    event_type,
    document_version,
    document_sha256,
    locale,
    supersedes_id,
    recorded_at
  ) values (
    v_user_id,
    'communications',
    v_event,
    coalesce(v_latest.document_version, '2026-08-17.v1'),
    coalesce(
      v_latest.document_sha256,
      encode(digest('mithaq-communications-2026-08-17.v1', 'sha256'), 'hex')
    ),
    p_locale,
    v_latest.id,
    clock_timestamp()
  );

  return true;
end;
$$;

revoke all on function public.set_communications_consent(boolean, text) from public;
grant execute on function public.set_communications_consent(boolean, text) to authenticated;

create or replace function public.request_account_deletion(
  p_locale text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_request_id uuid;
  v_now timestamptz := now();
begin
  if v_user_id is null then
    raise exception 'authentication required';
  end if;

  if p_locale not in ('ar', 'en') then
    raise exception 'invalid locale';
  end if;

  select id into v_request_id
  from public.deletion_requests
  where user_id = v_user_id
    and request_scope = 'entire_account'
    and status in ('requested', 'identity_confirmed', 'in_progress')
  order by requested_at desc, id desc
  limit 1;

  if v_request_id is not null then
    return v_request_id;
  end if;

  update public.users
  set account_status = 'deletion_pending',
      preferred_locale = p_locale,
      updated_at = v_now
  where id = v_user_id;

  if not found then
    raise exception 'account not found';
  end if;

  update public.waitlist_applications
  set status = case when status = 'deleted' then status else 'withdrawn' end,
      updated_at = v_now
  where user_id = v_user_id;

  perform public.set_communications_consent(false, p_locale);

  insert into public.deletion_requests (
    user_id,
    request_scope,
    status,
    requested_at,
    due_at,
    user_visible_note_code
  ) values (
    v_user_id,
    'entire_account',
    'requested',
    v_now,
    v_now + interval '30 days',
    'account_deletion_requested'
  )
  returning id into v_request_id;

  return v_request_id;
end;
$$;

revoke all on function public.request_account_deletion(text) from public;
grant execute on function public.request_account_deletion(text) to authenticated;

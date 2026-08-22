create extension if not exists pg_net with schema extensions;
create extension if not exists pg_cron with schema pg_catalog;

create table private.member_push_settings (
  user_id uuid primary key references public.users(id) on delete cascade,
  push_enabled boolean not null default false,
  preview_mode text not null default 'neutral'
    check (preview_mode in ('neutral', 'detailed')),
  updated_at timestamptz not null default clock_timestamp()
);

create table private.member_push_devices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  installation_id text not null
    check (char_length(installation_id) between 12 and 120),
  expo_push_token text not null
    check (char_length(expo_push_token) between 20 and 320),
  platform text not null check (platform in ('ios', 'android')),
  is_active boolean not null default true,
  created_at timestamptz not null default clock_timestamp(),
  last_seen_at timestamptz not null default clock_timestamp(),
  revoked_at timestamptz,
  unique (user_id, installation_id),
  unique (expo_push_token),
  check (
    (is_active and revoked_at is null)
    or (not is_active and revoked_at is not null)
  )
);

create index member_push_devices_user_active_idx
  on private.member_push_devices (user_id, last_seen_at desc)
  where is_active;

create table private.member_push_deliveries (
  id uuid primary key default gen_random_uuid(),
  notification_id uuid not null references private.member_notifications(id) on delete cascade,
  device_id uuid not null references private.member_push_devices(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  status text not null default 'pending'
    check (status in ('pending', 'processing', 'sent', 'failed', 'suppressed')),
  attempts smallint not null default 0 check (attempts between 0 and 5),
  next_attempt_at timestamptz not null default clock_timestamp(),
  claimed_at timestamptz,
  sent_at timestamptz,
  last_error_code text check (
    last_error_code is null or char_length(last_error_code) <= 80
  ),
  created_at timestamptz not null default clock_timestamp(),
  unique (notification_id, device_id)
);

create index member_push_deliveries_pending_idx
  on private.member_push_deliveries (next_attempt_at, created_at, id)
  where status = 'pending';

create index member_push_deliveries_user_time_idx
  on private.member_push_deliveries (user_id, created_at desc);

create table private.push_worker_config (
  singleton boolean primary key default true check (singleton),
  endpoint_url text,
  worker_token text not null default encode(gen_random_bytes(32), 'hex'),
  enabled boolean not null default false,
  updated_at timestamptz not null default clock_timestamp(),
  check (endpoint_url is null or endpoint_url ~ '^https://[^[:space:]]+/functions/v1/push-notification-worker$')
);

insert into private.push_worker_config (singleton)
values (true)
on conflict (singleton) do nothing;

revoke all on table private.member_push_settings from public, anon, authenticated;
revoke all on table private.member_push_devices from public, anon, authenticated;
revoke all on table private.member_push_deliveries from public, anon, authenticated;
revoke all on table private.push_worker_config from public, anon, authenticated;

grant select, insert, update, delete on table private.member_push_settings to service_role;
grant select, insert, update, delete on table private.member_push_devices to service_role;
grant select, insert, update, delete on table private.member_push_deliveries to service_role;
grant select, insert, update, delete on table private.push_worker_config to service_role;

create or replace function private.enqueue_member_push_delivery()
returns trigger
language plpgsql
security definer
set search_path = public, private
as $$
begin
  if not exists (
    select 1
    from private.member_push_settings s
    join public.users u on u.id = s.user_id
    where s.user_id = new.user_id
      and s.push_enabled
      and u.account_status = 'active'
  ) then
    return new;
  end if;

  -- A rapid message burst should create one discreet lock-screen update, not
  -- a visible trail that reveals how actively somebody is using Mithaq.
  if new.kind = 'message_received'
     and exists (
       select 1
       from private.member_push_deliveries d
       join private.member_notifications previous
         on previous.id = d.notification_id
       where previous.user_id = new.user_id
         and previous.introduction_id = new.introduction_id
         and previous.kind = 'message_received'
         and d.created_at >= clock_timestamp() - interval '45 seconds'
         and d.status in ('pending', 'processing', 'sent')
     ) then
    return new;
  end if;

  insert into private.member_push_deliveries (
    notification_id,
    device_id,
    user_id,
    created_at,
    next_attempt_at
  )
  select
    new.id,
    device.id,
    new.user_id,
    new.created_at,
    clock_timestamp()
  from private.member_push_devices device
  where device.user_id = new.user_id
    and device.is_active
  on conflict do nothing;

  return new;
end;
$$;

create trigger member_notification_push_delivery
  after insert on private.member_notifications
  for each row execute function private.enqueue_member_push_delivery();

create or replace function public.get_my_push_notification_settings()
returns table (
  push_enabled boolean,
  preview_mode text,
  registered_device_count integer
)
language plpgsql
stable
security definer
set search_path = public, private
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

  return query
  select
    coalesce(settings.push_enabled, false),
    coalesce(settings.preview_mode, 'neutral'::text),
    (
      select count(*)::integer
      from private.member_push_devices device
      where device.user_id = v_user_id
        and device.is_active
    )
  from (select 1) anchor
  left join private.member_push_settings settings
    on settings.user_id = v_user_id;
end;
$$;

create or replace function public.set_my_push_notification_settings(
  p_push_enabled boolean,
  p_preview_mode text
)
returns table (
  push_enabled boolean,
  preview_mode text,
  registered_device_count integer
)
language plpgsql
security definer
set search_path = public, private
as $$
declare
  v_user_id uuid := auth.uid();
  v_mode text := lower(btrim(coalesce(p_preview_mode, '')));
begin
  if v_user_id is null then
    raise exception 'authentication required';
  end if;

  if p_push_enabled is null or v_mode not in ('neutral', 'detailed') then
    raise exception 'valid notification settings required';
  end if;

  if not exists (
    select 1
    from public.users u
    where u.id = v_user_id
      and u.account_status = 'active'
  ) then
    raise exception 'account unavailable';
  end if;

  insert into private.member_push_settings (
    user_id,
    push_enabled,
    preview_mode,
    updated_at
  ) values (
    v_user_id,
    p_push_enabled,
    v_mode,
    clock_timestamp()
  )
  on conflict (user_id) do update
  set push_enabled = excluded.push_enabled,
      preview_mode = excluded.preview_mode,
      updated_at = excluded.updated_at;

  if not p_push_enabled then
    update private.member_push_devices device
    set is_active = false,
        revoked_at = clock_timestamp(),
        last_seen_at = clock_timestamp()
    where device.user_id = v_user_id
      and device.is_active;

    update private.member_push_deliveries delivery
    set status = 'suppressed',
        last_error_code = 'push_disabled',
        claimed_at = null
    where delivery.user_id = v_user_id
      and delivery.status in ('pending', 'processing');
  end if;

  return query
  select * from public.get_my_push_notification_settings();
end;
$$;

create or replace function public.register_my_expo_push_device(
  p_installation_id text,
  p_expo_push_token text,
  p_platform text
)
returns uuid
language plpgsql
security definer
set search_path = public, private
as $$
declare
  v_user_id uuid := auth.uid();
  v_installation_id text := btrim(coalesce(p_installation_id, ''));
  v_token text := btrim(coalesce(p_expo_push_token, ''));
  v_platform text := lower(btrim(coalesce(p_platform, '')));
  v_device_id uuid;
begin
  if v_user_id is null then
    raise exception 'authentication required';
  end if;

  if v_installation_id !~ '^[A-Za-z0-9._:-]{12,120}$' then
    raise exception 'valid installation id required';
  end if;

  if v_token !~ '^(Expo|Exponent)PushToken\[[A-Za-z0-9_-]{10,256}\]$' then
    raise exception 'valid Expo push token required';
  end if;

  if v_platform not in ('ios', 'android') then
    raise exception 'valid push platform required';
  end if;

  if not exists (
    select 1
    from private.member_push_settings settings
    join public.users u on u.id = settings.user_id
    where settings.user_id = v_user_id
      and settings.push_enabled
      and u.account_status = 'active'
  ) then
    raise exception 'push notifications are not enabled';
  end if;

  delete from private.member_push_devices device
  where device.expo_push_token = v_token
    and (
      device.user_id <> v_user_id
      or device.installation_id <> v_installation_id
    );

  insert into private.member_push_devices (
    user_id,
    installation_id,
    expo_push_token,
    platform,
    is_active,
    created_at,
    last_seen_at,
    revoked_at
  ) values (
    v_user_id,
    v_installation_id,
    v_token,
    v_platform,
    true,
    clock_timestamp(),
    clock_timestamp(),
    null
  )
  on conflict (user_id, installation_id) do update
  set expo_push_token = excluded.expo_push_token,
      platform = excluded.platform,
      is_active = true,
      last_seen_at = clock_timestamp(),
      revoked_at = null
  returning id into v_device_id;

  return v_device_id;
end;
$$;

create or replace function public.unregister_my_push_device(
  p_installation_id text
)
returns boolean
language plpgsql
security definer
set search_path = private
as $$
declare
  v_user_id uuid := auth.uid();
  v_changed boolean := false;
begin
  if v_user_id is null then
    raise exception 'authentication required';
  end if;

  update private.member_push_devices device
  set is_active = false,
      revoked_at = clock_timestamp(),
      last_seen_at = clock_timestamp()
  where device.user_id = v_user_id
    and device.installation_id = btrim(coalesce(p_installation_id, ''))
    and device.is_active;

  v_changed := found;

  if v_changed then
    update private.member_push_deliveries delivery
    set status = 'suppressed',
        last_error_code = 'device_unregistered',
        claimed_at = null
    where delivery.device_id in (
      select device.id
      from private.member_push_devices device
      where device.user_id = v_user_id
        and device.installation_id = btrim(coalesce(p_installation_id, ''))
    )
      and delivery.status in ('pending', 'processing');
  end if;

  return v_changed;
end;
$$;

create or replace function private.push_worker_token_matches(p_worker_token text)
returns boolean
language sql
stable
security definer
set search_path = private
as $$
  select exists (
    select 1
    from private.push_worker_config config
    where config.singleton = true
      and config.enabled
      and config.worker_token = coalesce(p_worker_token, '')
  );
$$;

create or replace function public.claim_member_push_deliveries(
  p_worker_token text,
  p_limit integer default 100
)
returns table (
  delivery_id uuid,
  expo_push_token text,
  notification_kind text,
  introduction_id uuid,
  preview_mode text,
  preferred_locale text
)
language plpgsql
security definer
set search_path = public, private
as $$
begin
  if not private.push_worker_token_matches(p_worker_token) then
    raise exception 'push worker unauthorized';
  end if;

  if p_limit is null or p_limit < 1 or p_limit > 100 then
    raise exception 'push delivery limit must be between 1 and 100';
  end if;

  update private.member_push_deliveries delivery
  set status = 'suppressed',
      claimed_at = null,
      last_error_code = 'push_unavailable'
  where delivery.status in ('pending', 'processing')
    and (
      not exists (
        select 1
        from private.member_push_devices device
        where device.id = delivery.device_id
          and device.user_id = delivery.user_id
          and device.is_active
      )
      or not exists (
        select 1
        from private.member_push_settings settings
        where settings.user_id = delivery.user_id
          and settings.push_enabled
      )
      or not exists (
        select 1
        from public.users u
        where u.id = delivery.user_id
          and u.account_status = 'active'
      )
    );

  update private.member_push_deliveries delivery
  set status = 'pending',
      claimed_at = null,
      next_attempt_at = clock_timestamp(),
      last_error_code = 'stale_claim'
  where delivery.status = 'processing'
    and delivery.claimed_at < clock_timestamp() - interval '10 minutes'
    and delivery.attempts < 5;

  update private.member_push_deliveries delivery
  set status = 'failed',
      claimed_at = null,
      last_error_code = 'claim_exhausted'
  where delivery.status = 'processing'
    and delivery.claimed_at < clock_timestamp() - interval '10 minutes'
    and delivery.attempts >= 5;

  return query
  with candidates as (
    select delivery.id
    from private.member_push_deliveries delivery
    where delivery.status = 'pending'
      and delivery.next_attempt_at <= clock_timestamp()
      and delivery.attempts < 5
    order by delivery.created_at, delivery.id
    for update skip locked
    limit p_limit
  ), claimed as (
    update private.member_push_deliveries delivery
    set status = 'processing',
        attempts = delivery.attempts + 1,
        claimed_at = clock_timestamp(),
        last_error_code = null
    from candidates candidate
    where delivery.id = candidate.id
    returning
      delivery.id,
      delivery.device_id,
      delivery.notification_id,
      delivery.user_id
  )
  select
    claimed.id,
    device.expo_push_token,
    notification.kind,
    notification.introduction_id,
    coalesce(settings.preview_mode, 'neutral'::text),
    case when u.preferred_locale = 'en' then 'en'::text else 'ar'::text end
  from claimed
  join private.member_push_devices device
    on device.id = claimed.device_id
   and device.is_active
  join private.member_notifications notification
    on notification.id = claimed.notification_id
  join public.users u
    on u.id = claimed.user_id
   and u.account_status = 'active'
  left join private.member_push_settings settings
    on settings.user_id = claimed.user_id
  where coalesce(settings.push_enabled, false);
end;
$$;

create or replace function public.finish_member_push_delivery(
  p_worker_token text,
  p_delivery_id uuid,
  p_outcome text,
  p_error_code text default null
)
returns boolean
language plpgsql
security definer
set search_path = private
as $$
declare
  v_outcome text := lower(btrim(coalesce(p_outcome, '')));
  v_error text := left(nullif(btrim(coalesce(p_error_code, '')), ''), 80);
  v_attempts smallint;
  v_device_id uuid;
begin
  if not private.push_worker_token_matches(p_worker_token) then
    raise exception 'push worker unauthorized';
  end if;

  select delivery.attempts, delivery.device_id
  into v_attempts, v_device_id
  from private.member_push_deliveries delivery
  where delivery.id = p_delivery_id
    and delivery.status = 'processing'
  for update;

  if not found then
    return false;
  end if;

  if v_outcome = 'sent' then
    update private.member_push_deliveries
    set status = 'sent',
        sent_at = clock_timestamp(),
        claimed_at = null,
        last_error_code = null
    where id = p_delivery_id;
    return true;
  end if;

  if v_outcome = 'device_invalid' then
    update private.member_push_devices
    set is_active = false,
        revoked_at = clock_timestamp(),
        last_seen_at = clock_timestamp()
    where id = v_device_id
      and is_active;

    update private.member_push_deliveries
    set status = 'failed',
        claimed_at = null,
        last_error_code = coalesce(v_error, 'device_invalid')
    where id = p_delivery_id;
    return true;
  end if;

  if v_outcome = 'retry' and v_attempts < 5 then
    update private.member_push_deliveries
    set status = 'pending',
        claimed_at = null,
        next_attempt_at = clock_timestamp() + interval '2 minutes',
        last_error_code = coalesce(v_error, 'temporary_failure')
    where id = p_delivery_id;
    return true;
  end if;

  update private.member_push_deliveries
  set status = 'failed',
      claimed_at = null,
      last_error_code = coalesce(v_error, 'delivery_failed')
  where id = p_delivery_id;

  return true;
end;
$$;

create or replace function private.configure_push_worker(
  p_endpoint_url text,
  p_enabled boolean
)
returns boolean
language plpgsql
security definer
set search_path = private
as $$
declare
  v_endpoint text := nullif(btrim(coalesce(p_endpoint_url, '')), '');
begin
  if p_enabled is null then
    raise exception 'worker state required';
  end if;

  if p_enabled and (
    v_endpoint is null
    or v_endpoint !~ '^https://[^[:space:]]+/functions/v1/push-notification-worker$'
  ) then
    raise exception 'valid worker endpoint required';
  end if;

  update private.push_worker_config
  set endpoint_url = v_endpoint,
      enabled = p_enabled,
      updated_at = clock_timestamp()
  where singleton = true;

  return found;
end;
$$;

create or replace function private.invoke_push_worker()
returns bigint
language plpgsql
security definer
set search_path = private, net, pg_catalog
as $$
declare
  v_endpoint text;
  v_token text;
begin
  select config.endpoint_url, config.worker_token
  into v_endpoint, v_token
  from private.push_worker_config config
  where config.singleton = true
    and config.enabled;

  if v_endpoint is null or v_token is null then
    return null;
  end if;

  return net.http_post(
    url := v_endpoint,
    headers := jsonb_build_object(
      'content-type', 'application/json',
      'x-mithaq-worker-token', v_token
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 8000
  );
end;
$$;

revoke all on function private.enqueue_member_push_delivery() from public, anon, authenticated;
revoke all on function private.push_worker_token_matches(text) from public, anon, authenticated;
revoke all on function private.configure_push_worker(text, boolean) from public, anon, authenticated;
revoke all on function private.invoke_push_worker() from public, anon, authenticated;

grant execute on function private.configure_push_worker(text, boolean) to service_role;
grant execute on function private.invoke_push_worker() to service_role;

revoke all on function public.get_my_push_notification_settings() from public, anon;
revoke all on function public.set_my_push_notification_settings(boolean, text) from public, anon;
revoke all on function public.register_my_expo_push_device(text, text, text) from public, anon;
revoke all on function public.unregister_my_push_device(text) from public, anon;

grant execute on function public.get_my_push_notification_settings() to authenticated, service_role;
grant execute on function public.set_my_push_notification_settings(boolean, text) to authenticated, service_role;
grant execute on function public.register_my_expo_push_device(text, text, text) to authenticated, service_role;
grant execute on function public.unregister_my_push_device(text) to authenticated, service_role;

revoke all on function public.claim_member_push_deliveries(text, integer) from public, anon, authenticated;
revoke all on function public.finish_member_push_delivery(text, uuid, text, text) from public, anon, authenticated;
grant execute on function public.claim_member_push_deliveries(text, integer) to service_role;
grant execute on function public.finish_member_push_delivery(text, uuid, text, text) to service_role;

select cron.schedule(
  'mithaq-push-delivery-worker',
  '15 seconds',
  $$select private.invoke_push_worker();$$
);

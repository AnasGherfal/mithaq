begin;
select plan(8);

insert into auth.users (
  id,
  instance_id,
  aud,
  role,
  created_at,
  updated_at
) values (
  '33333333-3333-4333-8333-333333333333',
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  now(),
  now()
)
on conflict (id) do nothing;

insert into public.users (id)
values ('33333333-3333-4333-8333-333333333333')
on conflict (id) do nothing;

insert into public.waitlist_applications (
  id,
  user_id,
  status,
  gender,
  age_band_id,
  residency_type,
  current_country_code,
  current_city,
  marital_status,
  has_children,
  libyan_self_attestation,
  questionnaire_completed_at,
  submitted_at
) values (
  'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
  '33333333-3333-4333-8333-333333333333',
  'submitted',
  'man',
  2,
  'libya',
  'LY',
  'Tripoli',
  'never_married',
  false,
  true,
  now(),
  now()
);

insert into public.waitlist_consents (
  user_id,
  consent_type,
  event_type,
  document_version,
  document_sha256,
  locale
) values (
  '33333333-3333-4333-8333-333333333333',
  'communications',
  'granted',
  '2026-08-17.v1',
  repeat('b', 64),
  'en'
);

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '33333333-3333-4333-8333-333333333333',
  true
);

select ok(
  public.set_communications_consent(false, 'en'),
  'communications consent can be withdrawn'
);

select is(
  (
    select event_type::text
    from public.waitlist_consents
    where user_id = auth.uid()
      and consent_type = 'communications'
    order by recorded_at desc, id desc
    limit 1
  ),
  'withdrawn',
  'withdrawal is recorded as the latest consent event'
);

select is(
  public.set_communications_consent(false, 'en'),
  false,
  'repeating the same communications preference is idempotent'
);

select ok(
  public.set_communications_consent(true, 'ar'),
  'communications consent can be granted again'
);

select is(
  (
    select event_type::text
    from public.waitlist_consents
    where user_id = auth.uid()
      and consent_type = 'communications'
    order by recorded_at desc, id desc
    limit 1
  ),
  'granted',
  're-grant is recorded as the latest consent event'
);

select ok(
  public.request_account_deletion('ar') is not null,
  'authenticated user can request full account deletion'
);

select is(
  (
    select account_status::text
    from public.users
    where id = auth.uid()
  ),
  'deletion_pending',
  'account moves to deletion pending immediately'
);

select is(
  (
    select count(*)::integer
    from public.deletion_requests
    where user_id = auth.uid()
      and request_scope = 'entire_account'
      and status = 'requested'
  ),
  1,
  'account deletion request is stored exactly once'
);

select public.request_account_deletion('ar');

reset role;

select is(
  (
    select status::text
    from public.waitlist_applications
    where user_id = '33333333-3333-4333-8333-333333333333'
  ),
  'withdrawn',
  'deletion request withdraws the member from the waitlist'
);

select * from finish();
rollback;

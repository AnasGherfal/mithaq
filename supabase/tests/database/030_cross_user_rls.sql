begin;
select plan(8);

insert into auth.users (
  id,
  instance_id,
  aud,
  role,
  created_at,
  updated_at
) values
  (
    '11111111-1111-4111-8111-111111111111',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    now(),
    now()
  ),
  (
    '22222222-2222-4222-8222-222222222222',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    now(),
    now()
  )
on conflict (id) do nothing;

insert into public.users (id) values
  ('11111111-1111-4111-8111-111111111111'),
  ('22222222-2222-4222-8222-222222222222')
on conflict (id) do nothing;

insert into public.waitlist_applications (
  id,
  user_id,
  gender,
  age_band_id,
  residency_type,
  current_country_code,
  current_city,
  marital_status,
  has_children,
  libyan_self_attestation
) values
  (
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    '11111111-1111-4111-8111-111111111111',
    'man',
    2,
    'libya',
    'LY',
    'Tripoli',
    'never_married',
    false,
    true
  ),
  (
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    '22222222-2222-4222-8222-222222222222',
    'woman',
    2,
    'libya',
    'LY',
    'Benghazi',
    'never_married',
    false,
    true
  );

insert into public.waitlist_preferences (
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
  accepts_partner_with_children
) values
  (
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    '6_to_12_months',
    true,
    'after_mutual_interest',
    'after_initial_interest',
    'depends',
    true,
    true,
    22,
    35,
    'depends'
  ),
  (
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    '6_to_12_months',
    true,
    'after_mutual_interest',
    'after_initial_interest',
    'depends',
    true,
    true,
    24,
    38,
    'depends'
  );

insert into public.waitlist_consents (
  user_id,
  consent_type,
  event_type,
  document_version,
  document_sha256,
  locale
) values (
  '22222222-2222-4222-8222-222222222222',
  'privacy',
  'granted',
  'test-v1',
  repeat('a', 64),
  'ar'
);

insert into public.referral_codes (owner_user_id, code) values
  ('11111111-1111-4111-8111-111111111111', 'USERA123'),
  ('22222222-2222-4222-8222-222222222222', 'USERB123');

insert into public.deletion_requests (user_id, request_scope) values (
  '22222222-2222-4222-8222-222222222222',
  'waitlist_data'
);

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '11111111-1111-4111-8111-111111111111',
  true
);

select is(
  (select count(*)::integer from public.users),
  1,
  'user A can read only their own user row'
);

select is(
  (select count(*)::integer from public.waitlist_applications),
  1,
  'user A can read only their own application'
);

select is(
  (select count(*)::integer from public.waitlist_preferences),
  1,
  'user A can read only their own preferences'
);

select is(
  (select count(*)::integer from public.waitlist_consents),
  0,
  'user A cannot read user B consent history'
);

select is(
  (select count(*)::integer from public.referral_codes),
  1,
  'user A cannot read user B referral code'
);

select is(
  (select count(*)::integer from public.deletion_requests),
  0,
  'user A cannot read user B deletion request'
);

update public.waitlist_applications
set current_city = 'Hidden change'
where user_id = '22222222-2222-4222-8222-222222222222';

reset role;

select is(
  (
    select current_city
    from public.waitlist_applications
    where user_id = '22222222-2222-4222-8222-222222222222'
  ),
  'Benghazi',
  'user A cannot update user B application'
);

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '11111111-1111-4111-8111-111111111111',
  true
);

update public.waitlist_preferences
set preferred_partner_age_max = 99
where application_id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

reset role;

select is(
  (
    select preferred_partner_age_max
    from public.waitlist_preferences
    where application_id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
  ),
  38::smallint,
  'user A cannot update user B preferences'
);

select * from finish();
rollback;

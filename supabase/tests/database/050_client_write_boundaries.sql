begin;
select plan(8);

select is(
  has_column_privilege('authenticated', 'public.users', 'account_status', 'UPDATE'),
  false,
  'clients cannot change account lifecycle status'
);

select is(
  has_column_privilege('authenticated', 'public.users', 'preferred_locale', 'UPDATE'),
  true,
  'clients can update their account language'
);

select is(
  has_column_privilege('authenticated', 'public.waitlist_applications', 'status', 'UPDATE'),
  false,
  'clients cannot self-promote waitlist status'
);

select is(
  has_column_privilege('authenticated', 'public.waitlist_applications', 'current_city', 'UPDATE'),
  true,
  'clients can still edit questionnaire content'
);

select is(
  has_table_privilege('authenticated', 'public.waitlist_consents', 'INSERT'),
  false,
  'consent audit events can only be written through server functions'
);

select is(
  has_table_privilege('authenticated', 'public.deletion_requests', 'INSERT'),
  false,
  'deletion requests can only be created through the guarded server function'
);

select is(
  has_column_privilege('authenticated', 'public.waitlist_applications', 'submitted_at', 'UPDATE'),
  false,
  'clients cannot forge submission timestamps'
);

insert into auth.users (
  id,
  instance_id,
  aud,
  role,
  created_at,
  updated_at
) values (
  '44444444-4444-4444-8444-444444444444',
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  now(),
  now()
)
on conflict (id) do nothing;

insert into public.users (id, account_status)
values ('44444444-4444-4444-8444-444444444444', 'deletion_pending')
on conflict (id) do update set account_status = excluded.account_status;

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
) values (
  'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
  '44444444-4444-4444-8444-444444444444',
  'man',
  2,
  'libya',
  'LY',
  'Tripoli',
  'never_married',
  false,
  true
);

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '44444444-4444-4444-8444-444444444444',
  true
);

update public.waitlist_applications
set current_city = 'Benghazi'
where user_id = auth.uid();

reset role;

select is(
  (
    select current_city
    from public.waitlist_applications
    where user_id = '44444444-4444-4444-8444-444444444444'
  ),
  'Tripoli',
  'deletion-pending accounts cannot resume questionnaire writes through the API'
);

select * from finish();
rollback;

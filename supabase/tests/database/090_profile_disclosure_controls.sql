begin;
select plan(10);

select is(
  has_function_privilege(
    'authenticated',
    'public.set_profile_disclosure_preferences(boolean, boolean, boolean)',
    'EXECUTE'
  ),
  true,
  'authenticated members can manage profile disclosure preferences'
);

select is(
  has_function_privilege(
    'anon',
    'public.set_profile_disclosure_preferences(boolean, boolean, boolean)',
    'EXECUTE'
  ),
  false,
  'anonymous clients cannot manage profile disclosure preferences'
);

insert into auth.users (
  id,
  instance_id,
  aud,
  role,
  created_at,
  updated_at
) values
  (
    '99999999-9999-4999-8999-999999999991',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    now(),
    now()
  ),
  (
    '99999999-9999-4999-8999-999999999992',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    now(),
    now()
  )
on conflict (id) do nothing;

insert into public.users (id)
values
  ('99999999-9999-4999-8999-999999999991'),
  ('99999999-9999-4999-8999-999999999992')
on conflict (id) do nothing;

insert into public.waitlist_applications (
  id,
  user_id,
  status,
  gender,
  age_band_id,
  current_country_code,
  current_city,
  libyan_origin_region,
  marital_status,
  has_children,
  questionnaire_completed_at,
  submitted_at
) values
  (
    'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee1',
    '99999999-9999-4999-8999-999999999991',
    'submitted',
    'man',
    2,
    'LY',
    'Tripoli',
    'Tripolitania',
    'never_married',
    false,
    now(),
    now()
  ),
  (
    'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee2',
    '99999999-9999-4999-8999-999999999992',
    'submitted',
    'woman',
    2,
    'LY',
    'Benghazi',
    'Cyrenaica',
    'never_married',
    false,
    now(),
    now()
  );

insert into public.member_profiles (
  user_id,
  display_name,
  about_me,
  occupation,
  education,
  profile_completed_at
) values
  (
    '99999999-9999-4999-8999-999999999991',
    'Omar',
    'I value family, responsibility, kindness, and a serious path toward marriage.',
    'Engineer',
    'University',
    now()
  ),
  (
    '99999999-9999-4999-8999-999999999992',
    'Sara',
    'This draft profile intentionally remains incomplete for disclosure gate testing.',
    'Doctor',
    'University',
    null
  );

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '99999999-9999-4999-8999-999999999991',
  true
);

select is(
  (select occupation from public.get_own_introduction_preview()),
  null,
  'occupation is private by default'
);

select is(
  (select education from public.get_own_introduction_preview()),
  null,
  'education is private by default'
);

select is(
  (select origin_region from public.get_own_introduction_preview()),
  null,
  'origin region is private by default'
);

select is(
  (
    select row(share_occupation, share_education, share_origin_region)::text
    from public.set_profile_disclosure_preferences(true, false, true)
  ),
  '(t,f,t)',
  'the member can opt individual optional fields into disclosure'
);

select is(
  (select occupation from public.get_own_introduction_preview()),
  'Engineer',
  'opted-in occupation is included in the server-controlled preview'
);

select is(
  (select education from public.get_own_introduction_preview()),
  null,
  'education remains hidden when not opted in'
);

select is(
  (select origin_region from public.get_own_introduction_preview()),
  'Tripolitania',
  'opted-in origin region is included in the server-controlled preview'
);

select set_config(
  'request.jwt.claim.sub',
  '99999999-9999-4999-8999-999999999992',
  true
);

select throws_ok(
  $$select * from public.set_profile_disclosure_preferences(true, true, true)$$,
  'P0001',
  'complete profile required',
  'an incomplete profile cannot configure introduction disclosure'
);

reset role;
select * from finish();
rollback;

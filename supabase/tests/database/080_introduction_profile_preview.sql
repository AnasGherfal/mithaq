begin;
select plan(7);

select is(
  has_function_privilege(
    'authenticated',
    'public.get_own_introduction_preview()',
    'EXECUTE'
  ),
  true,
  'authenticated members can request their own introduction preview'
);

select is(
  has_function_privilege(
    'anon',
    'public.get_own_introduction_preview()',
    'EXECUTE'
  ),
  false,
  'anonymous clients cannot request an introduction preview'
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
    '88888888-8888-4888-8888-888888888881',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    now(),
    now()
  ),
  (
    '88888888-8888-4888-8888-888888888882',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    now(),
    now()
  ),
  (
    '88888888-8888-4888-8888-888888888883',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    now(),
    now()
  )
on conflict (id) do nothing;

insert into public.users (id)
values
  ('88888888-8888-4888-8888-888888888881'),
  ('88888888-8888-4888-8888-888888888882'),
  ('88888888-8888-4888-8888-888888888883')
on conflict (id) do nothing;

insert into public.waitlist_applications (
  id,
  user_id,
  status,
  gender,
  age_band_id,
  current_country_code,
  current_city,
  marital_status,
  has_children,
  questionnaire_completed_at,
  submitted_at
) values
  (
    'ffffffff-ffff-4fff-8fff-fffffffffff1',
    '88888888-8888-4888-8888-888888888881',
    'submitted',
    'man',
    2,
    'LY',
    'Tripoli',
    'never_married',
    false,
    now(),
    now()
  ),
  (
    'ffffffff-ffff-4fff-8fff-fffffffffff2',
    '88888888-8888-4888-8888-888888888882',
    'submitted',
    'woman',
    2,
    'LY',
    'Benghazi',
    'never_married',
    false,
    now(),
    now()
  ),
  (
    'ffffffff-ffff-4fff-8fff-fffffffffff3',
    '88888888-8888-4888-8888-888888888883',
    'draft',
    'man',
    3,
    'LY',
    'Misrata',
    'never_married',
    false,
    now(),
    null
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
    '88888888-8888-4888-8888-888888888881',
    'Omar',
    'I value family, responsibility, kindness, and a serious path toward marriage.',
    'Engineer',
    'University',
    now()
  ),
  (
    '88888888-8888-4888-8888-888888888882',
    'Sara',
    'I value family, respect, clarity, and building a peaceful marriage with intention.',
    'Doctor',
    'University',
    now()
  ),
  (
    '88888888-8888-4888-8888-888888888883',
    'Ali',
    'This completed-looking profile must still stay unavailable before waitlist submission.',
    null,
    null,
    now()
  );

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '88888888-8888-4888-8888-888888888881',
  true
);

select is(
  (select count(*)::integer from public.get_own_introduction_preview()),
  1,
  'an eligible member receives exactly one self-preview row'
);

select is(
  (select display_name from public.get_own_introduction_preview()),
  'Omar',
  'the preview contains the authenticated member profile'
);

select is(
  (
    select count(*)::integer
    from public.get_own_introduction_preview()
    where display_name = 'Sara'
  ),
  0,
  'the self-preview cannot return another member profile'
);

reset role;

update public.users
set account_status = 'deletion_pending'
where id = '88888888-8888-4888-8888-888888888882';

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '88888888-8888-4888-8888-888888888882',
  true
);

select throws_ok(
  $$select * from public.get_own_introduction_preview()$$,
  'P0001',
  'account unavailable',
  'deletion-pending members cannot retrieve the introduction preview'
);

select set_config(
  'request.jwt.claim.sub',
  '88888888-8888-4888-8888-888888888883',
  true
);

select throws_ok(
  $$select * from public.get_own_introduction_preview()$$,
  'P0001',
  'profile preview unavailable',
  'pre-submission members cannot retrieve an introduction preview'
);

reset role;
select * from finish();
rollback;

begin;
select plan(28);

select is(
  has_function_privilege(
    'authenticated',
    'public.create_controlled_introduction(uuid, uuid, timestamptz, text)',
    'EXECUTE'
  ),
  false,
  'members cannot create introductions directly'
);

select is(
  has_function_privilege(
    'service_role',
    'public.create_controlled_introduction(uuid, uuid, timestamptz, text)',
    'EXECUTE'
  ),
  true,
  'trusted matching services can create controlled introductions'
);

select is(
  has_function_privilege('authenticated', 'public.list_my_introductions()', 'EXECUTE'),
  true,
  'members can list their own controlled introductions through the guarded RPC'
);

select is(
  has_function_privilege('authenticated', 'public.get_introduction_preview(uuid)', 'EXECUTE'),
  true,
  'members can request a server-whitelisted counterpart preview'
);

select is(
  has_function_privilege('authenticated', 'public.respond_to_introduction(uuid, boolean)', 'EXECUTE'),
  true,
  'members can respond through the introduction state machine'
);

select is(
  has_table_privilege('authenticated', 'private.controlled_introductions', 'SELECT'),
  false,
  'members cannot read the raw introduction table'
);

select is(
  has_table_privilege('authenticated', 'private.controlled_introduction_events', 'SELECT'),
  false,
  'members cannot read private introduction audit events'
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
    '17171717-1717-4717-8717-171717171711',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    now(),
    now()
  ),
  (
    '17171717-1717-4717-8717-171717171712',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    now(),
    now()
  ),
  (
    '17171717-1717-4717-8717-171717171713',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    now(),
    now()
  ),
  (
    '17171717-1717-4717-8717-171717171714',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    now(),
    now()
  )
on conflict (id) do nothing;

insert into public.users (id)
values
  ('17171717-1717-4717-8717-171717171711'),
  ('17171717-1717-4717-8717-171717171712'),
  ('17171717-1717-4717-8717-171717171713'),
  ('17171717-1717-4717-8717-171717171714')
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
  libyan_origin_region,
  marital_status,
  has_children,
  questionnaire_completed_at,
  submitted_at
) values
  (
    '17171717-aaaa-4aaa-8aaa-171717171711',
    '17171717-1717-4717-8717-171717171711',
    'submitted',
    'man',
    2,
    'libya',
    'LY',
    'Tripoli',
    'Tripoli',
    'never_married',
    false,
    now(),
    now()
  ),
  (
    '17171717-bbbb-4bbb-8bbb-171717171712',
    '17171717-1717-4717-8717-171717171712',
    'submitted',
    'woman',
    2,
    'libya',
    'LY',
    'Benghazi',
    'Benghazi',
    'never_married',
    false,
    now(),
    now()
  ),
  (
    '17171717-cccc-4ccc-8ccc-171717171713',
    '17171717-1717-4717-8717-171717171713',
    'submitted',
    'woman',
    3,
    'libya',
    'LY',
    'Misrata',
    'Misrata',
    'never_married',
    false,
    now(),
    now()
  ),
  (
    '17171717-dddd-4ddd-8ddd-171717171714',
    '17171717-1717-4717-8717-171717171714',
    'submitted',
    'man',
    3,
    'libya',
    'LY',
    'Zawiya',
    'Zawiya',
    'never_married',
    false,
    now(),
    now()
  );

insert into public.waitlist_preferences (
  application_id,
  open_to_libya,
  open_to_diaspora,
  preferred_partner_age_min,
  preferred_partner_age_max,
  accepts_partner_with_children
) values
  ('17171717-aaaa-4aaa-8aaa-171717171711', true, true, 18, 60, 'depends'),
  ('17171717-bbbb-4bbb-8bbb-171717171712', true, true, 18, 60, 'depends'),
  ('17171717-cccc-4ccc-8ccc-171717171713', true, true, 18, 60, 'depends'),
  ('17171717-dddd-4ddd-8ddd-171717171714', true, true, 18, 60, 'depends');

insert into public.member_profiles (
  user_id,
  display_name,
  about_me,
  occupation,
  education,
  profile_completed_at,
  share_occupation,
  share_education,
  share_origin_region
) values
  (
    '17171717-1717-4717-8717-171717171711',
    'Omar',
    'I value family, responsibility, kindness, and a serious path toward marriage.',
    'Engineer',
    'University',
    now(),
    false,
    false,
    false
  ),
  (
    '17171717-1717-4717-8717-171717171712',
    'Sara',
    'I value family, respect, clarity, and building a peaceful marriage with intention.',
    'Doctor',
    'University',
    now(),
    false,
    true,
    false
  ),
  (
    '17171717-1717-4717-8717-171717171713',
    'Mariam',
    'I value faith, family, respect, and a calm serious approach to marriage.',
    'Teacher',
    'University',
    now(),
    true,
    false,
    true
  ),
  (
    '17171717-1717-4717-8717-171717171714',
    'Ali',
    'This complete profile intentionally remains unapproved for participation testing.',
    null,
    null,
    now(),
    false,
    false,
    false
  );

set local role service_role;

select public.set_member_profile_review_state(
  '17171717-1717-4717-8717-171717171711',
  'approved'::public.member_profile_review_state,
  'm6_test_approved',
  'm6-test',
  null
);
select public.set_member_profile_review_state(
  '17171717-1717-4717-8717-171717171712',
  'approved'::public.member_profile_review_state,
  'm6_test_approved',
  'm6-test',
  null
);
select public.set_member_profile_review_state(
  '17171717-1717-4717-8717-171717171713',
  'approved'::public.member_profile_review_state,
  'm6_test_approved',
  'm6-test',
  null
);

select is(
  private.member_can_participate('17171717-1717-4717-8717-171717171711'),
  true,
  'first member satisfies the centralized participation gate'
);

select is(
  private.member_can_participate('17171717-1717-4717-8717-171717171712'),
  true,
  'second member satisfies the centralized participation gate'
);

select throws_ok(
  $$select public.create_controlled_introduction(
    '17171717-1717-4717-8717-171717171711',
    '17171717-1717-4717-8717-171717171714',
    null,
    'm6-test'
  )$$,
  'P0001',
  'member not eligible for introduction',
  'an unapproved member cannot be introduced'
);

create temporary table m6_intro_ids (
  name text primary key,
  id uuid not null
) on commit drop;

insert into m6_intro_ids (name, id)
select 'mutual', public.create_controlled_introduction(
  '17171717-1717-4717-8717-171717171711',
  '17171717-1717-4717-8717-171717171712',
  clock_timestamp() + interval '7 days',
  'm6-test'
);

select is(
  (
    select status
    from private.controlled_introductions
    where id = (select id from m6_intro_ids where name = 'mutual')
  ),
  'offered'::public.introduction_status,
  'trusted matching creates an offered introduction'
);

select is(
  (
    select count(*)::integer
    from private.controlled_introduction_events
    where introduction_id = (select id from m6_intro_ids where name = 'mutual')
      and event_type = 'created'
  ),
  1,
  'introduction creation is auditable'
);

select throws_ok(
  $$select public.create_controlled_introduction(
    '17171717-1717-4717-8717-171717171712',
    '17171717-1717-4717-8717-171717171711',
    null,
    'm6-test'
  )$$,
  'P0001',
  'active introduction already exists',
  'the same active pair cannot be introduced twice in reverse order'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '17171717-1717-4717-8717-171717171711', true);

select is(
  (
    select count(*)::integer
    from public.list_my_introductions()
    where introduction_id = (select id from m6_intro_ids where name = 'mutual')
  ),
  1,
  'a participant can list the introduction through the guarded RPC'
);

select is(
  (
    select display_name
    from public.get_introduction_preview((select id from m6_intro_ids where name = 'mutual'))
  ),
  'Sara',
  'the first participant sees only the counterpart introduction preview'
);

select is(
  (
    select occupation
    from public.get_introduction_preview((select id from m6_intro_ids where name = 'mutual'))
  ),
  null,
  'counterpart occupation stays hidden when disclosure is off'
);

select is(
  (
    select education
    from public.get_introduction_preview((select id from m6_intro_ids where name = 'mutual'))
  ),
  'University',
  'counterpart education is disclosed only because that member opted in'
);

select is(
  public.respond_to_introduction((select id from m6_intro_ids where name = 'mutual'), true),
  'offered'::public.introduction_status,
  'one acceptance keeps the introduction offered without revealing the other decision'
);

select is(
  (
    select my_decision
    from public.list_my_introductions()
    where introduction_id = (select id from m6_intro_ids where name = 'mutual')
  ),
  'accepted'::public.introduction_decision,
  'the member can see their own accepted decision'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '17171717-1717-4717-8717-171717171713', true);

select throws_ok(
  $$select * from public.get_introduction_preview((select id from m6_intro_ids where name = 'mutual'))$$,
  'P0001',
  'introduction unavailable',
  'a non-participant cannot inspect a private introduction preview'
);

select throws_ok(
  $$select public.respond_to_introduction((select id from m6_intro_ids where name = 'mutual'), true)$$,
  'P0001',
  'introduction unavailable',
  'a non-participant cannot respond to another pair introduction'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '17171717-1717-4717-8717-171717171712', true);

select is(
  public.respond_to_introduction((select id from m6_intro_ids where name = 'mutual'), true),
  'mutually_accepted'::public.introduction_status,
  'the second acceptance transitions the pair to mutually accepted'
);

reset role;
set local role service_role;

select is(
  (
    select status
    from private.controlled_introductions
    where id = (select id from m6_intro_ids where name = 'mutual')
  ),
  'mutually_accepted'::public.introduction_status,
  'mutual acceptance is persisted server-side'
);

select is(
  (
    select count(*)::integer
    from private.controlled_introduction_events
    where introduction_id = (select id from m6_intro_ids where name = 'mutual')
      and event_type = 'accepted'
  ),
  2,
  'both member acceptances are present in the private audit trail'
);

select is(
  (
    select count(*)::integer
    from private.controlled_introduction_events
    where introduction_id = (select id from m6_intro_ids where name = 'mutual')
      and event_type = 'mutually_accepted'
  ),
  1,
  'the mutual transition is recorded exactly once'
);

select is(
  public.close_controlled_introduction(
    (select id from m6_intro_ids where name = 'mutual'),
    'm6-test-close'
  ),
  true,
  'trusted services can close a mutually accepted introduction'
);

insert into m6_intro_ids (name, id)
select 'blocked', public.create_controlled_introduction(
  '17171717-1717-4717-8717-171717171711',
  '17171717-1717-4717-8717-171717171713',
  clock_timestamp() + interval '7 days',
  'm6-test'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '17171717-1717-4717-8717-171717171711', true);
select public.block_member('17171717-1717-4717-8717-171717171713');

reset role;
set local role service_role;

select is(
  (
    select status
    from private.controlled_introductions
    where id = (select id from m6_intro_ids where name = 'blocked')
  ),
  'cancelled'::public.introduction_status,
  'blocking a member immediately cancels an active introduction between the pair'
);

select throws_ok(
  $$select public.create_controlled_introduction(
    '17171717-1717-4717-8717-171717171711',
    '17171717-1717-4717-8717-171717171713',
    null,
    'm6-test'
  )$$,
  'P0001',
  'introduction pair blocked',
  'a blocked pair cannot be reintroduced by the matching service'
);

select * from finish();
rollback;

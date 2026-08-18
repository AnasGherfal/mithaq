begin;
select plan(26);

select is(
  has_function_privilege('authenticated', 'private.member_accepts_partner(uuid, uuid)', 'EXECUTE'),
  false,
  'members cannot invoke the internal one-way partner acceptance helper'
);

select is(
  has_function_privilege('authenticated', 'private.members_match_hard_constraints(uuid, uuid)', 'EXECUTE'),
  false,
  'members cannot invoke the internal symmetric hard-match helper'
);

select is(
  has_function_privilege('authenticated', 'public.get_hard_match_candidates(uuid, integer)', 'EXECUTE'),
  false,
  'members cannot enumerate raw matching candidates'
);

select is(
  has_function_privilege('service_role', 'public.get_hard_match_candidates(uuid, integer)', 'EXECUTE'),
  true,
  'trusted matching services can request hard-eligible candidates'
);

insert into auth.users (
  id,
  instance_id,
  aud,
  role,
  created_at,
  updated_at
) values
  ('18181818-1818-4818-8818-181818181811', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', now(), now()),
  ('18181818-1818-4818-8818-181818181812', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', now(), now()),
  ('18181818-1818-4818-8818-181818181813', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', now(), now()),
  ('18181818-1818-4818-8818-181818181814', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', now(), now()),
  ('18181818-1818-4818-8818-181818181815', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', now(), now())
on conflict (id) do nothing;

insert into public.users (id)
values
  ('18181818-1818-4818-8818-181818181811'),
  ('18181818-1818-4818-8818-181818181812'),
  ('18181818-1818-4818-8818-181818181813'),
  ('18181818-1818-4818-8818-181818181814'),
  ('18181818-1818-4818-8818-181818181815')
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
  questionnaire_completed_at,
  submitted_at
) values
  ('18181818-aaaa-4aaa-8aaa-181818181811', '18181818-1818-4818-8818-181818181811', 'submitted', 'man', 2, 'libya', 'LY', 'Tripoli', 'never_married', false, now(), now() - interval '5 days'),
  ('18181818-bbbb-4bbb-8bbb-181818181812', '18181818-1818-4818-8818-181818181812', 'submitted', 'woman', 2, 'libya', 'LY', 'Benghazi', 'never_married', false, now(), now() - interval '4 days'),
  ('18181818-cccc-4ccc-8ccc-181818181813', '18181818-1818-4818-8818-181818181813', 'submitted', 'woman', 5, 'diaspora', 'GB', 'London', 'divorced', true, now(), now() - interval '3 days'),
  ('18181818-dddd-4ddd-8ddd-181818181814', '18181818-1818-4818-8818-181818181814', 'submitted', 'man', 2, 'libya', 'LY', 'Misrata', 'never_married', false, now(), now() - interval '2 days'),
  ('18181818-eeee-4eee-8eee-181818181815', '18181818-1818-4818-8818-181818181815', 'submitted', 'woman', 2, 'libya', 'LY', 'Zawiya', 'never_married', false, now(), now() - interval '1 day');

insert into public.waitlist_preferences (
  application_id,
  open_to_libya,
  open_to_diaspora,
  preferred_partner_age_min,
  preferred_partner_age_max,
  accepts_partner_with_children
) values
  ('18181818-aaaa-4aaa-8aaa-181818181811', true, false, 24, 35, 'no'),
  ('18181818-bbbb-4bbb-8bbb-181818181812', true, false, 24, 35, 'yes'),
  ('18181818-cccc-4ccc-8ccc-181818181813', true, true, 18, 60, 'yes'),
  ('18181818-dddd-4ddd-8ddd-181818181814', true, true, 18, 60, 'yes'),
  ('18181818-eeee-4eee-8eee-181818181815', true, false, 24, 35, 'yes');

insert into public.member_profiles (
  user_id,
  display_name,
  about_me,
  profile_completed_at
) values
  ('18181818-1818-4818-8818-181818181811', 'A', 'A serious member profile that is complete enough for controlled matching tests.', now()),
  ('18181818-1818-4818-8818-181818181812', 'B', 'A serious member profile that is complete enough for controlled matching tests.', now()),
  ('18181818-1818-4818-8818-181818181813', 'C', 'A serious member profile that is complete enough for controlled matching tests.', now()),
  ('18181818-1818-4818-8818-181818181814', 'D', 'A serious member profile that is complete enough for controlled matching tests.', now()),
  ('18181818-1818-4818-8818-181818181815', 'E', 'A serious member profile that is complete enough for controlled matching tests.', now());

set local role service_role;

select public.set_member_profile_review_state('18181818-1818-4818-8818-181818181811', 'approved', 'm6', 'matching-test', null);
select public.set_member_profile_review_state('18181818-1818-4818-8818-181818181812', 'approved', 'm6', 'matching-test', null);
select public.set_member_profile_review_state('18181818-1818-4818-8818-181818181813', 'approved', 'm6', 'matching-test', null);
select public.set_member_profile_review_state('18181818-1818-4818-8818-181818181814', 'approved', 'm6', 'matching-test', null);
select public.set_member_profile_review_state('18181818-1818-4818-8818-181818181815', 'approved', 'm6', 'matching-test', null);

select is(
  private.member_accepts_partner('18181818-1818-4818-8818-181818181811', '18181818-1818-4818-8818-181818181812'),
  true,
  'a member accepts a compatible opposite-gender local partner in the requested age range'
);

select is(
  private.member_accepts_partner('18181818-1818-4818-8818-181818181812', '18181818-1818-4818-8818-181818181811'),
  true,
  'the compatible partner accepts back under her own hard constraints'
);

select is(
  private.members_match_hard_constraints('18181818-1818-4818-8818-181818181811', '18181818-1818-4818-8818-181818181812'),
  true,
  'symmetric hard matching succeeds only when both members accept each other'
);

select is(
  private.member_accepts_partner('18181818-1818-4818-8818-181818181811', '18181818-1818-4818-8818-181818181814'),
  false,
  'same-gender candidates fail the hard gender constraint'
);

select is(
  private.member_accepts_partner('18181818-1818-4818-8818-181818181811', '18181818-1818-4818-8818-181818181813'),
  false,
  'diaspora candidates fail when the member is not open to diaspora'
);

update public.waitlist_preferences
set open_to_diaspora = true
where application_id = '18181818-aaaa-4aaa-8aaa-181818181811';

select is(
  private.member_accepts_partner('18181818-1818-4818-8818-181818181811', '18181818-1818-4818-8818-181818181813'),
  false,
  'opening diaspora alone does not bypass an incompatible age band'
);

update public.waitlist_preferences
set preferred_partner_age_max = 50
where application_id = '18181818-aaaa-4aaa-8aaa-181818181811';

select is(
  private.member_accepts_partner('18181818-1818-4818-8818-181818181811', '18181818-1818-4818-8818-181818181813'),
  false,
  'a partner with children is rejected when the member explicitly selected no'
);

update public.waitlist_preferences
set accepts_partner_with_children = 'depends'
where application_id = '18181818-aaaa-4aaa-8aaa-181818181811';

select is(
  private.member_accepts_partner('18181818-1818-4818-8818-181818181811', '18181818-1818-4818-8818-181818181813'),
  true,
  'depends permits a partner with children when the other hard constraints pass'
);

insert into public.waitlist_accepted_marital_statuses (application_id, marital_status)
values ('18181818-aaaa-4aaa-8aaa-181818181811', 'never_married');

select is(
  private.member_accepts_partner('18181818-1818-4818-8818-181818181811', '18181818-1818-4818-8818-181818181813'),
  false,
  'configured accepted marital statuses exclude a non-selected status'
);

insert into public.waitlist_accepted_marital_statuses (application_id, marital_status)
values ('18181818-aaaa-4aaa-8aaa-181818181811', 'divorced');

select is(
  private.member_accepts_partner('18181818-1818-4818-8818-181818181811', '18181818-1818-4818-8818-181818181813'),
  true,
  'adding the partner marital status restores one-way acceptance'
);

insert into public.waitlist_preferred_countries (application_id, country_code)
values ('18181818-aaaa-4aaa-8aaa-181818181811', 'LY');

select is(
  private.member_accepts_partner('18181818-1818-4818-8818-181818181811', '18181818-1818-4818-8818-181818181813'),
  false,
  'a preferred-country list excludes candidates outside the configured countries'
);

insert into public.waitlist_preferred_countries (application_id, country_code)
values ('18181818-aaaa-4aaa-8aaa-181818181811', 'GB');

select is(
  private.member_accepts_partner('18181818-1818-4818-8818-181818181811', '18181818-1818-4818-8818-181818181813'),
  true,
  'adding the partner country restores one-way country eligibility'
);

select is(
  private.members_match_hard_constraints('18181818-1818-4818-8818-181818181811', '18181818-1818-4818-8818-181818181813'),
  false,
  'one-way acceptance is not enough when the partner constraints do not accept back'
);

select is(
  (
    select count(*)::integer
    from public.get_hard_match_candidates('18181818-1818-4818-8818-181818181811', 20)
    where candidate_user_id = '18181818-1818-4818-8818-181818181812'
  ),
  1,
  'the candidate query includes a fully compatible member'
);

select is(
  (
    select count(*)::integer
    from public.get_hard_match_candidates('18181818-1818-4818-8818-181818181811', 20)
    where candidate_user_id = '18181818-1818-4818-8818-181818181814'
  ),
  0,
  'the candidate query excludes same-gender members'
);

select throws_ok(
  $$select * from public.get_hard_match_candidates('18181818-1818-4818-8818-181818181811', 0)$$,
  'P0001',
  'candidate limit must be between 1 and 100',
  'candidate enumeration rejects a zero limit'
);

select throws_ok(
  $$select * from public.get_hard_match_candidates('18181818-1818-4818-8818-181818181811', 101)$$,
  'P0001',
  'candidate limit must be between 1 and 100',
  'candidate enumeration rejects an excessive limit'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '18181818-1818-4818-8818-181818181811', true);
select public.block_member('18181818-1818-4818-8818-181818181812');
reset role;
set local role service_role;

select is(
  private.members_match_hard_constraints('18181818-1818-4818-8818-181818181811', '18181818-1818-4818-8818-181818181812'),
  false,
  'a member block overrides otherwise compatible hard constraints'
);

select is(
  (
    select count(*)::integer
    from public.get_hard_match_candidates('18181818-1818-4818-8818-181818181811', 20)
    where candidate_user_id = '18181818-1818-4818-8818-181818181812'
  ),
  0,
  'blocked candidates disappear from trusted candidate enumeration'
);

select public.set_member_safety_state(
  '18181818-1818-4818-8818-181818181815',
  'restricted',
  'matching_test_restriction',
  'matching-test',
  null
);

select is(
  private.members_match_hard_constraints('18181818-1818-4818-8818-181818181811', '18181818-1818-4818-8818-181818181815'),
  false,
  'a safety-restricted member cannot pass hard matching even when preferences would otherwise fit'
);

select throws_ok(
  $$select * from public.get_hard_match_candidates('18181818-1818-4818-8818-181818181814', 20)$$,
  'P0001',
  'member not eligible for matching',
  'a member without compatible participation state cannot enumerate candidates'
);

select * from finish();
rollback;

begin;
select plan(24);

select is(
  has_function_privilege('authenticated', 'private.member_accepts_partner(uuid, uuid)', 'EXECUTE'),
  false,
  'members cannot invoke the internal one-way acceptance helper'
);
select is(
  has_function_privilege('authenticated', 'private.members_match_hard_constraints(uuid, uuid)', 'EXECUTE'),
  false,
  'members cannot invoke the internal symmetric matching helper'
);
select is(
  has_function_privilege('authenticated', 'public.get_hard_match_candidates(uuid, integer)', 'EXECUTE'),
  false,
  'members cannot enumerate raw matching candidates'
);
select is(
  has_function_privilege('service_role', 'public.get_hard_match_candidates(uuid, integer)', 'EXECUTE'),
  true,
  'trusted matching services can enumerate hard-eligible candidates'
);

insert into auth.users (id, instance_id, aud, role, created_at, updated_at) values
  ('18181818-1818-4818-8818-181818181811', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', now(), now()),
  ('18181818-1818-4818-8818-181818181812', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', now(), now()),
  ('18181818-1818-4818-8818-181818181813', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', now(), now()),
  ('18181818-1818-4818-8818-181818181814', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', now(), now())
on conflict (id) do nothing;

insert into public.users (id) values
  ('18181818-1818-4818-8818-181818181811'),
  ('18181818-1818-4818-8818-181818181812'),
  ('18181818-1818-4818-8818-181818181813'),
  ('18181818-1818-4818-8818-181818181814')
on conflict (id) do nothing;

insert into public.waitlist_applications (
  id, user_id, status, gender, age_band_id, residency_type,
  current_country_code, current_city, marital_status, has_children,
  questionnaire_completed_at, submitted_at
) values
  ('18181818-aaaa-4aaa-8aaa-181818181811', '18181818-1818-4818-8818-181818181811', 'submitted', 'man', 2, 'libya', 'LY', 'Tripoli', 'never_married', false, now(), now() - interval '4 days'),
  ('18181818-bbbb-4bbb-8bbb-181818181812', '18181818-1818-4818-8818-181818181812', 'submitted', 'woman', 2, 'libya', 'LY', 'Benghazi', 'never_married', false, now(), now() - interval '3 days'),
  ('18181818-cccc-4ccc-8ccc-181818181813', '18181818-1818-4818-8818-181818181813', 'submitted', 'woman', 5, 'diaspora', 'GB', 'London', 'divorced', true, now(), now() - interval '2 days'),
  ('18181818-dddd-4ddd-8ddd-181818181814', '18181818-1818-4818-8818-181818181814', 'submitted', 'man', 2, 'libya', 'LY', 'Misrata', 'never_married', false, now(), now() - interval '1 day');

insert into public.waitlist_preferences (
  application_id, open_to_libya, open_to_diaspora,
  preferred_partner_age_min, preferred_partner_age_max,
  accepts_partner_with_children
) values
  ('18181818-aaaa-4aaa-8aaa-181818181811', true, false, 24, 35, 'no'),
  ('18181818-bbbb-4bbb-8bbb-181818181812', true, false, 24, 35, 'yes'),
  ('18181818-cccc-4ccc-8ccc-181818181813', true, true, 18, 60, 'yes'),
  ('18181818-dddd-4ddd-8ddd-181818181814', true, true, 18, 60, 'yes');

insert into public.member_profiles (user_id, display_name, about_me, profile_completed_at) values
  ('18181818-1818-4818-8818-181818181811', 'Adam', 'A serious complete member profile for deterministic hard matching tests.', now()),
  ('18181818-1818-4818-8818-181818181812', 'Basma', 'A serious complete member profile for deterministic hard matching tests.', now()),
  ('18181818-1818-4818-8818-181818181813', 'Cora', 'A serious complete member profile for deterministic hard matching tests.', now()),
  ('18181818-1818-4818-8818-181818181814', 'Dani', 'A serious complete member profile for deterministic hard matching tests.', now());

set local role service_role;
select public.set_member_profile_review_state('18181818-1818-4818-8818-181818181811', 'approved', 'm6', 'matching-test', null);
select public.set_member_profile_review_state('18181818-1818-4818-8818-181818181812', 'approved', 'm6', 'matching-test', null);
select public.set_member_profile_review_state('18181818-1818-4818-8818-181818181813', 'approved', 'm6', 'matching-test', null);
select public.set_member_profile_review_state('18181818-1818-4818-8818-181818181814', 'approved', 'm6', 'matching-test', null);

select is(private.member_accepts_partner('18181818-1818-4818-8818-181818181811', '18181818-1818-4818-8818-181818181812'), true, 'compatible member accepts partner');
select is(private.member_accepts_partner('18181818-1818-4818-8818-181818181812', '18181818-1818-4818-8818-181818181811'), true, 'compatible partner accepts back');
select is(private.members_match_hard_constraints('18181818-1818-4818-8818-181818181811', '18181818-1818-4818-8818-181818181812'), true, 'symmetric hard constraints pass only when both sides accept');
select is(private.member_accepts_partner('18181818-1818-4818-8818-181818181811', '18181818-1818-4818-8818-181818181814'), false, 'same-gender candidate is excluded');
select is(private.member_accepts_partner('18181818-1818-4818-8818-181818181811', '18181818-1818-4818-8818-181818181813'), false, 'diaspora candidate is excluded when diaspora is disabled');

reset role;
update public.waitlist_preferences set open_to_diaspora = true where application_id = '18181818-aaaa-4aaa-8aaa-181818181811';
set local role service_role;
select is(private.member_accepts_partner('18181818-1818-4818-8818-181818181811', '18181818-1818-4818-8818-181818181813'), false, 'opening diaspora does not bypass age constraints');

reset role;
update public.waitlist_preferences set preferred_partner_age_max = 50 where application_id = '18181818-aaaa-4aaa-8aaa-181818181811';
set local role service_role;
select is(private.member_accepts_partner('18181818-1818-4818-8818-181818181811', '18181818-1818-4818-8818-181818181813'), false, 'partner with children is excluded when preference is no');

reset role;
update public.waitlist_preferences set accepts_partner_with_children = 'depends' where application_id = '18181818-aaaa-4aaa-8aaa-181818181811';
set local role service_role;
select is(private.member_accepts_partner('18181818-1818-4818-8818-181818181811', '18181818-1818-4818-8818-181818181813'), true, 'depends permits partner with children when other constraints pass');

reset role;
insert into public.waitlist_accepted_marital_statuses (application_id, marital_status)
values ('18181818-aaaa-4aaa-8aaa-181818181811', 'never_married');
set local role service_role;
select is(private.member_accepts_partner('18181818-1818-4818-8818-181818181811', '18181818-1818-4818-8818-181818181813'), false, 'configured marital-status list excludes non-selected status');

reset role;
insert into public.waitlist_accepted_marital_statuses (application_id, marital_status)
values ('18181818-aaaa-4aaa-8aaa-181818181811', 'divorced');
set local role service_role;
select is(private.member_accepts_partner('18181818-1818-4818-8818-181818181811', '18181818-1818-4818-8818-181818181813'), true, 'adding partner marital status restores acceptance');

reset role;
insert into public.waitlist_preferred_countries (application_id, country_code)
values ('18181818-aaaa-4aaa-8aaa-181818181811', 'LY');
set local role service_role;
select is(private.member_accepts_partner('18181818-1818-4818-8818-181818181811', '18181818-1818-4818-8818-181818181813'), false, 'preferred-country list excludes other countries');

reset role;
insert into public.waitlist_preferred_countries (application_id, country_code)
values ('18181818-aaaa-4aaa-8aaa-181818181811', 'GB');
set local role service_role;
select is(private.member_accepts_partner('18181818-1818-4818-8818-181818181811', '18181818-1818-4818-8818-181818181813'), true, 'adding partner country restores country eligibility');
select is(private.members_match_hard_constraints('18181818-1818-4818-8818-181818181811', '18181818-1818-4818-8818-181818181813'), true, 'fully compatible diaspora pair passes symmetric constraints');

select is((select count(*)::integer from public.get_hard_match_candidates('18181818-1818-4818-8818-181818181811', 20) where candidate_user_id = '18181818-1818-4818-8818-181818181812'), 1, 'candidate query includes compatible member');
select is((select count(*)::integer from public.get_hard_match_candidates('18181818-1818-4818-8818-181818181811', 20) where candidate_user_id = '18181818-1818-4818-8818-181818181814'), 0, 'candidate query excludes same-gender member');
select throws_ok($$select * from public.get_hard_match_candidates('18181818-1818-4818-8818-181818181811', 0)$$, 'P0001', 'candidate limit must be between 1 and 100', 'candidate query rejects zero limit');

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '18181818-1818-4818-8818-181818181811', true);
select public.block_member('18181818-1818-4818-8818-181818181812');
reset role;
set local role service_role;

select is(private.members_match_hard_constraints('18181818-1818-4818-8818-181818181811', '18181818-1818-4818-8818-181818181812'), false, 'block overrides otherwise compatible hard constraints');
select is((select count(*)::integer from public.get_hard_match_candidates('18181818-1818-4818-8818-181818181811', 20) where candidate_user_id = '18181818-1818-4818-8818-181818181812'), 0, 'blocked member disappears from candidate query');

select public.set_member_safety_state('18181818-1818-4818-8818-181818181813', 'restricted', 'matching_test_restriction', 'matching-test', null);
select is(private.members_match_hard_constraints('18181818-1818-4818-8818-181818181811', '18181818-1818-4818-8818-181818181813'), false, 'safety restriction overrides otherwise compatible hard constraints');
select throws_ok($$select * from public.get_hard_match_candidates('18181818-1818-4818-8818-181818181813', 20)$$, 'P0001', 'member not eligible for matching', 'safety-restricted member cannot enumerate candidates');

select * from finish();
rollback;

begin;
select plan(12);

select is(
  has_function_privilege('authenticated', 'private.introduction_counterpart(uuid, uuid)', 'EXECUTE'),
  false,
  'members cannot resolve counterpart UUIDs through the private helper'
);
select is(
  has_function_privilege('authenticated', 'public.block_introduction_member(uuid)', 'EXECUTE'),
  true,
  'members can block from a controlled introduction without receiving a counterpart UUID'
);
select is(
  has_function_privilege(
    'authenticated',
    'public.submit_introduction_safety_report(uuid, public.safety_report_category, text, boolean)',
    'EXECUTE'
  ),
  true,
  'members can report from a controlled introduction without receiving a counterpart UUID'
);

insert into auth.users (id, instance_id, aud, role, created_at, updated_at) values
  ('19191919-1919-4919-8919-191919191911', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', now(), now()),
  ('19191919-1919-4919-8919-191919191912', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', now(), now()),
  ('19191919-1919-4919-8919-191919191913', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', now(), now())
on conflict (id) do nothing;

insert into auth.sessions (id, user_id, created_at, updated_at) values
  ('19191919-dddd-4ddd-8ddd-191919191911', '19191919-1919-4919-8919-191919191911', now(), now()),
  ('19191919-dddd-4ddd-8ddd-191919191912', '19191919-1919-4919-8919-191919191912', now(), now()),
  ('19191919-dddd-4ddd-8ddd-191919191913', '19191919-1919-4919-8919-191919191913', now(), now())
on conflict (id) do nothing;

insert into public.users (id) values
  ('19191919-1919-4919-8919-191919191911'),
  ('19191919-1919-4919-8919-191919191912'),
  ('19191919-1919-4919-8919-191919191913')
on conflict (id) do nothing;

insert into public.waitlist_applications (
  id, user_id, status, gender, age_band_id, residency_type,
  current_country_code, current_city, marital_status, has_children,
  questionnaire_completed_at, submitted_at
) values
  ('19191919-aaaa-4aaa-8aaa-191919191911', '19191919-1919-4919-8919-191919191911', 'invited', 'man', 2, 'libya', 'LY', 'Tripoli', 'never_married', false, now(), now()),
  ('19191919-bbbb-4bbb-8bbb-191919191912', '19191919-1919-4919-8919-191919191912', 'invited', 'woman', 2, 'libya', 'LY', 'Benghazi', 'never_married', false, now(), now()),
  ('19191919-cccc-4ccc-8ccc-191919191913', '19191919-1919-4919-8919-191919191913', 'invited', 'woman', 2, 'libya', 'LY', 'Misrata', 'never_married', false, now(), now());

insert into public.waitlist_preferences (
  application_id, open_to_libya, open_to_diaspora,
  preferred_partner_age_min, preferred_partner_age_max,
  accepts_partner_with_children
) values
  ('19191919-aaaa-4aaa-8aaa-191919191911', true, true, 18, 60, 'depends'),
  ('19191919-bbbb-4bbb-8bbb-191919191912', true, true, 18, 60, 'depends'),
  ('19191919-cccc-4ccc-8ccc-191919191913', true, true, 18, 60, 'depends');

insert into public.member_profiles (user_id, display_name, about_me, profile_completed_at) values
  ('19191919-1919-4919-8919-191919191911', 'Adam', 'A complete serious profile used only for introduction safety boundary testing.', now()),
  ('19191919-1919-4919-8919-191919191912', 'Basma', 'A complete serious profile used only for introduction safety boundary testing.', now()),
  ('19191919-1919-4919-8919-191919191913', 'Cora', 'A complete serious profile used only for introduction safety boundary testing.', now());

insert into public.member_connection_spaces (
  user_id, space, membership_state, is_current
) values
  ('19191919-1919-4919-8919-191919191911', 'marriage', 'active', true),
  ('19191919-1919-4919-8919-191919191912', 'marriage', 'active', true),
  ('19191919-1919-4919-8919-191919191913', 'marriage', 'active', true)
on conflict (user_id, space) do update
set membership_state = 'active'::public.connection_space_membership_state,
    is_current = true,
    updated_at = now();

insert into private.marriage_practical_priorities (
  user_id, living_arrangement, children_plan, work_after_marriage, wedding_style, completed_at
) values
  ('19191919-1919-4919-8919-191919191911', 'independent_home', 'want_children', 'open_to_discuss', 'moderate', now()),
  ('19191919-1919-4919-8919-191919191912', 'independent_home', 'want_children', 'open_to_discuss', 'moderate', now()),
  ('19191919-1919-4919-8919-191919191913', 'independent_home', 'want_children', 'open_to_discuss', 'moderate', now());

set local role service_role;
select public.set_member_profile_review_state('19191919-1919-4919-8919-191919191911', 'approved', 'm6', 'intro-safety-test', null);
select public.set_member_profile_review_state('19191919-1919-4919-8919-191919191912', 'approved', 'm6', 'intro-safety-test', null);
select public.set_member_profile_review_state('19191919-1919-4919-8919-191919191913', 'approved', 'm6', 'intro-safety-test', null);

create temporary table intro_safety_ids (name text primary key, id uuid not null) on commit drop;
grant select on intro_safety_ids to authenticated;
insert into intro_safety_ids (name, id)
select 'report', public.create_controlled_introduction(
  '19191919-1919-4919-8919-191919191911',
  '19191919-1919-4919-8919-191919191912',
  clock_timestamp() + interval '7 days',
  'intro-safety-test'
);
insert into intro_safety_ids (name, id)
select 'block', public.create_controlled_introduction(
  '19191919-1919-4919-8919-191919191911',
  '19191919-1919-4919-8919-191919191913',
  clock_timestamp() + interval '7 days',
  'intro-safety-test'
);

select is(
  private.introduction_counterpart((select id from intro_safety_ids where name = 'report'), '19191919-1919-4919-8919-191919191911'),
  '19191919-1919-4919-8919-191919191912'::uuid,
  'trusted code resolves the correct counterpart inside an introduction'
);
select is(
  private.introduction_counterpart((select id from intro_safety_ids where name = 'report'), '19191919-1919-4919-8919-191919191913'),
  null::uuid,
  'non-participants do not resolve a counterpart'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '19191919-1919-4919-8919-191919191913', true);
select set_config(
  'request.jwt.claims',
  '{"sub":"19191919-1919-4919-8919-191919191913","session_id":"19191919-dddd-4ddd-8ddd-191919191913"}',
  true
);
select throws_ok(
  $$select public.submit_introduction_safety_report(
    (select id from intro_safety_ids where name = 'report'),
    'harassment'::public.safety_report_category,
    'outsider attempt',
    true
  )$$,
  'P0001',
  'introduction unavailable',
  'an outsider cannot submit a report against a private introduction pair'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '19191919-1919-4919-8919-191919191911', true);
select set_config(
  'request.jwt.claims',
  '{"sub":"19191919-1919-4919-8919-191919191911","session_id":"19191919-dddd-4ddd-8ddd-191919191911"}',
  true
);

create temporary table report_result (id uuid not null) on commit drop;
grant select on report_result to service_role;
insert into report_result (id)
select public.submit_introduction_safety_report(
  (select id from intro_safety_ids where name = 'report'),
  'harassment'::public.safety_report_category,
  'Repeated disrespectful messages during the introduction.',
  true
);

reset role;
set local role service_role;
select is(
  (select target_user_id from public.safety_reports where id = (select id from report_result)),
  '19191919-1919-4919-8919-191919191912'::uuid,
  'introduction-scoped report stores the resolved counterpart as target'
);
select is(
  (select blocker_user_id from public.member_blocks where blocker_user_id = '19191919-1919-4919-8919-191919191911' and blocked_user_id = '19191919-1919-4919-8919-191919191912'),
  '19191919-1919-4919-8919-191919191911'::uuid,
  'report with block enabled creates the member block'
);
select is(
  (select status from private.controlled_introductions where id = (select id from intro_safety_ids where name = 'report')),
  'cancelled'::public.introduction_status,
  'report-triggered block cancels the active introduction server-side'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '19191919-1919-4919-8919-191919191911', true);
select set_config(
  'request.jwt.claims',
  '{"sub":"19191919-1919-4919-8919-191919191911","session_id":"19191919-dddd-4ddd-8ddd-191919191911"}',
  true
);
select is(
  public.block_introduction_member((select id from intro_safety_ids where name = 'block')),
  true,
  'participant can block the counterpart using only the introduction identifier'
);

reset role;
set local role service_role;
select is(
  (select count(*)::integer from public.member_blocks where blocker_user_id = '19191919-1919-4919-8919-191919191911' and blocked_user_id = '19191919-1919-4919-8919-191919191913'),
  1,
  'introduction-scoped block stores exactly one block edge'
);
select is(
  (select status from private.controlled_introductions where id = (select id from intro_safety_ids where name = 'block')),
  'cancelled'::public.introduction_status,
  'introduction-scoped block cancels the active introduction'
);

select * from finish();
rollback;
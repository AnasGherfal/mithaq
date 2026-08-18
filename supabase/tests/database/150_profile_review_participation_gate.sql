begin;
select plan(29);

select is(
  has_function_privilege(
    'authenticated',
    'public.set_member_profile_review_state(uuid, public.member_profile_review_state, text, text, timestamptz)',
    'EXECUTE'
  ),
  false,
  'members cannot approve or reject their own profile review state'
);

select is(
  has_function_privilege(
    'service_role',
    'public.set_member_profile_review_state(uuid, public.member_profile_review_state, text, text, timestamptz)',
    'EXECUTE'
  ),
  true,
  'trusted review services can transition profile review state'
);

select is(
  has_table_privilege('authenticated', 'public.member_profile_reviews', 'INSERT'),
  false,
  'authenticated clients cannot insert profile review rows'
);

select is(
  has_table_privilege('authenticated', 'public.member_profile_reviews', 'UPDATE'),
  false,
  'authenticated clients cannot update profile review rows'
);

select is(
  has_table_privilege('authenticated', 'public.member_profile_reviews', 'SELECT'),
  true,
  'members can read their own public-safe review state through RLS'
);

select is(
  has_function_privilege('authenticated', 'private.member_can_participate(uuid)', 'EXECUTE'),
  false,
  'members cannot invoke the internal participation decision helper'
);

select is(
  has_function_privilege('service_role', 'private.member_can_participate(uuid)', 'EXECUTE'),
  true,
  'trusted services can evaluate the centralized participation decision'
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
    '15151515-1515-4515-8515-151515151511',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    now(),
    now()
  ),
  (
    '15151515-1515-4515-8515-151515151512',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    now(),
    now()
  ),
  (
    '15151515-1515-4515-8515-151515151513',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    now(),
    now()
  )
on conflict (id) do nothing;

insert into public.users (id)
values
  ('15151515-1515-4515-8515-151515151511'),
  ('15151515-1515-4515-8515-151515151512'),
  ('15151515-1515-4515-8515-151515151513')
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
    '15151515-aaaa-4aaa-8aaa-151515151511',
    '15151515-1515-4515-8515-151515151511',
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
    '15151515-bbbb-4bbb-8bbb-151515151512',
    '15151515-1515-4515-8515-151515151512',
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
    '15151515-cccc-4ccc-8ccc-151515151513',
    '15151515-1515-4515-8515-151515151513',
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
    '15151515-1515-4515-8515-151515151511',
    'Omar',
    'I value family, responsibility, kindness, and a serious path toward marriage.',
    'Engineer',
    'University',
    now()
  ),
  (
    '15151515-1515-4515-8515-151515151512',
    'Sara',
    'I value family, respect, clarity, and building a peaceful marriage with intention.',
    'Doctor',
    'University',
    now()
  ),
  (
    '15151515-1515-4515-8515-151515151513',
    'Ali',
    'This profile is complete but the waitlist application is intentionally not submitted.',
    null,
    null,
    now()
  );

set local role service_role;

select is(
  private.member_can_participate('15151515-1515-4515-8515-151515151511'),
  false,
  'a completed member remains ineligible until profile review is approved'
);

select is(
  public.set_member_profile_review_state(
    '15151515-1515-4515-8515-151515151511',
    'approved'::public.member_profile_review_state,
    'initial_review_passed',
    'test-profile-reviewer',
    now() + interval '30 days'
  ),
  true,
  'a trusted reviewer can approve a submitted completed profile'
);

select is(
  (
    select state
    from public.member_profile_reviews
    where user_id = '15151515-1515-4515-8515-151515151511'
  ),
  'approved'::public.member_profile_review_state,
  'the approved profile review state is persisted'
);

select is(
  (
    select count(*)::integer
    from private.member_profile_review_events
    where user_id = '15151515-1515-4515-8515-151515151511'
  ),
  1,
  'profile approval creates one private audit event'
);

select is(
  private.member_can_participate('15151515-1515-4515-8515-151515151511'),
  true,
  'approved profile plus clear safety state makes the member participation-eligible'
);

select is(
  public.set_member_profile_review_state(
    '15151515-1515-4515-8515-151515151511',
    'approved'::public.member_profile_review_state,
    'duplicate_review',
    'test-profile-reviewer',
    null
  ),
  false,
  'repeating the same review state is idempotent'
);

select is(
  (
    select count(*)::integer
    from private.member_profile_review_events
    where user_id = '15151515-1515-4515-8515-151515151511'
  ),
  1,
  'idempotent review writes do not add audit noise'
);

select is(
  public.set_member_safety_state(
    '15151515-1515-4515-8515-151515151511',
    'restricted'::public.member_safety_state,
    'manual_safety_review',
    'test-safety-worker',
    null
  ),
  true,
  'a safety restriction can be applied independently of profile approval'
);

select is(
  private.member_can_participate('15151515-1515-4515-8515-151515151511'),
  false,
  'a safety restriction overrides an approved profile'
);

select is(
  public.set_member_safety_state(
    '15151515-1515-4515-8515-151515151511',
    'clear'::public.member_safety_state,
    null,
    'test-safety-worker',
    null
  ),
  true,
  'trusted safety review can restore a member to clear'
);

select is(
  private.member_can_participate('15151515-1515-4515-8515-151515151511'),
  true,
  'clearing the safety restriction restores participation when every other gate is satisfied'
);

reset role;
update public.member_profiles
set about_me = 'I value family, responsibility, kindness, and a serious path toward marriage, with updated profile details.'
where user_id = '15151515-1515-4515-8515-151515151511';
set local role service_role;

select is(
  (
    select state
    from public.member_profile_reviews
    where user_id = '15151515-1515-4515-8515-151515151511'
  ),
  'pending'::public.member_profile_review_state,
  'changing reviewed profile content automatically returns it to pending review'
);

select is(
  (
    select count(*)::integer
    from private.member_profile_review_events
    where user_id = '15151515-1515-4515-8515-151515151511'
  ),
  2,
  'the automatic review reset is auditable'
);

select is(
  (
    select actor_reference
    from private.member_profile_review_events
    where user_id = '15151515-1515-4515-8515-151515151511'
    order by recorded_at desc, id desc
    limit 1
  ),
  'profile-change',
  'the automatic reset identifies profile change as the actor source'
);

select is(
  private.member_can_participate('15151515-1515-4515-8515-151515151511'),
  false,
  'editing approved profile content prevents participation until re-review'
);

select is(
  public.set_member_profile_review_state(
    '15151515-1515-4515-8515-151515151511',
    'approved'::public.member_profile_review_state,
    'updated_profile_approved',
    'test-profile-reviewer',
    null
  ),
  true,
  'the updated profile can be approved again after review'
);

select is(
  private.member_can_participate('15151515-1515-4515-8515-151515151511'),
  true,
  're-approval restores participation eligibility'
);

select is(
  public.set_member_profile_review_state(
    '15151515-1515-4515-8515-151515151512',
    'needs_changes'::public.member_profile_review_state,
    'profile_clarity_needed',
    'test-profile-reviewer',
    null
  ),
  true,
  'trusted review can mark a separate member profile as needing changes'
);

select is(
  private.member_can_participate('15151515-1515-4515-8515-151515151512'),
  false,
  'a needs-changes profile cannot participate'
);

select throws_ok(
  $$select public.set_member_profile_review_state(
    '15151515-1515-4515-8515-151515151513',
    'approved'::public.member_profile_review_state,
    'should_not_approve',
    'test-profile-reviewer',
    null
  )$$,
  'P0001',
  'profile not eligible for approval',
  'an unsubmitted waitlist member cannot be approved for participation'
);

reset role;
set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '15151515-1515-4515-8515-151515151511',
  true
);

select is(
  (
    select count(*)::integer
    from public.member_profile_reviews
    where user_id = '15151515-1515-4515-8515-151515151511'
  ),
  1,
  'members can read their own current profile review state'
);

select is(
  (
    select count(*)::integer
    from public.member_profile_reviews
    where user_id = '15151515-1515-4515-8515-151515151512'
  ),
  0,
  'members cannot read another member profile review state'
);

reset role;
select * from finish();
rollback;

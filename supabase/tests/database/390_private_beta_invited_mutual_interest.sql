begin;
select plan(14);

insert into auth.users (
  id,
  instance_id,
  aud,
  role,
  created_at,
  updated_at
) values
  (
    '90909090-9090-4090-8090-909090909091',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    now(),
    now()
  ),
  (
    '90909090-9090-4090-8090-909090909092',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    now(),
    now()
  )
on conflict (id) do nothing;

insert into auth.sessions (id, user_id, created_at, updated_at)
values
  (
    '90909090-dddd-4ddd-8ddd-909090909091',
    '90909090-9090-4090-8090-909090909091',
    now(),
    now()
  ),
  (
    '90909090-dddd-4ddd-8ddd-909090909092',
    '90909090-9090-4090-8090-909090909092',
    now(),
    now()
  )
on conflict (id) do nothing;

insert into public.users (id)
values
  ('90909090-9090-4090-8090-909090909091'),
  ('90909090-9090-4090-8090-909090909092')
on conflict (id) do update
set account_status = 'active'::public.account_status;

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
  (
    '90909090-aaaa-4aaa-8aaa-909090909091',
    '90909090-9090-4090-8090-909090909091',
    'submitted',
    'man',
    2,
    'libya',
    'LY',
    'Tripoli',
    'never_married',
    false,
    now(),
    now()
  ),
  (
    '90909090-bbbb-4bbb-8bbb-909090909092',
    '90909090-9090-4090-8090-909090909092',
    'invited',
    'woman',
    2,
    'libya',
    'LY',
    'Benghazi',
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
  accepts_partner_with_children,
  photo_privacy_preference
) values
  (
    '90909090-aaaa-4aaa-8aaa-909090909091',
    true,
    true,
    18,
    60,
    'depends',
    'after_mutual_interest'
  ),
  (
    '90909090-bbbb-4bbb-8bbb-909090909092',
    true,
    true,
    18,
    60,
    'depends',
    'after_mutual_interest'
  );

insert into public.member_profiles (
  user_id,
  display_name,
  about_me,
  profile_completed_at
) values
  (
    '90909090-9090-4090-8090-909090909091',
    'Beta A',
    'A complete private-beta test profile for a serious marriage introduction journey.',
    now()
  ),
  (
    '90909090-9090-4090-8090-909090909092',
    'Beta B',
    'A second complete private-beta test profile for a serious marriage introduction journey.',
    now()
  );

update public.member_profile_reviews
set state = 'approved'::public.member_profile_review_state,
    reason_code = null,
    updated_at = now()
where user_id in (
  '90909090-9090-4090-8090-909090909091',
  '90909090-9090-4090-8090-909090909092'
);

insert into public.member_connection_spaces (
  user_id,
  space,
  membership_state,
  is_current
) values
  (
    '90909090-9090-4090-8090-909090909091',
    'marriage',
    'active',
    true
  ),
  (
    '90909090-9090-4090-8090-909090909092',
    'marriage',
    'active',
    true
  )
on conflict (user_id, space) do update
set membership_state = 'active'::public.connection_space_membership_state,
    is_current = true,
    updated_at = now();

insert into private.marriage_practical_priorities (
  user_id,
  living_arrangement,
  children_plan,
  work_after_marriage,
  wedding_style,
  completed_at
) values
  (
    '90909090-9090-4090-8090-909090909092',
    'independent_home',
    'want_children',
    'open_to_discuss',
    'moderate',
    now()
  );

select is(
  private.member_can_participate('90909090-9090-4090-8090-909090909091'),
  false,
  'submitted application cannot participate even with an otherwise complete reviewed profile'
);

update public.waitlist_applications
set status = 'qualified'::public.waitlist_status,
    updated_at = now()
where id = '90909090-aaaa-4aaa-8aaa-909090909091';

select is(
  private.member_can_participate('90909090-9090-4090-8090-909090909091'),
  false,
  'qualified application remains outside Marriage participation until invited'
);

update public.waitlist_applications
set status = 'invited'::public.waitlist_status,
    updated_at = now()
where id = '90909090-aaaa-4aaa-8aaa-909090909091';

select is(
  private.member_can_participate('90909090-9090-4090-8090-909090909091'),
  false,
  'invited member without completed practical priorities cannot participate'
);

insert into private.marriage_practical_priorities (
  user_id,
  living_arrangement,
  children_plan,
  work_after_marriage,
  wedding_style,
  completed_at
) values
  (
    '90909090-9090-4090-8090-909090909091',
    'independent_home',
    'want_children',
    'open_to_discuss',
    'moderate',
    now()
  );

select is(
  private.member_can_participate('90909090-9090-4090-8090-909090909091'),
  true,
  'invited reviewed member with active Marriage space and priorities can participate'
);

select is(
  private.member_can_participate('90909090-9090-4090-8090-909090909092'),
  true,
  'reciprocal invited reviewed fixture can participate'
);

select is(
  private.members_match_hard_constraints(
    '90909090-9090-4090-8090-909090909091',
    '90909090-9090-4090-8090-909090909092'
  ),
  true,
  'the two invited fixtures satisfy symmetric hard constraints'
);

create temporary table beta_interest_results (
  actor text primary key,
  action_id uuid not null,
  introduction_id uuid,
  mutual_interest boolean not null
) on commit drop;
grant select, insert on beta_interest_results to authenticated;

set local role authenticated;
select set_config('request.jwt.claim.sub', '90909090-9090-4090-8090-909090909091', true);
select set_config(
  'request.jwt.claims',
  '{"sub":"90909090-9090-4090-8090-909090909091","session_id":"90909090-dddd-4ddd-8ddd-909090909091"}',
  true
);

insert into beta_interest_results (actor, action_id, introduction_id, mutual_interest)
select 'a', result.action_id, result.introduction_id, result.mutual_interest
from public.record_marriage_discovery_action_v2(
  '90909090-9090-4090-8090-909090909092',
  'noticed'::public.marriage_discovery_action
) result;

select is(
  (select mutual_interest from beta_interest_results where actor = 'a'),
  false,
  'first private noticed action does not create an introduction'
);

select is(
  (select introduction_id is null from beta_interest_results where actor = 'a'),
  true,
  'one-sided interest returns no introduction identifier'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '90909090-9090-4090-8090-909090909092', true);
select set_config(
  'request.jwt.claims',
  '{"sub":"90909090-9090-4090-8090-909090909092","session_id":"90909090-dddd-4ddd-8ddd-909090909092"}',
  true
);

insert into beta_interest_results (actor, action_id, introduction_id, mutual_interest)
select 'b', result.action_id, result.introduction_id, result.mutual_interest
from public.record_marriage_discovery_action_v2(
  '90909090-9090-4090-8090-909090909091',
  'noticed'::public.marriage_discovery_action
) result;

select is(
  (select mutual_interest from beta_interest_results where actor = 'b'),
  true,
  'reciprocal private noticed action reports mutual interest'
);

select ok(
  (select introduction_id is not null from beta_interest_results where actor = 'b'),
  'reciprocal private interest creates a controlled introduction'
);

reset role;
select is(
  (
    select count(*)::integer
    from private.controlled_introductions i
    where i.pair_key = '90909090-9090-4090-8090-909090909091:90909090-9090-4090-8090-909090909092'
      and i.status in ('offered', 'mutually_accepted')
  ),
  1,
  'reciprocal interest creates exactly one active controlled introduction'
);

select is(
  (
    select count(*)::integer
    from private.marriage_discovery_actions d
    where d.action = 'noticed'::public.marriage_discovery_action
      and (
        (d.actor_user_id = '90909090-9090-4090-8090-909090909091' and d.candidate_user_id = '90909090-9090-4090-8090-909090909092')
        or
        (d.actor_user_id = '90909090-9090-4090-8090-909090909092' and d.candidate_user_id = '90909090-9090-4090-8090-909090909091')
      )
  ),
  2,
  'exactly one noticed row is retained for each direction'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '90909090-9090-4090-8090-909090909091', true);
select set_config(
  'request.jwt.claims',
  '{"sub":"90909090-9090-4090-8090-909090909091","session_id":"90909090-dddd-4ddd-8ddd-909090909091"}',
  true
);

select throws_ok(
  $$select * from public.record_marriage_discovery_action_v2(
    '90909090-9090-4090-8090-909090909092',
    'noticed'::public.marriage_discovery_action
  )$$,
  'P0001',
  'marriage discovery action unavailable',
  'an active introduction prevents a repeated notice from creating a duplicate introduction'
);

reset role;
select is(
  (
    select count(*)::integer
    from private.controlled_introductions i
    where i.pair_key = '90909090-9090-4090-8090-909090909091:90909090-9090-4090-8090-909090909092'
      and i.status in ('offered', 'mutually_accepted')
  ),
  1,
  'repeated interest leaves the pair with exactly one active introduction'
);

select * from finish();
rollback;

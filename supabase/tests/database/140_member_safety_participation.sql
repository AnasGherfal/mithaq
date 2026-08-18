begin;
select plan(24);

select is(
  has_function_privilege(
    'authenticated',
    'public.set_member_safety_state(uuid, public.member_safety_state, text, text, timestamptz)',
    'EXECUTE'
  ),
  false,
  'members cannot change their own safety participation state'
);

select is(
  has_function_privilege(
    'service_role',
    'public.set_member_safety_state(uuid, public.member_safety_state, text, text, timestamptz)',
    'EXECUTE'
  ),
  true,
  'trusted safety services can change member participation state'
);

select is(
  has_function_privilege('authenticated', 'private.member_can_participate(uuid)', 'EXECUTE'),
  false,
  'members cannot call the internal participation decision helper'
);

select is(
  has_function_privilege('service_role', 'private.member_can_participate(uuid)', 'EXECUTE'),
  true,
  'trusted services can evaluate member participation eligibility'
);

select is(
  has_table_privilege('authenticated', 'public.member_safety_states', 'UPDATE'),
  false,
  'authenticated clients cannot directly update safety state rows'
);

select is(
  has_table_privilege('authenticated', 'public.member_safety_states', 'INSERT'),
  false,
  'authenticated clients cannot directly insert safety state rows'
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
    'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee1',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    now(),
    now()
  ),
  (
    'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee2',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    now(),
    now()
  ),
  (
    'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee3',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    now(),
    now()
  )
on conflict (id) do nothing;

insert into public.users (id)
values
  ('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee1'),
  ('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee2'),
  ('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee3')
on conflict (id) do nothing;

set local role service_role;

select is(
  private.member_can_participate('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee1'),
  false,
  'a clear safety state alone does not bypass the centralized onboarding and profile gates'
);

select is(
  public.set_member_safety_state(
    'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee1',
    'restricted'::public.member_safety_state,
    'manual_review',
    'test-safety-worker',
    now() + interval '2 days'
  ),
  true,
  'trusted safety services can restrict an active member'
);

select is(
  (
    select state
    from public.member_safety_states
    where user_id = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee1'
  ),
  'restricted'::public.member_safety_state,
  'the current safety state is persisted'
);

select is(
  (
    select reason_code
    from public.member_safety_states
    where user_id = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee1'
  ),
  'manual_review',
  'the controlled reason code is persisted'
);

select is(
  (
    select count(*)::integer
    from private.member_safety_state_events
    where user_id = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee1'
  ),
  1,
  'a safety-state transition creates one private audit event'
);

select is(
  public.set_member_safety_state(
    'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee1',
    'restricted'::public.member_safety_state,
    'manual_review',
    'test-safety-worker',
    now() + interval '2 days'
  ),
  false,
  'setting the same safety state is idempotent'
);

select is(
  (
    select count(*)::integer
    from private.member_safety_state_events
    where user_id = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee1'
  ),
  1,
  'an idempotent safety-state write does not create another audit event'
);

select is(
  private.member_can_participate('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee1'),
  false,
  'restricted members cannot participate in matching or introductions'
);

select is(
  public.set_member_safety_state(
    'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee1',
    'clear'::public.member_safety_state,
    'ignored_when_cleared',
    'test-safety-worker',
    now() + interval '2 days'
  ),
  true,
  'a restricted member can be restored to clear by a trusted safety service'
);

select ok(
  (
    select reason_code is null and review_after is null
    from public.member_safety_states
    where user_id = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee1'
  ),
  'clearing a member removes restriction reason and review timing'
);

select is(
  private.member_can_participate('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee1'),
  false,
  'clearing safety does not bypass the remaining centralized participation gates'
);

select is(
  public.set_member_safety_state(
    'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee1',
    'suspended'::public.member_safety_state,
    'serious_safety_review',
    'test-safety-worker',
    null
  ),
  true,
  'trusted safety services can suspend a member'
);

select is(
  private.member_can_participate('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee1'),
  false,
  'suspended members cannot participate'
);

select is(
  public.set_member_safety_state(
    'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee2',
    'restricted'::public.member_safety_state,
    'secondary_review',
    'test-safety-worker',
    null
  ),
  true,
  'a separate member can hold an independent safety state'
);

reset role;
update public.users
set account_status = 'deleted'
where id = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee3';
set local role service_role;

select throws_ok(
  $$select public.set_member_safety_state(
    'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee3',
    'restricted'::public.member_safety_state,
    'should_not_write',
    'test-safety-worker',
    null
  )$$,
  'P0001',
  'member unavailable',
  'deleted members cannot receive new safety-state transitions'
);

select is(
  private.member_can_participate('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee3'),
  false,
  'deleted members can never participate'
);

reset role;
set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee1',
  true
);

select is(
  (
    select count(*)::integer
    from public.member_safety_states
    where user_id = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee1'
  ),
  1,
  'members can read their own current safety state'
);

select is(
  (
    select count(*)::integer
    from public.member_safety_states
    where user_id = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee2'
  ),
  0,
  'members cannot read another member safety state'
);

reset role;
select * from finish();
rollback;

begin;
select plan(6);

select is(
  has_function_privilege('authenticated', 'private.members_are_blocked(uuid, uuid)', 'EXECUTE'),
  false,
  'clients cannot call the internal blocked-pair eligibility guard'
);

select is(
  has_function_privilege('service_role', 'private.members_are_blocked(uuid, uuid)', 'EXECUTE'),
  true,
  'trusted server code can call the blocked-pair eligibility guard'
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
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    now(),
    now()
  ),
  (
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    now(),
    now()
  ),
  (
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb3',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    now(),
    now()
  )
on conflict (id) do nothing;

insert into public.users (id)
values
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb3')
on conflict (id) do nothing;

select is(
  private.members_are_blocked(
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1',
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2'
  ),
  false,
  'an unblocked pair is eligible at the block boundary'
);

insert into public.member_blocks (blocker_user_id, blocked_user_id)
values (
  'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1',
  'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2'
);

select is(
  private.members_are_blocked(
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1',
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2'
  ),
  true,
  'the guard detects a forward-direction block'
);

select is(
  private.members_are_blocked(
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2',
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1'
  ),
  true,
  'the guard treats a block as symmetric for introduction eligibility'
);

select is(
  private.members_are_blocked(
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1',
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb3'
  ),
  false,
  'a block between one pair does not affect unrelated members'
);

select * from finish();
rollback;

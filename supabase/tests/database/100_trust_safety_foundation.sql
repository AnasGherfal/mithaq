begin;
select plan(19);

select is(
  has_function_privilege('authenticated', 'public.block_member(uuid)', 'EXECUTE'),
  true,
  'authenticated members can call the block RPC'
);

select is(
  has_function_privilege('anon', 'public.block_member(uuid)', 'EXECUTE'),
  false,
  'anonymous clients cannot call the block RPC'
);

select is(
  has_function_privilege(
    'authenticated',
    'public.submit_safety_report(uuid, public.safety_report_category, text, boolean)',
    'EXECUTE'
  ),
  true,
  'authenticated members can submit safety reports through the guarded RPC'
);

select is(
  has_function_privilege(
    'anon',
    'public.submit_safety_report(uuid, public.safety_report_category, text, boolean)',
    'EXECUTE'
  ),
  false,
  'anonymous clients cannot submit safety reports'
);

select is(
  has_table_privilege('authenticated', 'public.member_blocks', 'INSERT'),
  false,
  'authenticated clients cannot bypass the block RPC with direct inserts'
);

select is(
  has_table_privilege('authenticated', 'public.safety_reports', 'INSERT'),
  false,
  'authenticated clients cannot bypass the safety report RPC with direct inserts'
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
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    now(),
    now()
  ),
  (
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    now(),
    now()
  ),
  (
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    now(),
    now()
  )
on conflict (id) do nothing;

insert into public.users (id)
values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1'),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2'),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3')
on conflict (id) do nothing;

update public.users
set account_status = 'deletion_pending'
where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3';

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
  true
);

select is(
  public.block_member('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2'),
  true,
  'an active member can block another member'
);

select is(
  public.block_member('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2'),
  false,
  'blocking the same member again is idempotent'
);

select is(
  (select count(*)::integer from public.member_blocks),
  1,
  'the blocker can read their own block row'
);

select throws_ok(
  $$select public.block_member('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1')$$,
  'P0001',
  'invalid block target',
  'members cannot block themselves'
);

select is(
  public.unblock_member('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2'),
  true,
  'a member can remove their own block'
);

select is(
  (select count(*)::integer from public.member_blocks),
  0,
  'unblocking removes the member block'
);

select ok(
  public.submit_safety_report(
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2',
    'harassment'::public.safety_report_category,
    'Repeated unwanted contact after I asked the member to stop.',
    true
  ) is not null,
  'submitting a report returns a report id'
);

select is(
  (select count(*)::integer from public.safety_reports),
  1,
  'the reporter can read their own submitted report'
);

select is(
  (select count(*)::integer from public.member_blocks),
  1,
  'report-and-block creates the safety block atomically'
);

select set_config(
  'request.jwt.claim.sub',
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2',
  true
);

select is(
  (select count(*)::integer from public.safety_reports),
  0,
  'the reported member cannot read the confidential report'
);

select is(
  (select count(*)::integer from public.member_blocks),
  0,
  'the blocked member cannot read who blocked them'
);

select set_config(
  'request.jwt.claim.sub',
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3',
  true
);

select throws_ok(
  $$select public.block_member('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2')$$,
  'P0001',
  'account unavailable',
  'deletion-pending accounts cannot create new blocks'
);

select throws_ok(
  $$select public.submit_safety_report(
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2',
    'other'::public.safety_report_category,
    null,
    true
  )$$,
  'P0001',
  'account unavailable',
  'deletion-pending accounts cannot create new safety reports'
);

reset role;
select * from finish();
rollback;

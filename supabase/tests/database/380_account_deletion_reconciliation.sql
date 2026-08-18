begin;
select plan(9);

select is(
  has_function_privilege('authenticated', 'public.reconcile_orphaned_account_deletions(integer)', 'EXECUTE'),
  false,
  'members cannot reconcile deletion tombstones'
);

select is(
  has_function_privilege('service_role', 'public.reconcile_orphaned_account_deletions(integer)', 'EXECUTE'),
  true,
  'trusted deletion workers can reconcile orphaned tombstones'
);

insert into auth.users (
  id,
  instance_id,
  aud,
  role,
  created_at,
  updated_at
) values (
  '38383838-3838-4838-8838-383838383838',
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  now(),
  now()
)
on conflict (id) do nothing;

insert into public.users (id, account_status)
values ('38383838-3838-4838-8838-383838383838', 'deletion_pending')
on conflict (id) do update set account_status = excluded.account_status;

insert into public.deletion_requests (
  id,
  user_id,
  request_scope,
  status,
  requested_at,
  due_at,
  processing_started_at,
  attempt_count
) values (
  '38383838-aaaa-4aaa-8aaa-383838383838',
  '38383838-3838-4838-8838-383838383838',
  'entire_account',
  'in_progress',
  now() - interval '31 days',
  now() - interval '1 day',
  now() - interval '5 minutes',
  1
);

insert into private.account_deletion_tombstones (
  request_id,
  user_id,
  requested_at,
  processing_started_at,
  state,
  attempt_count
) values (
  '38383838-aaaa-4aaa-8aaa-383838383838',
  '38383838-3838-4838-8838-383838383838',
  now() - interval '31 days',
  now() - interval '5 minutes',
  'processing',
  1
);

select is(
  (select state from private.account_deletion_tombstones where request_id = '38383838-aaaa-4aaa-8aaa-383838383838'),
  'processing',
  'tombstone starts in processing state'
);

delete from auth.users
where id = '38383838-3838-4838-8838-383838383838';

select is(
  (select count(*)::integer from public.users where id = '38383838-3838-4838-8838-383838383838'),
  0,
  'Auth deletion cascades the public account row'
);

select is(
  (select count(*)::integer from public.deletion_requests where id = '38383838-aaaa-4aaa-8aaa-383838383838'),
  0,
  'Auth deletion cascades the public deletion request'
);

select ok(
  exists (
    select 1
    from private.account_deletion_tombstones
    where request_id = '38383838-aaaa-4aaa-8aaa-383838383838'
      and state = 'processing'
      and user_id = '38383838-3838-4838-8838-383838383838'
  ),
  'private tombstone survives the Auth cascade for reconciliation'
);

set local role service_role;
select is(
  public.reconcile_orphaned_account_deletions(25),
  1,
  'worker reconciliation finalizes one orphaned deletion tombstone'
);
reset role;

select ok(
  exists (
    select 1
    from private.account_deletion_tombstones
    where request_id = '38383838-aaaa-4aaa-8aaa-383838383838'
      and state = 'completed'
      and user_id is null
      and completed_at is not null
      and last_error_code is null
  ),
  'reconciliation retains audit proof without retaining the deleted user id'
);

set local role service_role;
select is(
  public.reconcile_orphaned_account_deletions(25),
  0,
  'reconciliation is idempotent after the orphan is finalized'
);
reset role;

select * from finish();
rollback;

begin;
select plan(10);

select is(
  has_function_privilege('authenticated', 'public.claim_due_account_deletions(integer)', 'EXECUTE'),
  false,
  'members cannot claim deletion jobs'
);

select is(
  has_function_privilege('service_role', 'public.claim_due_account_deletions(integer)', 'EXECUTE'),
  true,
  'service role can claim deletion jobs'
);

select is(
  has_function_privilege('authenticated', 'public.purge_account_private_data(uuid)', 'EXECUTE'),
  false,
  'members cannot purge private account data directly'
);

select is(
  has_function_privilege('service_role', 'public.purge_account_private_data(uuid)', 'EXECUTE'),
  true,
  'service role can purge private account data during deletion'
);

insert into auth.users (
  id,
  instance_id,
  aud,
  role,
  created_at,
  updated_at
) values (
  '66666666-6666-4666-8666-666666666666',
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  now(),
  now()
)
on conflict (id) do nothing;

insert into public.users (id, account_status)
values ('66666666-6666-4666-8666-666666666666', 'deletion_pending')
on conflict (id) do update set account_status = excluded.account_status;

insert into public.deletion_requests (
  id,
  user_id,
  request_scope,
  status,
  requested_at,
  due_at
) values (
  'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
  '66666666-6666-4666-8666-666666666666',
  'entire_account',
  'requested',
  now() - interval '31 days',
  now() - interval '1 day'
);

insert into private.phone_verifications (
  id,
  user_id,
  provider,
  purpose,
  status,
  phone_last4
) values (
  'ffffffff-ffff-4fff-8fff-ffffffffffff',
  '66666666-6666-4666-8666-666666666666',
  'test',
  'waitlist_login',
  'verified',
  '0000'
);

set local role service_role;
create temporary table claimed_deletions on commit drop as
select * from public.claim_due_account_deletions(5);
reset role;

select is(
  (select count(*)::integer from claimed_deletions),
  1,
  'one due deletion request is claimed'
);

select is(
  (select status::text from public.deletion_requests where id = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee'),
  'in_progress',
  'claim moves the request into processing'
);

select is(
  (select state from private.account_deletion_tombstones where request_id = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee'),
  'processing',
  'claim creates a private processing tombstone'
);

set local role service_role;
select public.purge_account_private_data('66666666-6666-4666-8666-666666666666');
reset role;

select is(
  (
    select count(*)::integer
    from private.phone_verifications
    where user_id = '66666666-6666-4666-8666-666666666666'
  ),
  0,
  'worker purges retained private phone verification data before auth deletion'
);

set local role service_role;
select public.mark_account_deletion_failed(
  'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
  'test_failure'
);
reset role;

select is(
  (
    select status::text || ':' || last_error_code
    from public.deletion_requests
    where id = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee'
  ),
  'requested:test_failure',
  'failed work is safely returned to the queue with a bounded error code'
);

update public.deletion_requests
set status = 'in_progress', processing_started_at = now()
where id = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';

update private.account_deletion_tombstones
set state = 'processing', user_id = '66666666-6666-4666-8666-666666666666'
where request_id = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';

set local role service_role;
select public.mark_account_deletion_completed('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee');
reset role;

select ok(
  exists (
    select 1
    from private.account_deletion_tombstones
    where request_id = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee'
      and state = 'completed'
      and user_id is null
      and completed_at is not null
  ),
  'completed tombstone retains audit proof without retaining the user id'
);

select * from finish();
rollback;

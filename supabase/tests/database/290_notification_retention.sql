begin;
select plan(10);

select is(
  has_function_privilege(
    'authenticated',
    'public.purge_read_member_notifications(timestamptz, integer)',
    'EXECUTE'
  ),
  false,
  'members cannot execute the notification retention worker'
);

select is(
  has_function_privilege(
    'service_role',
    'public.purge_read_member_notifications(timestamptz, integer)',
    'EXECUTE'
  ),
  true,
  'trusted services can execute the notification retention worker'
);

select is(
  has_table_privilege('authenticated', 'private.notification_retention_runs', 'SELECT'),
  false,
  'members cannot inspect private notification retention audits'
);

insert into auth.users (id, instance_id, aud, role, created_at, updated_at) values
  ('29292929-2929-4929-8929-292929292911', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', now(), now()),
  ('29292929-2929-4929-8929-292929292912', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', now(), now()),
  ('29292929-2929-4929-8929-292929292913', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', now(), now())
on conflict (id) do nothing;

insert into public.users (id) values
  ('29292929-2929-4929-8929-292929292911'),
  ('29292929-2929-4929-8929-292929292912'),
  ('29292929-2929-4929-8929-292929292913')
on conflict (id) do nothing;

set local role service_role;

insert into private.controlled_introductions (
  id,
  user_a_id,
  user_b_id,
  status,
  created_at,
  expires_at,
  closed_at,
  created_by
) values
  (
    '29292929-aaaa-4aaa-8aaa-292929292911',
    '29292929-2929-4929-8929-292929292911',
    '29292929-2929-4929-8929-292929292912',
    'closed',
    clock_timestamp() - interval '100 days',
    clock_timestamp() - interval '99 days',
    clock_timestamp() - interval '80 days',
    'notification-retention-test'
  ),
  (
    '29292929-bbbb-4bbb-8bbb-292929292912',
    '29292929-2929-4929-8929-292929292911',
    '29292929-2929-4929-8929-292929292913',
    'closed',
    clock_timestamp() - interval '10 days',
    clock_timestamp() - interval '9 days',
    clock_timestamp() - interval '5 days',
    'notification-retention-test'
  );

insert into private.member_notifications (
  id,
  user_id,
  kind,
  introduction_id,
  created_at,
  read_at
) values
  (
    '29292929-1111-4111-8111-292929292911',
    '29292929-2929-4929-8929-292929292911',
    'introduction_offered',
    '29292929-aaaa-4aaa-8aaa-292929292911',
    clock_timestamp() - interval '80 days',
    clock_timestamp() - interval '70 days'
  ),
  (
    '29292929-2222-4222-8222-292929292912',
    '29292929-2929-4929-8929-292929292912',
    'introduction_offered',
    '29292929-aaaa-4aaa-8aaa-292929292911',
    clock_timestamp() - interval '80 days',
    null
  ),
  (
    '29292929-3333-4333-8333-292929292913',
    '29292929-2929-4929-8929-292929292913',
    'introduction_offered',
    '29292929-bbbb-4bbb-8bbb-292929292912',
    clock_timestamp() - interval '5 days',
    clock_timestamp() - interval '4 days'
  );

select is(
  public.purge_read_member_notifications(clock_timestamp() - interval '30 days', 100),
  1,
  'notification retention deletes only old read activity'
);

select is(
  (select count(*)::integer from private.member_notifications where id = '29292929-1111-4111-8111-292929292911'),
  0,
  'old read activity is purged'
);

select is(
  (select count(*)::integer from private.member_notifications where id = '29292929-2222-4222-8222-292929292912'),
  1,
  'old unread activity is never purged'
);

select is(
  (select count(*)::integer from private.member_notifications where id = '29292929-3333-4333-8333-292929292913'),
  1,
  'recent read activity remains before the cutoff'
);

select is(
  (select notifications_deleted from private.notification_retention_runs order by recorded_at desc, id desc limit 1),
  1,
  'notification retention audit records the deletion count'
);

select throws_ok(
  $$select public.purge_read_member_notifications(clock_timestamp() + interval '1 day', 100)$$,
  'P0001',
  'notification retention cutoff must be in the past',
  'notification retention rejects a future cutoff'
);

select throws_ok(
  $$select public.purge_read_member_notifications(clock_timestamp() - interval '30 days', 0)$$,
  'P0001',
  'notification retention limit must be between 1 and 10000',
  'notification retention rejects an invalid batch limit'
);

reset role;
select * from finish();
rollback;

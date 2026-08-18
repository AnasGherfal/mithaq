begin;
select plan(9);

select is(
  has_function_privilege(
    'authenticated',
    'public.list_my_notifications_v2(timestamptz, uuid, integer)',
    'EXECUTE'
  ),
  true,
  'members can execute cursor-safe notification listing'
);

select is(
  has_function_privilege(
    'anon',
    'public.list_my_notifications_v2(timestamptz, uuid, integer)',
    'EXECUTE'
  ),
  false,
  'anonymous clients cannot execute cursor-safe notification listing'
);

insert into auth.users (id, instance_id, aud, role, created_at, updated_at) values
  ('30303030-3030-4030-8030-303030303011', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', now(), now()),
  ('30303030-3030-4030-8030-303030303012', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', now(), now())
on conflict (id) do nothing;

insert into public.users (id) values
  ('30303030-3030-4030-8030-303030303011'),
  ('30303030-3030-4030-8030-303030303012')
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
    '30303030-aaaa-4aaa-8aaa-303030303011',
    '30303030-3030-4030-8030-303030303011',
    '30303030-3030-4030-8030-303030303012',
    'closed',
    '2026-08-17 00:00:00+00',
    '2026-08-17 01:00:00+00',
    '2026-08-17 02:00:00+00',
    'notification-cursor-test'
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
    '30303030-1111-4111-8111-303030303001',
    '30303030-3030-4030-8030-303030303011',
    'introduction_offered',
    '30303030-aaaa-4aaa-8aaa-303030303011',
    '2026-08-18 04:00:00+00',
    null
  ),
  (
    '30303030-1111-4111-8111-303030303002',
    '30303030-3030-4030-8030-303030303011',
    'introduction_offered',
    '30303030-aaaa-4aaa-8aaa-303030303011',
    '2026-08-18 04:00:00+00',
    null
  ),
  (
    '30303030-1111-4111-8111-303030303003',
    '30303030-3030-4030-8030-303030303011',
    'introduction_offered',
    '30303030-aaaa-4aaa-8aaa-303030303011',
    '2026-08-18 04:00:00+00',
    null
  ),
  (
    '30303030-1111-4111-8111-303030303004',
    '30303030-3030-4030-8030-303030303011',
    'introduction_offered',
    '30303030-aaaa-4aaa-8aaa-303030303011',
    '2026-08-18 03:59:59+00',
    null
  );

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '30303030-3030-4030-8030-303030303011', true);

select is(
  (select count(*)::integer from public.list_my_notifications_v2(null, null, 2)),
  2,
  'first activity page respects the requested page size'
);

select is(
  (
    select array_agg(notification_id order by created_at desc, notification_id desc)
    from public.list_my_notifications_v2(null, null, 2)
  ),
  array[
    '30303030-1111-4111-8111-303030303003'::uuid,
    '30303030-1111-4111-8111-303030303002'::uuid
  ],
  'first page returns the two highest ids when timestamps tie'
);

select is(
  (
    select count(*)::integer
    from public.list_my_notifications_v2(
      '2026-08-18 04:00:00+00',
      '30303030-1111-4111-8111-303030303002',
      2
    )
  ),
  2,
  'second page fills normally after a tied timestamp cursor'
);

select is(
  (
    select array_agg(notification_id order by created_at desc, notification_id desc)
    from public.list_my_notifications_v2(
      '2026-08-18 04:00:00+00',
      '30303030-1111-4111-8111-303030303002',
      2
    )
  ),
  array[
    '30303030-1111-4111-8111-303030303001'::uuid,
    '30303030-1111-4111-8111-303030303004'::uuid
  ],
  'second page includes the remaining tied event before older activity'
);

select is(
  (
    select count(distinct notification_id)::integer
    from (
      select notification_id from public.list_my_notifications_v2(null, null, 2)
      union all
      select notification_id
      from public.list_my_notifications_v2(
        '2026-08-18 04:00:00+00',
        '30303030-1111-4111-8111-303030303002',
        2
      )
    ) pages
  ),
  4,
  'two cursor pages cover all events without duplicates or skips'
);

select throws_ok(
  $$select * from public.list_my_notifications_v2('2026-08-18 04:00:00+00', null, 50)$$,
  'P0001',
  'notification cursor requires timestamp and id',
  'notification cursor rejects a timestamp without an id'
);

select throws_ok(
  $$select * from public.list_my_notifications_v2(null, '30303030-1111-4111-8111-303030303002', 50)$$,
  'P0001',
  'notification cursor requires timestamp and id',
  'notification cursor rejects an id without a timestamp'
);

reset role;
select * from finish();
rollback;

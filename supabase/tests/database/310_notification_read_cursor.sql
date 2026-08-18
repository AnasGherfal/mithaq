begin;
select plan(8);

select is(
  has_function_privilege(
    'authenticated',
    'public.mark_my_notifications_read_v2(timestamptz, uuid)',
    'EXECUTE'
  ),
  true,
  'members can acknowledge activity through an exact cursor'
);

select is(
  has_function_privilege(
    'anon',
    'public.mark_my_notifications_read_v2(timestamptz, uuid)',
    'EXECUTE'
  ),
  false,
  'anonymous clients cannot acknowledge member activity'
);

insert into auth.users (id, instance_id, aud, role, created_at, updated_at) values
  ('31313131-3131-4131-8131-313131313111', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', now(), now()),
  ('31313131-3131-4131-8131-313131313112', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', now(), now())
on conflict (id) do nothing;

insert into public.users (id) values
  ('31313131-3131-4131-8131-313131313111'),
  ('31313131-3131-4131-8131-313131313112')
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
    '31313131-aaaa-4aaa-8aaa-313131313111',
    '31313131-3131-4131-8131-313131313111',
    '31313131-3131-4131-8131-313131313112',
    'closed',
    '2026-08-17 00:00:00+00',
    '2026-08-17 01:00:00+00',
    '2026-08-17 02:00:00+00',
    'notification-read-cursor-test'
  ),
  (
    '31313131-aaaa-4aaa-8aaa-313131313112',
    '31313131-3131-4131-8131-313131313111',
    '31313131-3131-4131-8131-313131313112',
    'closed',
    '2026-08-17 03:00:00+00',
    '2026-08-17 04:00:00+00',
    '2026-08-17 05:00:00+00',
    'notification-read-cursor-test'
  ),
  (
    '31313131-aaaa-4aaa-8aaa-313131313113',
    '31313131-3131-4131-8131-313131313111',
    '31313131-3131-4131-8131-313131313112',
    'closed',
    '2026-08-17 06:00:00+00',
    '2026-08-17 07:00:00+00',
    '2026-08-17 08:00:00+00',
    'notification-read-cursor-test'
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
    '31313131-1111-4111-8111-313131313101',
    '31313131-3131-4131-8131-313131313111',
    'introduction_offered',
    '31313131-aaaa-4aaa-8aaa-313131313111',
    '2026-08-18 05:00:00+00',
    null
  ),
  (
    '31313131-1111-4111-8111-313131313102',
    '31313131-3131-4131-8131-313131313111',
    'introduction_offered',
    '31313131-aaaa-4aaa-8aaa-313131313112',
    '2026-08-18 05:00:00+00',
    null
  ),
  (
    '31313131-1111-4111-8111-313131313103',
    '31313131-3131-4131-8131-313131313111',
    'introduction_offered',
    '31313131-aaaa-4aaa-8aaa-313131313113',
    '2026-08-18 05:00:00+00',
    null
  );

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '31313131-3131-4131-8131-313131313111', true);

select is(
  public.mark_my_notifications_read_v2(
    '2026-08-18 05:00:00+00',
    '31313131-1111-4111-8111-313131313102'
  ),
  2,
  'read acknowledgement marks only activity at or below the exact cursor'
);

select is(
  (
    select count(*)::integer
    from private.member_notifications
    where user_id = '31313131-3131-4131-8131-313131313111'
      and id in (
        '31313131-1111-4111-8111-313131313101',
        '31313131-1111-4111-8111-313131313102'
      )
      and read_at is not null
  ),
  2,
  'cursor event and lower-id tied event are read'
);

select is(
  (
    select count(*)::integer
    from private.member_notifications
    where id = '31313131-1111-4111-8111-313131313103'
      and read_at is null
  ),
  1,
  'higher-id event at the same timestamp stays unread because it was beyond the cursor'
);

select is(
  public.get_my_notification_unread_count(),
  1::bigint,
  'unread count preserves the concurrent tied event'
);

select throws_ok(
  $$select public.mark_my_notifications_read_v2(
    '2026-08-18 05:00:00+00',
    '31313131-1111-4111-8111-313131313199'
  )$$,
  'P0001',
  'notification read cursor unavailable',
  'member cannot acknowledge through a cursor that is not in their inbox'
);

select throws_ok(
  $$select public.mark_my_notifications_read_v2(null, null)$$,
  'P0001',
  'notification read cursor requires timestamp and id',
  'read acknowledgement requires both cursor components'
);

reset role;
select * from finish();
rollback;

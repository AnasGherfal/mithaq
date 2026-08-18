begin;
select plan(9);

insert into auth.users (id, instance_id, aud, role, created_at, updated_at) values
  ('33333333-3333-4333-8333-333333333301', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', now(), now()),
  ('33333333-3333-4333-8333-333333333302', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', now(), now())
on conflict (id) do nothing;

insert into public.users (id) values
  ('33333333-3333-4333-8333-333333333301'),
  ('33333333-3333-4333-8333-333333333302')
on conflict (id) do nothing;

set local role service_role;

insert into private.controlled_introductions (
  id,
  user_a_id,
  user_b_id,
  expires_at,
  created_by
) values (
  '33333333-aaaa-4aaa-8aaa-333333333301',
  '33333333-3333-4333-8333-333333333301',
  '33333333-3333-4333-8333-333333333302',
  clock_timestamp() + interval '7 days',
  'mutual-notification-test'
);

select is(
  (select count(*)::integer from private.member_notifications where user_id = '33333333-3333-4333-8333-333333333301' and kind = 'introduction_offered'),
  1,
  'first member receives the original private introduction offer event'
);

update private.controlled_introductions
set user_a_decision = 'accepted',
    user_b_decision = 'accepted',
    status = 'mutually_accepted',
    mutually_accepted_at = clock_timestamp()
where id = '33333333-aaaa-4aaa-8aaa-333333333301';

select is(
  (select count(*)::integer from private.member_notifications where user_id = '33333333-3333-4333-8333-333333333301' and kind = 'introduction_mutually_accepted'),
  1,
  'first member receives one mutual-acceptance activity event'
);

select is(
  (select count(*)::integer from private.member_notifications where user_id = '33333333-3333-4333-8333-333333333302' and kind = 'introduction_mutually_accepted'),
  1,
  'second member receives one mutual-acceptance activity event'
);

select is(
  (select count(*)::integer from private.member_notifications where introduction_id = '33333333-aaaa-4aaa-8aaa-333333333301' and kind = 'introduction_mutually_accepted' and message_id is null),
  2,
  'mutual-acceptance activity never stores message content references'
);

update private.controlled_introductions
set status = 'mutually_accepted'
where id = '33333333-aaaa-4aaa-8aaa-333333333301';

select is(
  (select count(*)::integer from private.member_notifications where introduction_id = '33333333-aaaa-4aaa-8aaa-333333333301' and kind = 'introduction_mutually_accepted'),
  2,
  'repeated writes of the same accepted status do not duplicate activity events'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '33333333-3333-4333-8333-333333333301', true);

select is(
  (select count(*)::integer from public.list_my_notifications_v2(null, null, 50)),
  2,
  'first member sees only their offer and mutual-acceptance activity events'
);

select is(
  (select count(*)::integer from public.list_my_notifications_v2(null, null, 50) where notification_kind = 'introduction_mutually_accepted'),
  1,
  'mutual acceptance is exposed through the same guarded activity RPC'
);

select is(
  public.get_my_notification_unread_count(),
  2::bigint,
  'mutual acceptance contributes to the private unread activity count'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '33333333-3333-4333-8333-333333333302', true);

select is(
  (select count(*)::integer from public.list_my_notifications_v2(null, null, 50)),
  2,
  'second member independently receives the same two private lifecycle events'
);

reset role;
select * from finish();
rollback;

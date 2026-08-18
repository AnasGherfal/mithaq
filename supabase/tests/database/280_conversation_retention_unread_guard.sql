begin;
select plan(7);

select is(
  has_function_privilege(
    'authenticated',
    'public.purge_closed_conversation_messages(timestamptz, integer)',
    'EXECUTE'
  ),
  false,
  'untrusted members cannot invoke retention while unread activity exists'
);

insert into auth.users (id, instance_id, aud, role, created_at, updated_at) values
  ('28282828-2828-4828-8828-282828282811', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', now(), now()),
  ('28282828-2828-4828-8828-282828282812', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', now(), now())
on conflict (id) do nothing;

insert into public.users (id) values
  ('28282828-2828-4828-8828-282828282811'),
  ('28282828-2828-4828-8828-282828282812')
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
) values (
  '28282828-aaaa-4aaa-8aaa-282828282811',
  '28282828-2828-4828-8828-282828282811',
  '28282828-2828-4828-8828-282828282812',
  'closed',
  clock_timestamp() - interval '100 days',
  clock_timestamp() - interval '99 days',
  clock_timestamp() - interval '80 days',
  'unread-retention-test'
);

insert into private.introduction_conversations (
  id,
  introduction_id,
  user_a_id,
  user_b_id,
  status,
  opened_at,
  closed_at
) values (
  '28282828-1111-4111-8111-282828282811',
  '28282828-aaaa-4aaa-8aaa-282828282811',
  '28282828-2828-4828-8828-282828282811',
  '28282828-2828-4828-8828-282828282812',
  'closed',
  clock_timestamp() - interval '90 days',
  clock_timestamp() - interval '80 days'
);

insert into private.conversation_messages (
  id,
  conversation_id,
  sender_user_id,
  body,
  sent_at
) values (
  '28282828-bbbb-4bbb-8bbb-282828282811',
  '28282828-1111-4111-8111-282828282811',
  '28282828-2828-4828-8828-282828282811',
  'Unread activity must keep this message until the recipient has seen it.',
  clock_timestamp() - interval '85 days'
);

select is(
  public.purge_closed_conversation_messages(clock_timestamp() - interval '30 days', 100),
  0,
  'retention skips an otherwise eligible conversation with unread message activity'
);

select is(
  (select count(*)::integer from private.conversation_messages where id = '28282828-bbbb-4bbb-8bbb-282828282811'),
  1,
  'message remains while its notification is unread'
);

select is(
  (
    select count(*)::integer
    from private.member_notifications
    where message_id = '28282828-bbbb-4bbb-8bbb-282828282811'
      and read_at is null
  ),
  1,
  'recipient unread activity remains intact'
);

update private.member_notifications
set read_at = clock_timestamp()
where message_id = '28282828-bbbb-4bbb-8bbb-282828282811';

select is(
  public.purge_closed_conversation_messages(clock_timestamp() - interval '30 days', 100),
  1,
  'retention can purge the message after the recipient activity is read'
);

select is(
  (select count(*)::integer from private.conversation_messages where id = '28282828-bbbb-4bbb-8bbb-282828282811'),
  0,
  'message is removed once unread protection no longer applies'
);

select is(
  (select count(*)::integer from private.member_notifications where message_id = '28282828-bbbb-4bbb-8bbb-282828282811'),
  0,
  'read message activity cascades away with its retained message reference'
);

reset role;
select * from finish();
rollback;

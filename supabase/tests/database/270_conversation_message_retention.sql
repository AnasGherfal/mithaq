begin;
select plan(11);

select is(
  has_function_privilege(
    'authenticated',
    'public.purge_closed_conversation_messages(timestamptz, integer)',
    'EXECUTE'
  ),
  false,
  'members cannot execute the conversation retention worker'
);

select is(
  has_function_privilege(
    'service_role',
    'public.purge_closed_conversation_messages(timestamptz, integer)',
    'EXECUTE'
  ),
  true,
  'trusted services can execute the conversation retention worker'
);

select is(
  has_table_privilege('authenticated', 'private.conversation_retention_runs', 'SELECT'),
  false,
  'members cannot inspect private retention audit rows'
);

select is(
  has_table_privilege('service_role', 'private.conversation_retention_runs', 'SELECT'),
  true,
  'trusted services can inspect retention audit rows'
);

insert into auth.users (id, instance_id, aud, role, created_at, updated_at) values
  ('27272727-2727-4727-8727-272727272711', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', now(), now()),
  ('27272727-2727-4727-8727-272727272712', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', now(), now()),
  ('27272727-2727-4727-8727-272727272713', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', now(), now()),
  ('27272727-2727-4727-8727-272727272714', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', now(), now())
on conflict (id) do nothing;

insert into public.users (id) values
  ('27272727-2727-4727-8727-272727272711'),
  ('27272727-2727-4727-8727-272727272712'),
  ('27272727-2727-4727-8727-272727272713'),
  ('27272727-2727-4727-8727-272727272714')
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
    '27272727-aaaa-4aaa-8aaa-272727272711',
    '27272727-2727-4727-8727-272727272711',
    '27272727-2727-4727-8727-272727272712',
    'closed',
    clock_timestamp() - interval '100 days',
    clock_timestamp() - interval '99 days',
    clock_timestamp() - interval '80 days',
    'retention-test'
  ),
  (
    '27272727-bbbb-4bbb-8bbb-272727272712',
    '27272727-2727-4727-8727-272727272711',
    '27272727-2727-4727-8727-272727272713',
    'closed',
    clock_timestamp() - interval '100 days',
    clock_timestamp() - interval '99 days',
    clock_timestamp() - interval '80 days',
    'retention-test'
  ),
  (
    '27272727-cccc-4ccc-8ccc-272727272713',
    '27272727-2727-4727-8727-272727272711',
    '27272727-2727-4727-8727-272727272714',
    'closed',
    clock_timestamp() - interval '10 days',
    clock_timestamp() - interval '9 days',
    clock_timestamp() - interval '5 days',
    'retention-test'
  );

insert into private.introduction_conversations (
  id,
  introduction_id,
  user_a_id,
  user_b_id,
  status,
  opened_at,
  closed_at
) values
  (
    '27272727-1111-4111-8111-272727272711',
    '27272727-aaaa-4aaa-8aaa-272727272711',
    '27272727-2727-4727-8727-272727272711',
    '27272727-2727-4727-8727-272727272712',
    'closed',
    clock_timestamp() - interval '90 days',
    clock_timestamp() - interval '80 days'
  ),
  (
    '27272727-2222-4222-8222-272727272712',
    '27272727-bbbb-4bbb-8bbb-272727272712',
    '27272727-2727-4727-8727-272727272711',
    '27272727-2727-4727-8727-272727272713',
    'closed',
    clock_timestamp() - interval '90 days',
    clock_timestamp() - interval '80 days'
  ),
  (
    '27272727-3333-4333-8333-272727272713',
    '27272727-cccc-4ccc-8ccc-272727272713',
    '27272727-2727-4727-8727-272727272711',
    '27272727-2727-4727-8727-272727272714',
    'closed',
    clock_timestamp() - interval '7 days',
    clock_timestamp() - interval '5 days'
  );

insert into private.conversation_messages (conversation_id, sender_user_id, body, sent_at) values
  (
    '27272727-1111-4111-8111-272727272711',
    '27272727-2727-4727-8727-272727272711',
    'Old closed conversation message one',
    clock_timestamp() - interval '85 days'
  ),
  (
    '27272727-1111-4111-8111-272727272711',
    '27272727-2727-4727-8727-272727272712',
    'Old closed conversation message two',
    clock_timestamp() - interval '84 days'
  ),
  (
    '27272727-2222-4222-8222-272727272712',
    '27272727-2727-4727-8727-272727272713',
    'Safety-review evidence must remain',
    clock_timestamp() - interval '84 days'
  ),
  (
    '27272727-3333-4333-8333-272727272713',
    '27272727-2727-4727-8727-272727272714',
    'Recent closed conversation remains before cutoff',
    clock_timestamp() - interval '4 days'
  );

insert into public.safety_reports (
  reporter_user_id,
  target_user_id,
  category,
  details,
  status,
  reported_at,
  status_updated_at
) values (
  '27272727-2727-4727-8727-272727272711',
  '27272727-2727-4727-8727-272727272713',
  'safety_concern',
  'Keep related conversation evidence until the review is resolved.',
  'investigating',
  clock_timestamp() - interval '70 days',
  clock_timestamp() - interval '1 day'
);

select is(
  public.purge_closed_conversation_messages(clock_timestamp() - interval '30 days', 100),
  2,
  'retention worker deletes messages only from eligible old closed conversations'
);

select is(
  (select count(*)::integer from private.conversation_messages where conversation_id = '27272727-1111-4111-8111-272727272711'),
  0,
  'eligible old closed conversation message bodies are purged'
);

select is(
  (select count(*)::integer from private.conversation_messages where conversation_id = '27272727-2222-4222-8222-272727272712'),
  1,
  'unresolved safety review preserves related conversation evidence'
);

select is(
  (select count(*)::integer from private.conversation_messages where conversation_id = '27272727-3333-4333-8333-272727272713'),
  1,
  'conversation closed after the cutoff is not purged'
);

select is(
  (select messages_deleted from private.conversation_retention_runs order by recorded_at desc, id desc limit 1),
  2,
  'retention run records the deleted message count privately'
);

select is(
  (select conversations_selected from private.conversation_retention_runs order by recorded_at desc, id desc limit 1),
  1,
  'retention run records how many conversations were selected'
);

select throws_ok(
  $$select public.purge_closed_conversation_messages(clock_timestamp() + interval '1 day', 100)$$,
  'P0001',
  'retention cutoff must be in the past',
  'retention worker rejects a future cutoff'
);

select throws_ok(
  $$select public.purge_closed_conversation_messages(clock_timestamp() - interval '30 days', 0)$$,
  'P0001',
  'retention limit must be between 1 and 5000',
  'retention worker rejects an invalid batch limit'
);

reset role;
select * from finish();
rollback;

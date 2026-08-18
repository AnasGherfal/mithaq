begin;
select plan(16);

select is(
  has_function_privilege(
    'authenticated',
    'public.record_account_deletion_worker_run(text, integer, integer, integer, integer, text)',
    'EXECUTE'
  ),
  false,
  'members cannot write account deletion worker audit records'
);

select is(
  has_function_privilege(
    'service_role',
    'public.record_account_deletion_worker_run(text, integer, integer, integer, integer, text)',
    'EXECUTE'
  ),
  true,
  'trusted deletion worker can write its run audit'
);

select is(
  has_table_privilege('authenticated', 'private.account_deletion_worker_runs', 'SELECT'),
  false,
  'members cannot inspect private account deletion worker runs'
);

select is(
  has_function_privilege(
    'authenticated',
    'public.get_maintenance_health(timestamptz, timestamptz, interval)',
    'EXECUTE'
  ),
  false,
  'members cannot inspect operational maintenance health'
);

select is(
  has_function_privilege(
    'service_role',
    'public.get_maintenance_health(timestamptz, timestamptz, interval)',
    'EXECUTE'
  ),
  true,
  'trusted operations code can inspect maintenance health'
);

set local role service_role;

select ok(
  public.record_account_deletion_worker_run(
    'succeeded',
    0,
    0,
    0,
    0,
    null
  ) is not null,
  'successful account deletion worker heartbeat is recorded even with no work'
);

select is(
  public.expire_controlled_introductions(10),
  0,
  'empty introduction expiry run still records a successful worker run'
);

select is(
  public.purge_closed_conversation_messages(clock_timestamp() - interval '30 days', 10),
  0,
  'empty conversation retention run records a worker run'
);

select is(
  public.purge_read_member_notifications(clock_timestamp() - interval '30 days', 10),
  0,
  'empty notification retention run records a worker run'
);

select is(
  (
    select count(*)::integer
    from public.get_maintenance_health(
      clock_timestamp() - interval '30 days',
      clock_timestamp() - interval '30 days',
      interval '1 hour'
    )
  ),
  4,
  'maintenance health returns one row per scheduled maintenance worker'
);

select is(
  (
    select count(*)::integer
    from public.get_maintenance_health(
      clock_timestamp() - interval '30 days',
      clock_timestamp() - interval '30 days',
      interval '1 hour'
    )
    where eligible_count = 0
  ),
  4,
  'empty database has no maintenance backlog'
);

select is(
  (
    select count(*)::integer
    from public.get_maintenance_health(
      clock_timestamp() - interval '30 days',
      clock_timestamp() - interval '30 days',
      interval '1 hour'
    )
    where last_run_at is not null
  ),
  4,
  'every maintenance worker has an observable run heartbeat'
);

select is(
  (
    select count(*)::integer
    from public.get_maintenance_health(
      clock_timestamp() - interval '30 days',
      clock_timestamp() - interval '30 days',
      interval '1 hour'
    )
    where worker_status = 'healthy'
  ),
  4,
  'fresh empty worker runs are reported healthy'
);

select throws_ok(
  $$select * from public.get_maintenance_health(
    clock_timestamp() - interval '30 days',
    clock_timestamp() - interval '30 days',
    interval '0 seconds'
  )$$,
  'P0001',
  'worker freshness window must be between 0 and 30 days',
  'maintenance health rejects a zero freshness window'
);

select throws_ok(
  $$select public.record_account_deletion_worker_run(
    'partial',
    0,
    1,
    1,
    1,
    'item_failure'
  )$$,
  'P0001',
  'invalid worker run counts',
  'worker audit rejects impossible completed and failed counts'
);

select throws_ok(
  $$select public.record_account_deletion_worker_run(
    'succeeded',
    0,
    0,
    0,
    0,
    'unexpected_error'
  )$$,
  'P0001',
  'successful worker run cannot have an error code',
  'successful worker audit cannot carry an error code'
);

reset role;
select * from finish();
rollback;

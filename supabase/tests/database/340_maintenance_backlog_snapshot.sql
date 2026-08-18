begin;
select plan(9);

select is(
  has_function_privilege(
    'authenticated',
    'public.get_maintenance_backlog(timestamptz, timestamptz)',
    'EXECUTE'
  ),
  false,
  'members cannot inspect operational maintenance backlog'
);

select is(
  has_function_privilege(
    'service_role',
    'public.get_maintenance_backlog(timestamptz, timestamptz)',
    'EXECUTE'
  ),
  true,
  'trusted services can inspect operational maintenance backlog'
);

set local role service_role;

select is(
  (
    select count(*)::integer
    from public.get_maintenance_backlog(
      clock_timestamp() - interval '30 days',
      clock_timestamp() - interval '30 days'
    )
  ),
  4,
  'maintenance snapshot returns one row per worker class'
);

select is(
  (
    select count(*)::integer
    from public.get_maintenance_backlog(
      clock_timestamp() - interval '30 days',
      clock_timestamp() - interval '30 days'
    )
    where worker_name in (
      'account_deletion',
      'introduction_expiry',
      'conversation_retention',
      'notification_retention'
    )
  ),
  4,
  'maintenance snapshot exposes only the expected worker names'
);

select is(
  (
    select count(*)::integer
    from public.get_maintenance_backlog(
      clock_timestamp() - interval '30 days',
      clock_timestamp() - interval '30 days'
    )
    where eligible_count < 0
  ),
  0,
  'maintenance backlog counts are never negative'
);

select is(
  (
    select count(*)::integer
    from public.get_maintenance_backlog(
      clock_timestamp() - interval '30 days',
      clock_timestamp() - interval '30 days'
    )
    where worker_name = 'account_deletion'
  ),
  1,
  'account deletion backlog is represented exactly once'
);

select is(
  (
    select count(*)::integer
    from public.get_maintenance_backlog(
      clock_timestamp() - interval '30 days',
      clock_timestamp() - interval '30 days'
    )
    where worker_name = 'notification_retention'
  ),
  1,
  'notification retention backlog is represented exactly once'
);

select throws_ok(
  $$select * from public.get_maintenance_backlog(clock_timestamp() + interval '1 day', clock_timestamp() - interval '30 days')$$,
  'P0001',
  'conversation retention cutoff must be in the past',
  'maintenance snapshot rejects a future conversation cutoff'
);

select throws_ok(
  $$select * from public.get_maintenance_backlog(clock_timestamp() - interval '30 days', clock_timestamp() + interval '1 day')$$,
  'P0001',
  'notification retention cutoff must be in the past',
  'maintenance snapshot rejects a future notification cutoff'
);

reset role;
select * from finish();
rollback;

begin;
select plan(8);

set local role service_role;

select ok(
  public.record_account_deletion_worker_run(
    'partial',
    1,
    1,
    0,
    1,
    'item_failures'
  ) is not null,
  'partial deletion worker run is recorded'
);

select is(
  (
    select worker_status
    from public.get_maintenance_health(
      clock_timestamp() - interval '30 days',
      clock_timestamp() - interval '30 days',
      interval '1 hour'
    )
    where worker_name = 'account_deletion'
  ),
  'degraded',
  'a fresh partial deletion worker run is reported degraded'
);

select ok(
  public.record_account_deletion_worker_run(
    'failed',
    0,
    0,
    0,
    0,
    'claim_failed'
  ) is not null,
  'failed deletion worker run is recorded'
);

select is(
  (
    select worker_status
    from public.get_maintenance_health(
      clock_timestamp() - interval '30 days',
      clock_timestamp() - interval '30 days',
      interval '1 hour'
    )
    where worker_name = 'account_deletion'
  ),
  'failed',
  'a fresh failed deletion worker run is reported failed'
);

select ok(
  public.record_account_deletion_worker_run(
    'succeeded',
    0,
    0,
    0,
    0,
    null
  ) is not null,
  'subsequent successful deletion worker run is recorded'
);

select is(
  (
    select worker_status
    from public.get_maintenance_health(
      clock_timestamp() - interval '30 days',
      clock_timestamp() - interval '30 days',
      interval '1 hour'
    )
    where worker_name = 'account_deletion'
  ),
  'healthy',
  'a fresh successful deletion worker run restores healthy status when no backlog exists'
);

select is(
  (
    select count(*)::integer
    from public.get_maintenance_health(
      clock_timestamp() - interval '30 days',
      clock_timestamp() - interval '30 days',
      interval '1 hour'
    )
    where worker_status in ('failed', 'degraded')
  ),
  0,
  'older failure outcomes do not poison health after a successful run'
);

select is(
  (
    select count(*)::integer
    from private.account_deletion_worker_runs
  ),
  3,
  'all deletion worker run outcomes remain privately auditable'
);

reset role;
select * from finish();
rollback;

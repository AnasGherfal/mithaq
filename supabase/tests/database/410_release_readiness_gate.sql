begin;
select plan(6);

select is(
  has_function_privilege(
    'authenticated',
    'public.get_release_readiness(timestamptz,timestamptz,interval,bigint)',
    'EXECUTE'
  ),
  false,
  'members cannot inspect release readiness'
);

select is(
  has_function_privilege(
    'service_role',
    'public.get_release_readiness(timestamptz,timestamptz,interval,bigint)',
    'EXECUTE'
  ),
  true,
  'trusted services can inspect release readiness'
);

set local role service_role;

select is(
  (select is_ready from public.get_release_readiness(
    clock_timestamp() - interval '30 days',
    clock_timestamp() - interval '30 days',
    interval '2 hours',
    0
  )),
  false,
  'a fresh environment is not release-ready before maintenance workers have run'
);

select cmp_ok(
  (select blocking_worker_count from public.get_release_readiness(
    clock_timestamp() - interval '30 days',
    clock_timestamp() - interval '30 days',
    interval '2 hours',
    0
  )),
  '>=',
  1,
  'release readiness reports at least one blocking worker in a fresh environment'
);

select is(
  cardinality((select blocking_workers from public.get_release_readiness(
    clock_timestamp() - interval '30 days',
    clock_timestamp() - interval '30 days',
    interval '2 hours',
    0
  ))),
  (select blocking_worker_count from public.get_release_readiness(
    clock_timestamp() - interval '30 days',
    clock_timestamp() - interval '30 days',
    interval '2 hours',
    0
  )),
  'blocking worker names and count stay consistent'
);

select throws_ok(
  $$select * from public.get_release_readiness(
    clock_timestamp() - interval '30 days',
    clock_timestamp() - interval '30 days',
    interval '2 hours',
    -1
  )$$,
  'P0001',
  'maximum backlog must be between 0 and 1000000',
  'release readiness rejects an invalid backlog tolerance'
);

select * from finish();
rollback;

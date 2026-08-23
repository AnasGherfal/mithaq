begin;
select plan(12);

select is(
  has_function_privilege(
    'authenticated',
    'public.queue_my_member_photo_cleanup(text,text)',
    'EXECUTE'
  ),
  true,
  'members can queue cleanup for their own private photo paths'
);

select is(
  has_function_privilege(
    'anon',
    'public.queue_my_member_photo_cleanup(text,text)',
    'EXECUTE'
  ),
  false,
  'anonymous clients cannot queue private photo cleanup'
);

select is(
  has_function_privilege(
    'authenticated',
    'public.claim_member_photo_cleanup_jobs(integer)',
    'EXECUTE'
  ),
  false,
  'members cannot claim cleanup worker jobs'
);

select is(
  has_function_privilege(
    'service_role',
    'public.claim_member_photo_cleanup_jobs(integer)',
    'EXECUTE'
  ),
  true,
  'trusted cleanup worker can claim jobs'
);

insert into auth.users (
  id,
  instance_id,
  aud,
  role,
  created_at,
  updated_at
) values
  (
    '56565656-5656-4565-8565-565656565651',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    now(),
    now()
  ),
  (
    '56565656-5656-4565-8565-565656565652',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    now(),
    now()
  )
on conflict (id) do nothing;

insert into public.users (id)
values
  ('56565656-5656-4565-8565-565656565651'),
  ('56565656-5656-4565-8565-565656565652')
on conflict (id) do nothing;

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '56565656-5656-4565-8565-565656565651',
  true
);

select is(
  public.queue_my_member_photo_cleanup(
    '56565656-5656-4565-8565-565656565651/old-photo.jpg',
    'replace'
  ),
  true,
  'member can queue cleanup for an owned path'
);

select throws_ok(
  $$select public.queue_my_member_photo_cleanup(
    '56565656-5656-4565-8565-565656565652/not-mine.jpg',
    'delete'
  )$$,
  'P0001',
  'invalid member photo cleanup path',
  'member cannot queue another member path'
);

select throws_ok(
  $$select public.queue_my_member_photo_cleanup(
    '56565656-5656-4565-8565-565656565651/old-photo.jpg',
    'unknown'
  )$$,
  'P0001',
  'invalid member photo cleanup reason',
  'cleanup reason is constrained'
);

reset role;
set local role service_role;

create temporary table claimed_cleanup_jobs as
select * from public.claim_member_photo_cleanup_jobs(25);

select is(
  (select count(*)::integer from claimed_cleanup_jobs),
  1,
  'worker claims one queued job'
);

select is(
  (
    select state::text
    from private.member_photo_cleanup_jobs
    where id = (select job_id from claimed_cleanup_jobs limit 1)
  ),
  'processing',
  'claim transitions the job to processing'
);

select is(
  public.fail_member_photo_cleanup_job(
    (select job_id from claimed_cleanup_jobs limit 1),
    'storage_remove_failed'
  ),
  true,
  'worker can mark a cleanup attempt failed for retry'
);

update private.member_photo_cleanup_jobs
set available_at = clock_timestamp() - interval '1 minute'
where storage_path = '56565656-5656-4565-8565-565656565651/old-photo.jpg';

truncate claimed_cleanup_jobs;
insert into claimed_cleanup_jobs
select * from public.claim_member_photo_cleanup_jobs(25);

select is(
  public.complete_member_photo_cleanup_job(
    (select job_id from claimed_cleanup_jobs limit 1)
  ),
  true,
  'worker can complete a retried cleanup job'
);

select is(
  (
    select state::text
    from private.member_photo_cleanup_jobs
    where storage_path = '56565656-5656-4565-8565-565656565651/old-photo.jpg'
  ),
  'completed',
  'completed cleanup stays recorded for audit and deduplication'
);

reset role;
select * from finish();
rollback;

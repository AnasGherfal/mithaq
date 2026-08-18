begin;
select plan(6);

select ok(
  to_regclass('private.conversation_messages_sender_rate_idx') is not null,
  'message sender rate-limit index exists'
);

select ok(
  to_regclass('public.safety_reports_open_reporter_target_idx') is not null,
  'open safety report reporter-target index exists'
);

select ok(
  to_regclass('public.safety_reports_open_target_reporter_idx') is not null,
  'open safety report target-reporter index exists'
);

select is(
  (
    select i.indisvalid
    from pg_index i
    where i.indexrelid = 'private.conversation_messages_sender_rate_idx'::regclass
  ),
  true,
  'message sender rate-limit index is valid'
);

select is(
  (
    select i.indisvalid
    from pg_index i
    where i.indexrelid = 'public.safety_reports_open_reporter_target_idx'::regclass
  ),
  true,
  'reporter-target safety index is valid'
);

select is(
  (
    select i.indisvalid
    from pg_index i
    where i.indexrelid = 'public.safety_reports_open_target_reporter_idx'::regclass
  ),
  true,
  'target-reporter safety index is valid'
);

select * from finish();
rollback;

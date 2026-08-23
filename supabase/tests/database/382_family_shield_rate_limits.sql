begin;
select plan(7);

select ok(
  to_regclass('private.marriage_family_shield_user_time_idx') is not null,
  'Family Shield has a user/time index for rate-limit checks'
);

select ok(
  position(
    'pg_advisory_xact_lock' in
    pg_get_functiondef('public.add_my_marriage_family_shield(text)'::regprocedure)
  ) > 0,
  'Family Shield additions are serialized per member'
);

select ok(
  position(
    'v_total >= 40' in
    pg_get_functiondef('public.add_my_marriage_family_shield(text)'::regprocedure)
  ) > 0,
  'Family Shield has a maximum saved-entry count'
);

select ok(
  position(
    'v_recent >= 12' in
    pg_get_functiondef('public.add_my_marriage_family_shield(text)'::regprocedure)
  ) > 0,
  'Family Shield limits rapid additions'
);

select ok(
  position(
    'interval ''1 hour''' in
    pg_get_functiondef('public.add_my_marriage_family_shield(text)'::regprocedure)
  ) > 0,
  'Family Shield rate limit uses a rolling one-hour window'
);

select ok(
  position(
    'if v_id is not null' in
    lower(pg_get_functiondef('public.add_my_marriage_family_shield(text)'::regprocedure))
  ) > 0,
  'duplicate shield entries return before consuming rate/count limits'
);

select ok(
  exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'friendship_profiles'
      and policyname = 'friendship profiles disabled at launch'
      and qual = 'false'
  ),
  'dormant Friendship profiles have an explicit deny-all launch policy'
);

select * from finish();
rollback;

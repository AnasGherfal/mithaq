begin;
select plan(7);

select is(
  has_table_privilege('anon', 'private.introduction_expiry_runs', 'SELECT'),
  false,
  'anonymous clients cannot read expiry worker run audits'
);

select is(
  has_table_privilege('authenticated', 'private.introduction_expiry_runs', 'SELECT'),
  false,
  'authenticated clients cannot read expiry worker run audits'
);

select is(
  has_table_privilege('service_role', 'private.introduction_expiry_runs', 'SELECT'),
  true,
  'trusted services can inspect expiry worker run audits'
);

set local role service_role;

select is(
  public.expire_controlled_introductions(17),
  0,
  'an empty expiry batch completes successfully'
);

select is(
  (select count(*)::integer from private.introduction_expiry_runs),
  1,
  'every successful expiry worker invocation records one run'
);

select is(
  (select requested_limit from private.introduction_expiry_runs order by recorded_at desc, id desc limit 1),
  17,
  'expiry run audit records the requested batch limit'
);

select is(
  (select introductions_expired from private.introduction_expiry_runs order by recorded_at desc, id desc limit 1),
  0,
  'expiry run audit records the number of introductions expired'
);

reset role;
select * from finish();
rollback;

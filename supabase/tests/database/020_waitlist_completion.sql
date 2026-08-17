begin;
select plan(6);

select has_function(
  'public',
  'finalize_waitlist',
  array['text', 'boolean'],
  'atomic waitlist finalization function exists'
);

select function_returns(
  'public',
  'finalize_waitlist',
  array['text', 'boolean'],
  'text',
  'finalization returns a referral code'
);

select is(
  has_function_privilege('anon', 'public.finalize_waitlist(text, boolean)', 'EXECUTE'),
  false,
  'anonymous users cannot finalize a waitlist registration'
);

select is(
  has_function_privilege('authenticated', 'public.finalize_waitlist(text, boolean)', 'EXECUTE'),
  true,
  'authenticated users may call the guarded finalization function'
);

select is(
  has_table_privilege('authenticated', 'public.referral_codes', 'INSERT'),
  false,
  'authenticated clients cannot insert referral codes directly'
);

select is(
  has_table_privilege('authenticated', 'public.waitlist_consents', 'UPDATE'),
  false,
  'authenticated clients cannot rewrite consent history'
);

select * from finish();
rollback;

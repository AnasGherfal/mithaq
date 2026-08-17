begin;
select plan(10);

select has_table('public', 'waitlist_applications', 'waitlist applications table exists');
select has_table('public', 'waitlist_preferences', 'waitlist preferences table exists');
select has_table('public', 'waitlist_consents', 'append-only consent table exists');
select has_table('public', 'referral_codes', 'referral codes table exists');
select has_table('public', 'deletion_requests', 'deletion requests table exists');
select has_table('private', 'phone_verifications', 'private phone verification audit table exists');

select policies_are(
  'public',
  'waitlist_consents',
  array['consents insert own', 'consents read own'],
  'consent records expose only insert and own-read RLS policies'
);

select policies_are(
  'public',
  'referral_codes',
  array['referral code read own'],
  'users can only read their own referral code'
);

select policies_are(
  'public',
  'deletion_requests',
  array['deletion requests insert own', 'deletion requests read own'],
  'deletion requests expose only own insert and read'
);

select is(
  (select relrowsecurity from pg_class where oid = 'public.waitlist_applications'::regclass),
  true,
  'RLS is enabled on waitlist applications'
);

select * from finish();
rollback;

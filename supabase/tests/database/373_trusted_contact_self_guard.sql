begin;
select plan(3);

select ok(
  position('trusted contact must be another person' in pg_get_functiondef('public.save_my_marriage_trusted_contact(uuid,text,text,text)'::regprocedure)) > 0,
  'trusted contact save rejects the member own phone number'
);

select ok(
  position('auth.users' in pg_get_functiondef('public.save_my_marriage_trusted_contact(uuid,text,text,text)'::regprocedure)) > 0,
  'trusted contact self guard compares against the authenticated phone record'
);

select is(
  has_function_privilege('anon', 'public.save_my_marriage_trusted_contact(uuid,text,text,text)', 'EXECUTE'),
  false,
  'anonymous callers cannot save trusted contacts'
);

select * from finish();
rollback;

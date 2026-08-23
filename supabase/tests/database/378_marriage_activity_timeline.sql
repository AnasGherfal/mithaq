begin;
select plan(8);

select is(
  has_function_privilege(
    'authenticated',
    'public.list_my_marriage_activity(timestamptz,text,integer)',
    'EXECUTE'
  ),
  true,
  'signed-in members can read their guarded Marriage activity timeline'
);

select is(
  has_function_privilege(
    'anon',
    'public.list_my_marriage_activity(timestamptz,text,integer)',
    'EXECUTE'
  ),
  false,
  'anonymous callers cannot read Marriage activity'
);

select ok(
  position(
    'd.action = ''noticed''' in
    pg_get_functiondef('public.list_my_marriage_activity(timestamptz,text,integer)'::regprocedure)
  ) > 0,
  'only positive private interest is included in lifecycle activity'
);

select ok(
  position(
    'e.actor_user_id = v_user_id' in
    pg_get_functiondef('public.list_my_marriage_activity(timestamptz,text,integer)'::regprocedure)
  ) > 0,
  'one-sided introduction acceptance is limited to the member own decision'
);

select ok(
  position(
    '''mutual_acceptance''' in
    pg_get_functiondef('public.list_my_marriage_activity(timestamptz,text,integer)'::regprocedure)
  ) > 0,
  'mutual acceptance is represented as a distinct lifecycle stage'
);

select ok(
  position(
    'private.introduction_photo_reveal_consents' in
    pg_get_functiondef('public.list_my_marriage_activity(timestamptz,text,integer)'::regprocedure)
  ) > 0,
  'explicit photo reveal is included in lifecycle activity'
);

select ok(
  position(
    'private.introduction_trusted_contact_shares' in
    pg_get_functiondef('public.list_my_marriage_activity(timestamptz,text,integer)'::regprocedure)
  ) > 0,
  'Trusted Circle handoff is included in lifecycle activity'
);

select ok(
  position(
    'activity cursor is incomplete' in
    pg_get_functiondef('public.list_my_marriage_activity(timestamptz,text,integer)'::regprocedure)
  ) > 0,
  'activity pagination requires a complete deterministic cursor'
);

select * from finish();
rollback;

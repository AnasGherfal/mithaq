begin;
select plan(10);

select is(
  has_function_privilege('authenticated', 'private.member_open_conversation_id(uuid,uuid)', 'EXECUTE'),
  false,
  'members cannot call the private conversation guard'
);

select is(
  has_function_privilege('service_role', 'private.member_open_conversation_id(uuid,uuid)', 'EXECUTE'),
  true,
  'service role can call the private conversation guard'
);

select is(
  has_function_privilege('authenticated', 'public.open_my_conversation(uuid)', 'EXECUTE'),
  true,
  'authenticated members can open their guarded conversation'
);

select is(
  has_function_privilege('anon', 'public.open_my_conversation(uuid)', 'EXECUTE'),
  false,
  'anonymous users cannot open conversations'
);

select is(
  has_table_privilege('authenticated', 'private.conversation_messages', 'SELECT'),
  false,
  'members cannot read raw conversation messages'
);

select is(
  has_table_privilege('authenticated', 'private.introduction_conversations', 'SELECT'),
  false,
  'members cannot read raw conversation rows'
);

select ok(
  position('marriage_pair_is_hidden' in pg_get_functiondef('private.member_open_conversation_id(uuid,uuid)'::regprocedure)) > 0,
  'conversation reads enforce the Marriage privacy shield'
);

select ok(
  position('marriage_pair_is_hidden' in pg_get_functiondef('public.open_my_conversation(uuid)'::regprocedure)) > 0,
  'conversation opening enforces the Marriage privacy shield'
);

select ok(
  exists (
    select 1
    from pg_trigger
    where tgrelid = 'private.marriage_family_shield'::regclass
      and tgname = 'marriage_family_shield_closes_active_pair'
      and not tgisinternal
  ),
  'Family Shield has an active-pair close trigger'
);

select is(
  has_function_privilege('authenticated', 'private.close_active_pair_after_family_shield()', 'EXECUTE'),
  false,
  'members cannot invoke the Family Shield close trigger function directly'
);

select * from finish();
rollback;

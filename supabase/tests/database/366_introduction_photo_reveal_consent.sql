begin;
select plan(8);

select is(
  has_table_privilege('authenticated', 'private.introduction_photo_reveal_consents', 'SELECT'),
  false,
  'members cannot read raw introduction photo reveal consent rows'
);
select is(
  has_table_privilege('authenticated', 'private.introduction_photo_reveal_consents', 'INSERT'),
  false,
  'members cannot write raw introduction photo reveal consent rows'
);
select is(
  has_function_privilege('authenticated', 'private.introduction_member_photo_is_revealed(uuid,uuid)', 'EXECUTE'),
  false,
  'members cannot call the private photo reveal helper directly'
);
select is(
  has_function_privilege('authenticated', 'public.get_my_introduction_reveal_state(uuid)', 'EXECUTE'),
  true,
  'members can read their guarded introduction reveal state'
);
select is(
  has_function_privilege('authenticated', 'public.reveal_my_introduction_photo(uuid)', 'EXECUTE'),
  true,
  'members can explicitly reveal their own approved photo through the guarded action'
);
select is(
  has_function_privilege('anon', 'public.get_my_introduction_reveal_state(uuid)', 'EXECUTE'),
  false,
  'anonymous callers cannot inspect introduction reveal state'
);
select is(
  has_function_privilege('anon', 'public.reveal_my_introduction_photo(uuid)', 'EXECUTE'),
  false,
  'anonymous callers cannot reveal a member photo'
);
select is(
  has_function_privilege('authenticated', 'public.list_introduction_photo_refs(uuid)', 'EXECUTE'),
  true,
  'authenticated introduction participants retain guarded access to visible photo references'
);

select * from finish();
rollback;

begin;
select plan(4);

select is(
  has_function_privilege('authenticated', 'public.list_my_friendship_chats()', 'EXECUTE'),
  true,
  'authenticated members can use the guarded Friends chat inbox'
);

select is(
  has_function_privilege('anon', 'public.list_my_friendship_chats()', 'EXECUTE'),
  false,
  'anonymous users cannot list Friends chats'
);

select is(
  has_table_privilege('authenticated', 'private.friendship_conversations', 'SELECT'),
  false,
  'members cannot inspect raw Friends conversations'
);

select is(
  has_table_privilege('authenticated', 'private.friendship_messages', 'SELECT'),
  false,
  'members cannot inspect raw Friends messages'
);

select * from finish();
rollback;

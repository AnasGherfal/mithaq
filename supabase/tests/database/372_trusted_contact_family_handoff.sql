begin;
select plan(13);

select is(
  has_table_privilege('authenticated', 'private.marriage_trusted_contacts', 'SELECT'),
  false,
  'members cannot read raw trusted contact rows'
);

select is(
  has_table_privilege('authenticated', 'private.introduction_trusted_contact_shares', 'SELECT'),
  false,
  'members cannot inspect raw trusted contact share snapshots'
);

select is(
  has_function_privilege('authenticated', 'public.list_my_marriage_trusted_contacts()', 'EXECUTE'),
  true,
  'members can list only their own trusted contacts through the guarded RPC'
);

select is(
  has_function_privilege('authenticated', 'public.save_my_marriage_trusted_contact(uuid,text,text,text)', 'EXECUTE'),
  true,
  'members can save trusted contacts through the guarded RPC'
);

select is(
  has_function_privilege('authenticated', 'public.remove_my_marriage_trusted_contact(uuid)', 'EXECUTE'),
  true,
  'members can remove their own saved trusted contact'
);

select is(
  has_function_privilege('authenticated', 'public.get_my_introduction_trusted_contact_state(uuid)', 'EXECUTE'),
  true,
  'members can read participant-scoped handoff state'
);

select is(
  has_function_privilege('authenticated', 'public.share_my_trusted_contact_for_introduction(uuid,uuid)', 'EXECUTE'),
  true,
  'members can explicitly share a trusted contact in an eligible introduction'
);

select is(
  has_function_privilege('anon', 'public.share_my_trusted_contact_for_introduction(uuid,uuid)', 'EXECUTE'),
  false,
  'anonymous callers cannot share trusted contacts'
);

select is(
  has_function_privilege('authenticated', 'private.introduction_member_trusted_contact_shared(uuid,uuid)', 'EXECUTE'),
  false,
  'members cannot probe the private family involvement helper directly'
);

select ok(
  position('mutually_accepted' in pg_get_functiondef('public.share_my_trusted_contact_for_introduction(uuid,uuid)'::regprocedure)) > 0,
  'trusted contact sharing requires a mutually accepted introduction'
);

select ok(
  position('marriage_pair_is_hidden' in pg_get_functiondef('public.share_my_trusted_contact_for_introduction(uuid,uuid)'::regprocedure)) > 0,
  'trusted contact sharing rechecks Family Shield and reciprocal hide state'
);

select ok(
  position('after_family_involvement' in pg_get_functiondef('private.introduction_member_photo_is_revealed(uuid,uuid)'::regprocedure)) > 0,
  'photo reveal helper supports the family involvement privacy choice'
);

select ok(
  position('p_owner_user_id' in pg_get_functiondef('private.introduction_member_photo_is_revealed(uuid,uuid)'::regprocedure)) > 0
  and position('introduction_member_trusted_contact_shared' in pg_get_functiondef('private.introduction_member_photo_is_revealed(uuid,uuid)'::regprocedure)) > 0,
  'family involvement photo reveal is tied to the photo owner trusted-contact share'
);

select * from finish();
rollback;

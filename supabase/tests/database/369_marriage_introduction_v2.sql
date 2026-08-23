begin;
select plan(10);

select is(
  has_function_privilege('authenticated', 'public.get_introduction_preview(uuid)', 'EXECUTE'),
  true,
  'members can read guarded introduction previews'
);

select is(
  has_function_privilege('anon', 'public.get_introduction_preview(uuid)', 'EXECUTE'),
  false,
  'anonymous callers cannot read introduction previews'
);

select is(
  has_function_privilege('authenticated', 'public.respond_to_introduction(uuid,boolean)', 'EXECUTE'),
  true,
  'members can respond through the guarded introduction action'
);

select is(
  has_function_privilege('anon', 'public.respond_to_introduction(uuid,boolean)', 'EXECUTE'),
  false,
  'anonymous callers cannot respond to introductions'
);

select is(
  has_function_privilege('authenticated', 'public.create_controlled_introduction(uuid,uuid,timestamp with time zone,text)', 'EXECUTE'),
  false,
  'members cannot create controlled introductions directly'
);

select is(
  has_function_privilege('service_role', 'public.create_controlled_introduction(uuid,uuid,timestamp with time zone,text)', 'EXECUTE'),
  true,
  'service role can create guarded controlled introductions'
);

select is(
  has_function_privilege('authenticated', 'private.introduction_member_photo_is_visible(uuid,uuid)', 'EXECUTE'),
  false,
  'members cannot call the private photo-stage helper'
);

select is(
  has_function_privilege('authenticated', 'public.resolve_introduction_photo_path_for_service(uuid,uuid,uuid)', 'EXECUTE'),
  false,
  'members cannot resolve raw introduction photo paths'
);

select ok(
  pg_get_function_result('public.get_introduction_preview(uuid)'::regprocedure)
    like '%age_band_label text%presentation_mode text%alignment_reasons text[]%',
  'preview exposes safe stage and reason categories'
);

select ok(
  position(
    'private.marriage_pair_is_hidden' in
    pg_get_functiondef('public.respond_to_introduction(uuid,boolean)'::regprocedure)
  ) > 0,
  'response path rechecks Family Shield and pair privacy'
);

select * from finish();
rollback;

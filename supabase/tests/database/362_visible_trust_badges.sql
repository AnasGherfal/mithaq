begin;
select plan(10);

select is(
  has_function_privilege('authenticated', 'private.member_visible_trust_badges(uuid)', 'EXECUTE'),
  false,
  'members cannot call the private trust-badge helper directly'
);

select is(
  has_function_privilege('anon', 'private.member_visible_trust_badges(uuid)', 'EXECUTE'),
  false,
  'anonymous users cannot call the private trust-badge helper'
);

select is(
  has_function_privilege('authenticated', 'public.list_marriage_discovery(integer)', 'EXECUTE'),
  true,
  'authenticated members can use guarded Marriage discovery'
);

select is(
  has_function_privilege('anon', 'public.list_marriage_discovery(integer)', 'EXECUTE'),
  false,
  'anonymous users cannot use Marriage discovery'
);

select is(
  has_function_privilege('authenticated', 'public.get_introduction_preview(uuid)', 'EXECUTE'),
  true,
  'authenticated introduction participants can use the guarded preview'
);

select is(
  has_function_privilege('anon', 'public.get_introduction_preview(uuid)', 'EXECUTE'),
  false,
  'anonymous users cannot read introduction previews'
);

select is(
  has_function_privilege('authenticated', 'public.set_member_identity_trust_for_service(uuid, text, boolean, text)', 'EXECUTE'),
  false,
  'members cannot award themselves verification state'
);

insert into auth.users (
  id, instance_id, aud, role, created_at, updated_at
) values (
  '73737373-7373-4737-8737-737373737373',
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  now(),
  now()
) on conflict (id) do nothing;

insert into public.users (id)
values ('73737373-7373-4737-8737-737373737373')
on conflict (id) do nothing;

select is(
  (select real_person_verified from private.member_visible_trust_badges('73737373-7373-4737-8737-737373737373')),
  false,
  'a member without stronger verification has no visible real-person badge'
);

insert into private.member_identity_trust (
  user_id,
  verification_level,
  age_18_plus_verified,
  verified_at
) values (
  '73737373-7373-4737-8737-737373737373',
  'selfie_verified'::private.identity_verification_level,
  true,
  clock_timestamp()
);

select ok(
  (select real_person_verified and age_18_plus_verified and not identity_verified
   from private.member_visible_trust_badges('73737373-7373-4737-8737-737373737373')),
  'selfie verification exposes only real-person and 18-plus badges when those checks were completed'
);

update private.member_identity_trust
set verification_level = 'id_verified'::private.identity_verification_level
where user_id = '73737373-7373-4737-8737-737373737373';

select is(
  (select identity_verified from private.member_visible_trust_badges('73737373-7373-4737-8737-737373737373')),
  true,
  'ID verification exposes the identity badge'
);

select * from finish();
rollback;

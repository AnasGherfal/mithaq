begin;
select plan(10);

select is(
  has_table_privilege('authenticated', 'public.marriage_visibility_settings', 'INSERT'),
  false,
  'members cannot write raw Marriage visibility rows'
);

select is(
  has_table_privilege('authenticated', 'private.marriage_discovery_hides', 'SELECT'),
  false,
  'members cannot inspect raw reciprocal hide rows'
);

select is(
  has_table_privilege('authenticated', 'private.member_identity_trust', 'SELECT'),
  false,
  'members cannot inspect raw identity verification evidence'
);

select is(
  has_function_privilege('authenticated', 'public.get_my_marriage_visibility()', 'EXECUTE'),
  true,
  'members can read their guarded Marriage visibility setting'
);

select is(
  has_function_privilege('authenticated', 'public.hide_marriage_discovery_member(uuid)', 'EXECUTE'),
  true,
  'members can use the guarded reciprocal hide action'
);

select is(
  has_function_privilege('authenticated', 'public.set_member_identity_trust_for_service(uuid, text, boolean, text)', 'EXECUTE'),
  false,
  'members cannot self-award identity verification'
);

insert into auth.users (id, instance_id, aud, role, created_at, updated_at)
values
  ('81818181-8181-4818-8818-818181818181', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', now(), now()),
  ('82828282-8282-4828-8828-828282828282', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', now(), now())
on conflict (id) do nothing;

insert into public.users (id)
values
  ('81818181-8181-4818-8818-818181818181'),
  ('82828282-8282-4828-8828-828282828282')
on conflict (id) do nothing;

insert into public.marriage_visibility_settings (user_id, visibility_mode)
values
  ('81818181-8181-4818-8818-818181818181', 'standard'),
  ('82828282-8282-4828-8828-828282828282', 'private')
on conflict (user_id) do update set visibility_mode = excluded.visibility_mode;

select is(
  private.marriage_discovery_candidate_visible(
    '81818181-8181-4818-8818-818181818181',
    '82828282-8282-4828-8828-828282828282'
  ),
  false,
  'private member is not visible before choosing the viewer'
);

insert into private.marriage_discovery_actions (
  actor_user_id,
  candidate_user_id,
  action
) values (
  '82828282-8282-4828-8828-828282828282',
  '81818181-8181-4818-8818-818181818181',
  'noticed'
);

select is(
  private.marriage_discovery_candidate_visible(
    '81818181-8181-4818-8818-818181818181',
    '82828282-8282-4828-8828-828282828282'
  ),
  true,
  'private member becomes eligible to be shown after privately choosing the viewer'
);

insert into private.marriage_discovery_hides (actor_user_id, hidden_user_id)
values (
  '81818181-8181-4818-8818-818181818181',
  '82828282-8282-4828-8828-828282828282'
);

select is(
  private.marriage_discovery_candidate_visible(
    '81818181-8181-4818-8818-818181818181',
    '82828282-8282-4828-8828-828282828282'
  ),
  false,
  'reciprocal hide overrides an existing private-interest signal'
);

select is(
  private.marriage_pair_is_hidden(
    '82828282-8282-4828-8828-828282828282',
    '81818181-8181-4818-8818-818181818181'
  ),
  true,
  'hide boundary applies in both directions'
);

select * from finish();
rollback;

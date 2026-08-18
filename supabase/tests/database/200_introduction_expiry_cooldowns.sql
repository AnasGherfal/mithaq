begin;
select plan(20);

select is(
  has_function_privilege('authenticated', 'public.expire_controlled_introductions(integer)', 'EXECUTE'),
  false,
  'members cannot run the introduction expiry worker'
);
select is(
  has_function_privilege('service_role', 'public.expire_controlled_introductions(integer)', 'EXECUTE'),
  true,
  'trusted services can run the introduction expiry worker'
);
select is(
  has_function_privilege('authenticated', 'private.introduction_pair_in_cooldown(uuid, uuid)', 'EXECUTE'),
  false,
  'members cannot inspect internal pair cooldown state'
);

insert into auth.users (id, instance_id, aud, role, created_at, updated_at) values
  ('20202020-2020-4020-8020-202020202011', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', now(), now()),
  ('20202020-2020-4020-8020-202020202012', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', now(), now())
on conflict (id) do nothing;

insert into public.users (id) values
  ('20202020-2020-4020-8020-202020202011'),
  ('20202020-2020-4020-8020-202020202012')
on conflict (id) do nothing;

insert into public.waitlist_applications (
  id, user_id, status, gender, age_band_id, residency_type,
  current_country_code, current_city, marital_status, has_children,
  questionnaire_completed_at, submitted_at
) values
  ('20202020-aaaa-4aaa-8aaa-202020202011', '20202020-2020-4020-8020-202020202011', 'submitted', 'man', 2, 'libya', 'LY', 'Tripoli', 'never_married', false, now(), now() - interval '2 days'),
  ('20202020-bbbb-4bbb-8bbb-202020202012', '20202020-2020-4020-8020-202020202012', 'submitted', 'woman', 2, 'libya', 'LY', 'Benghazi', 'never_married', false, now(), now() - interval '1 day');

insert into public.waitlist_preferences (
  application_id, open_to_libya, open_to_diaspora,
  preferred_partner_age_min, preferred_partner_age_max,
  accepts_partner_with_children
) values
  ('20202020-aaaa-4aaa-8aaa-202020202011', true, true, 18, 60, 'depends'),
  ('20202020-bbbb-4bbb-8bbb-202020202012', true, true, 18, 60, 'depends');

insert into public.member_profiles (user_id, display_name, about_me, profile_completed_at) values
  ('20202020-2020-4020-8020-202020202011', 'Adam', 'A complete serious profile for introduction expiry and cooldown testing.', now()),
  ('20202020-2020-4020-8020-202020202012', 'Basma', 'A complete serious profile for introduction expiry and cooldown testing.', now());

set local role service_role;
select public.set_member_profile_review_state('20202020-2020-4020-8020-202020202011', 'approved', 'm6', 'cooldown-test', null);
select public.set_member_profile_review_state('20202020-2020-4020-8020-202020202012', 'approved', 'm6', 'cooldown-test', null);

create temporary table cooldown_ids (name text primary key, id uuid not null) on commit drop;
grant select on cooldown_ids to authenticated;
with inserted as (
  insert into private.controlled_introductions (
    user_a_id,
    user_b_id,
    status,
    created_at,
    expires_at,
    created_by
  ) values (
    '20202020-2020-4020-8020-202020202011',
    '20202020-2020-4020-8020-202020202012',
    'offered',
    clock_timestamp() - interval '8 days',
    clock_timestamp() - interval '1 day',
    'cooldown-test-stale'
  )
  returning id
)
insert into cooldown_ids (name, id)
select 'stale', id from inserted;

select is(public.expire_controlled_introductions(100), 1, 'expiry worker transitions one stale offered introduction');
select is(
  (select status from private.controlled_introductions where id = (select id from cooldown_ids where name = 'stale')),
  'expired'::public.introduction_status,
  'stale offer is persisted as expired'
);
select is(
  (select count(*)::integer from private.controlled_introduction_events where introduction_id = (select id from cooldown_ids where name = 'stale') and event_type = 'expired' and actor_reference = 'expiry-worker'),
  1,
  'expiry worker writes an audit event'
);
select is(
  private.introduction_pair_in_cooldown('20202020-2020-4020-8020-202020202011', '20202020-2020-4020-8020-202020202012'),
  true,
  'expired pair enters the configured cooldown'
);
select cmp_ok(
  private.introduction_pair_cooldown_until('20202020-2020-4020-8020-202020202011', '20202020-2020-4020-8020-202020202012'),
  '>',
  clock_timestamp(),
  'expired pair exposes a future cooldown end to trusted code'
);
select is(
  (select count(*)::integer from public.get_hard_match_candidates('20202020-2020-4020-8020-202020202011', 20) where candidate_user_id = '20202020-2020-4020-8020-202020202012'),
  0,
  'cooldown pair is excluded from candidate enumeration'
);
select throws_ok(
  $$select public.create_controlled_introduction('20202020-2020-4020-8020-202020202011', '20202020-2020-4020-8020-202020202012', null, 'cooldown-test')$$,
  'P0001',
  'introduction pair in cooldown',
  'cooldown pair cannot be reintroduced early'
);
select throws_ok(
  $$select public.expire_controlled_introductions(0)$$,
  'P0001',
  'expiry limit must be between 1 and 5000',
  'expiry worker rejects invalid batch sizes'
);

update private.controlled_introductions
set closed_at = clock_timestamp() - interval '31 days'
where id = (select id from cooldown_ids where name = 'stale');

select is(
  private.introduction_pair_in_cooldown('20202020-2020-4020-8020-202020202011', '20202020-2020-4020-8020-202020202012'),
  false,
  'expired cooldown ends after thirty days'
);
select is(
  (select count(*)::integer from public.get_hard_match_candidates('20202020-2020-4020-8020-202020202011', 20) where candidate_user_id = '20202020-2020-4020-8020-202020202012'),
  1,
  'candidate can return after cooldown ends'
);

insert into cooldown_ids (name, id)
select 'active', public.create_controlled_introduction(
  '20202020-2020-4020-8020-202020202011',
  '20202020-2020-4020-8020-202020202012',
  clock_timestamp() + interval '7 days',
  'cooldown-test'
);
select is(
  (select status from private.controlled_introductions where id = (select id from cooldown_ids where name = 'active')),
  'offered'::public.introduction_status,
  'pair can be introduced again after cooldown'
);
select throws_ok(
  $$select public.create_controlled_introduction('20202020-2020-4020-8020-202020202012', '20202020-2020-4020-8020-202020202011', null, 'cooldown-test')$$,
  'P0001',
  'active introduction already exists',
  'active pair still cannot be duplicated in reverse order'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '20202020-2020-4020-8020-202020202011', true);
select is(
  public.respond_to_introduction((select id from cooldown_ids where name = 'active'), false),
  'declined'::public.introduction_status,
  'member can decline the active introduction'
);

reset role;
set local role service_role;
select is(
  private.introduction_pair_in_cooldown('20202020-2020-4020-8020-202020202011', '20202020-2020-4020-8020-202020202012'),
  true,
  'declined pair enters the longer decline cooldown'
);
select throws_ok(
  $$select public.create_controlled_introduction('20202020-2020-4020-8020-202020202011', '20202020-2020-4020-8020-202020202012', null, 'cooldown-test')$$,
  'P0001',
  'introduction pair in cooldown',
  'declined pair cannot be immediately reintroduced'
);

update private.controlled_introductions
set closed_at = clock_timestamp() - interval '91 days'
where id = (select id from cooldown_ids where name = 'active');
select is(
  private.introduction_pair_in_cooldown('20202020-2020-4020-8020-202020202011', '20202020-2020-4020-8020-202020202012'),
  false,
  'decline cooldown ends after ninety days'
);

insert into cooldown_ids (name, id)
select 'after-decline', public.create_controlled_introduction(
  '20202020-2020-4020-8020-202020202011',
  '20202020-2020-4020-8020-202020202012',
  clock_timestamp() + interval '7 days',
  'cooldown-test'
);
select is(
  (select count(*)::integer from cooldown_ids where name = 'after-decline'),
  1,
  'pair can be reintroduced after the decline cooldown expires'
);

select * from finish();
rollback;
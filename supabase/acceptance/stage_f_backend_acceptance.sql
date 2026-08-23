-- Stage F rollback-only backend acceptance test.
--
-- Run only against a non-production environment. The entire fixture is created
-- inside one transaction and rolled back before returning PASS.
--
-- Covers:
--   eligibility -> mutual discovery interest -> fresh introduction decisions
--   -> dual acceptance -> idempotent message -> exactly one notification
--   -> unread/read -> safety report -> close -> block -> post-close send guard

begin;

do $$
declare
  u1 uuid := gen_random_uuid();
  u2 uuid := gen_random_uuid();
  s1 uuid := gen_random_uuid();
  s2 uuid := gen_random_uuid();
  app1 uuid;
  app2 uuid;
  intro uuid;
  rec record;
  status_text text;
  decision_a text;
  decision_b text;
  msg1 uuid;
  msg2 uuid;
  unread bigint;
  report_id uuid;
  conversation_status_text text;
begin
  insert into auth.users (id, email, raw_user_meta_data)
  values
    (u1, 'stagef-a-' || replace(u1::text, '-', '') || '@example.invalid', '{}'::jsonb),
    (u2, 'stagef-b-' || replace(u2::text, '-', '') || '@example.invalid', '{}'::jsonb);

  insert into auth.sessions (id, user_id, created_at, updated_at)
  values
    (s1, u1, clock_timestamp(), clock_timestamp()),
    (s2, u2, clock_timestamp(), clock_timestamp());

  insert into public.waitlist_applications (
    user_id, status, gender, age_band_id, residency_type,
    current_country_code, current_city, marital_status, has_children,
    libyan_self_attestation, questionnaire_completed_at, submitted_at
  ) values (
    u1, 'invited', 'man', 3, 'libya', 'LY', 'Tripoli', 'never_married', false,
    true, clock_timestamp(), clock_timestamp()
  ) returning id into app1;

  insert into public.waitlist_applications (
    user_id, status, gender, age_band_id, residency_type,
    current_country_code, current_city, marital_status, has_children,
    libyan_self_attestation, questionnaire_completed_at, submitted_at
  ) values (
    u2, 'invited', 'woman', 3, 'libya', 'LY', 'Tripoli', 'never_married', false,
    true, clock_timestamp(), clock_timestamp()
  ) returning id into app2;

  insert into public.waitlist_preferences (
    application_id, open_to_libya, open_to_diaspora,
    preferred_partner_age_min, preferred_partner_age_max,
    accepts_partner_with_children
  ) values
    (app1, true, true, 18, 60, 'yes'),
    (app2, true, true, 18, 60, 'yes');

  insert into public.member_profiles (user_id, display_name, about_me, profile_completed_at)
  values
    (u1, 'اختبار أ', 'ملف اختباري مؤقت لقبول المرحلة F.', clock_timestamp()),
    (u2, 'اختبار ب', 'ملف اختباري مؤقت لقبول المرحلة F.', clock_timestamp());

  -- Profile save creates the review row automatically.
  update public.member_profile_reviews
  set state = 'approved', review_after = null, updated_at = clock_timestamp()
  where user_id in (u1, u2);

  -- Waitlist creation may bootstrap the marriage space, so make this idempotent.
  insert into public.member_connection_spaces (user_id, space, membership_state, is_current)
  values
    (u1, 'marriage', 'active', true),
    (u2, 'marriage', 'active', true)
  on conflict (user_id, space) do update
  set membership_state = excluded.membership_state,
      is_current = excluded.is_current,
      updated_at = clock_timestamp();

  insert into private.marriage_practical_priorities (
    user_id, living_arrangement, children_plan, work_after_marriage, wedding_style
  ) values
    (u1, 'independent_home', 'want_children', 'open_to_discuss', 'simple'),
    (u2, 'independent_home', 'want_children', 'open_to_discuss', 'simple');

  insert into public.member_safety_states (user_id, state)
  values (u1, 'clear'), (u2, 'clear')
  on conflict (user_id) do update
  set state = 'clear', updated_at = clock_timestamp();

  perform set_config('request.jwt.claim.sub', u1::text, true);
  perform set_config(
    'request.jwt.claims',
    jsonb_build_object('sub', u1::text, 'role', 'authenticated', 'session_id', s1::text)::text,
    true
  );

  if not private.member_can_participate(u1) or not private.member_can_participate(u2) then
    raise exception 'Stage F acceptance failed: fixture members are not eligible';
  end if;

  select * into rec
  from public.record_marriage_discovery_action_v2(u2, 'noticed');

  if rec.introduction_id is not null or rec.mutual_interest is distinct from false then
    raise exception 'Stage F acceptance failed: first notice unexpectedly created introduction';
  end if;

  perform set_config('request.jwt.claim.sub', u2::text, true);
  perform set_config(
    'request.jwt.claims',
    jsonb_build_object('sub', u2::text, 'role', 'authenticated', 'session_id', s2::text)::text,
    true
  );

  select * into rec
  from public.record_marriage_discovery_action_v2(u1, 'noticed');

  intro := rec.introduction_id;
  if intro is null or rec.mutual_interest is distinct from true then
    raise exception 'Stage F acceptance failed: reciprocal notice did not create introduction';
  end if;

  select i.status::text, i.user_a_decision::text, i.user_b_decision::text
  into status_text, decision_a, decision_b
  from private.controlled_introductions i
  where i.id = intro;

  if status_text <> 'offered' or decision_a <> 'pending' or decision_b <> 'pending' then
    raise exception 'Stage F acceptance failed: introduction did not start offered/pending/pending';
  end if;

  perform set_config('request.jwt.claim.sub', u1::text, true);
  perform set_config(
    'request.jwt.claims',
    jsonb_build_object('sub', u1::text, 'role', 'authenticated', 'session_id', s1::text)::text,
    true
  );

  if public.respond_to_introduction(intro, true)::text <> 'offered' then
    raise exception 'Stage F acceptance failed: first acceptance should remain offered';
  end if;

  perform set_config('request.jwt.claim.sub', u2::text, true);
  perform set_config(
    'request.jwt.claims',
    jsonb_build_object('sub', u2::text, 'role', 'authenticated', 'session_id', s2::text)::text,
    true
  );

  if public.respond_to_introduction(intro, true)::text <> 'mutually_accepted' then
    raise exception 'Stage F acceptance failed: second acceptance did not create mutual acceptance';
  end if;

  perform set_config('request.jwt.claim.sub', u1::text, true);
  perform set_config(
    'request.jwt.claims',
    jsonb_build_object('sub', u1::text, 'role', 'authenticated', 'session_id', s1::text)::text,
    true
  );

  msg1 := public.send_conversation_message_idempotent(
    intro,
    'رسالة اختبار آمنة للمرحلة F',
    'stagef_acceptance_nonce_0001'
  );
  msg2 := public.send_conversation_message_idempotent(
    intro,
    'رسالة اختبار آمنة للمرحلة F',
    'stagef_acceptance_nonce_0001'
  );

  if msg1 is null or msg1 <> msg2 then
    raise exception 'Stage F acceptance failed: idempotent send created inconsistent message ids';
  end if;

  if (select count(*) from private.conversation_messages m where m.id = msg1) <> 1 then
    raise exception 'Stage F acceptance failed: idempotent send did not persist exactly one message';
  end if;

  if (select count(*) from private.member_notifications n where n.message_id = msg1 and n.user_id = u2) <> 1 then
    raise exception 'Stage F acceptance failed: message notification count is not exactly one';
  end if;

  perform set_config('request.jwt.claim.sub', u2::text, true);
  perform set_config(
    'request.jwt.claims',
    jsonb_build_object('sub', u2::text, 'role', 'authenticated', 'session_id', s2::text)::text,
    true
  );

  select c.unread_count into unread
  from public.list_my_conversation_unread_counts() c
  where c.introduction_id = intro;

  if coalesce(unread, 0) <> 1 then
    raise exception 'Stage F acceptance failed: recipient unread count should be one, got %', coalesce(unread, 0);
  end if;

  perform public.mark_my_conversation_read(intro, null);

  select c.unread_count into unread
  from public.list_my_conversation_unread_counts() c
  where c.introduction_id = intro;

  if coalesce(unread, 0) <> 0 then
    raise exception 'Stage F acceptance failed: unread count did not clear';
  end if;

  report_id := public.submit_introduction_safety_report(
    intro,
    'safety_concern',
    'Stage F rollback-only acceptance test',
    false
  );

  if report_id is null then
    raise exception 'Stage F acceptance failed: safety report was not created';
  end if;

  if public.end_my_conversation(intro) is distinct from true then
    raise exception 'Stage F acceptance failed: conversation did not close';
  end if;

  select i.status::text into status_text
  from private.controlled_introductions i
  where i.id = intro;

  select c.status::text into conversation_status_text
  from private.introduction_conversations c
  where c.introduction_id = intro;

  if status_text <> 'closed' or conversation_status_text <> 'closed' then
    raise exception 'Stage F acceptance failed: closed state mismatch (% / %)', status_text, conversation_status_text;
  end if;

  perform public.block_introduction_member(intro);

  if not exists (
    select 1 from public.member_blocks b
    where b.blocker_user_id = u2 and b.blocked_user_id = u1
  ) then
    raise exception 'Stage F acceptance failed: block was not recorded';
  end if;

  begin
    perform public.send_conversation_message_idempotent(
      intro,
      'يجب ألا تُرسل بعد الإغلاق',
      'stagef_acceptance_nonce_closed'
    );
    raise exception 'Stage F acceptance failed: message send succeeded after close';
  exception
    when others then
      if sqlerrm = 'Stage F acceptance failed: message send succeeded after close' then
        raise;
      end if;
      if position('conversation unavailable' in sqlerrm) = 0 then
        raise exception 'Stage F acceptance failed: unexpected post-close error: %', sqlerrm;
      end if;
  end;
end
$$;

rollback;

select
  'PASS' as stage_f_backend_acceptance,
  'all rollback-only assertions passed; staging unchanged' as detail;

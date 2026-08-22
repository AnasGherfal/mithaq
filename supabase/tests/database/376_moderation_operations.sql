begin;
select plan(18);

select is(
  has_table_privilege('authenticated', 'private.moderation_staff', 'SELECT'),
  false,
  'members cannot inspect moderation staff assignments'
);

select is(
  has_table_privilege('authenticated', 'private.moderation_action_log', 'SELECT'),
  false,
  'members cannot inspect raw moderation audit rows'
);

select is(
  has_table_privilege('authenticated', 'private.member_moderation_enforcements', 'SELECT'),
  false,
  'members cannot inspect raw enforcement records'
);

select is(
  has_table_privilege('service_role', 'private.moderation_staff', 'SELECT'),
  true,
  'service role can manage staff assignments'
);

select is(
  has_function_privilege('authenticated', 'public.get_my_moderation_access()', 'EXECUTE'),
  true,
  'signed-in accounts can call the guarded access check'
);

select is(
  has_function_privilege('authenticated', 'public.list_moderation_queue(text,integer)', 'EXECUTE'),
  true,
  'signed-in accounts reach the staff-gated queue RPC'
);

select is(
  has_function_privilege('authenticated', 'public.get_moderation_case(text,uuid)', 'EXECUTE'),
  true,
  'signed-in accounts reach the staff-gated case RPC'
);

select is(
  has_function_privilege('authenticated', 'public.list_moderation_audit(uuid,integer)', 'EXECUTE'),
  true,
  'signed-in accounts reach the staff-gated audit RPC'
);

select is(
  has_function_privilege('authenticated', 'public.moderate_profile_case(uuid,public.member_profile_review_state,text,timestamp with time zone)', 'EXECUTE'),
  true,
  'staff review actions are exposed only through the guarded wrapper'
);

select is(
  has_function_privilege('authenticated', 'public.moderate_photo_case(uuid,public.member_photo_review_state,text,timestamp with time zone)', 'EXECUTE'),
  true,
  'staff photo actions are exposed only through the guarded wrapper'
);

select is(
  has_function_privilege('authenticated', 'public.moderate_report_case(uuid,public.safety_report_status,text)', 'EXECUTE'),
  true,
  'staff report actions are exposed only through the guarded wrapper'
);

select is(
  has_function_privilege('authenticated', 'public.moderate_member_enforcement(uuid,text,text,timestamp with time zone)', 'EXECUTE'),
  true,
  'staff enforcement actions are exposed only through the guarded wrapper'
);

select is(
  has_function_privilege('anon', 'public.list_moderation_queue(text,integer)', 'EXECUTE'),
  false,
  'anonymous callers cannot reach the moderation queue'
);

select is(
  has_function_privilege('anon', 'public.moderate_member_enforcement(uuid,text,text,timestamp with time zone)', 'EXECUTE'),
  false,
  'anonymous callers cannot reach enforcement actions'
);

select is(
  has_function_privilege('authenticated', 'private.current_moderation_role()', 'EXECUTE'),
  false,
  'members cannot invoke private moderation role helpers directly'
);

select is(
  has_function_privilege('authenticated', 'private.close_member_relationships_for_moderation(uuid,uuid,text)', 'EXECUTE'),
  false,
  'members cannot invoke relationship shutdown helpers directly'
);

select ok(
  position('p_user_id = v_actor' in pg_get_functiondef('public.moderate_member_enforcement(uuid,text,text,timestamp with time zone)'::regprocedure)) > 0,
  'moderators cannot enforce against their own account'
);

select ok(
  position('close_member_relationships_for_moderation' in pg_get_functiondef('public.moderate_member_enforcement(uuid,text,text,timestamp with time zone)'::regprocedure)) > 0,
  'member enforcement closes active introductions and conversations'
);

select * from finish();
rollback;

begin;
select plan(9);

select ok(
  exists (
    select 1 from information_schema.columns
    where table_schema = 'private'
      and table_name = 'member_moderation_enforcements'
      and column_name = 'auth_sessions_revoked_at'
  ),
  'moderation enforcement records when auth sessions were revoked'
);

select ok(
  exists (
    select 1 from information_schema.columns
    where table_schema = 'private'
      and table_name = 'member_moderation_enforcements'
      and column_name = 'previous_auth_banned_until'
  ),
  'moderation enforcement preserves the prior Auth ban state for restore'
);

select is(
  has_function_privilege('authenticated', 'private.current_auth_session_is_active()', 'EXECUTE'),
  false,
  'members cannot call the private Auth-session validator directly'
);

select is(
  has_function_privilege('authenticated', 'private.revoke_auth_sessions_for_moderation(uuid)', 'EXECUTE'),
  false,
  'members cannot revoke Auth sessions directly'
);

select ok(
  position('auth.sessions' in pg_get_functiondef('private.current_auth_session_is_active()'::regprocedure)) > 0,
  'current-session validation checks the Auth sessions table'
);

select ok(
  position('private.current_auth_session_is_active()' in pg_get_functiondef('private.current_moderation_role()'::regprocedure)) > 0,
  'moderation access requires a live current Auth session'
);

select ok(
  position('private.current_auth_session_is_active()' in pg_get_functiondef('private.member_can_participate(uuid)'::regprocedure)) > 0,
  'member participation rejects a revoked current session'
);

select ok(
  position('private.revoke_auth_sessions_for_moderation' in pg_get_functiondef('public.moderate_member_enforcement(uuid,text,text,timestamptz)'::regprocedure)) > 0,
  'moderation ban revokes target Auth sessions'
);

select ok(
  position('interval ''100 years''' in pg_get_functiondef('public.moderate_member_enforcement(uuid,text,text,timestamptz)'::regprocedure)) > 0,
  'moderation ban prevents new Auth sign-in for a long-lived ban window'
);

select * from finish();
rollback;

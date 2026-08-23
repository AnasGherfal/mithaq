begin;
select plan(4);

select ok(
  to_regclass('private.member_moderation_enforcements_actor_idx') is not null,
  'moderation enforcement actor foreign key has a covering index'
);

select ok(
  position(
    'moderation_role_can_enforce' in
    pg_get_functiondef('public.list_moderation_queue(text,integer)'::regprocedure)
  ) > 0,
  'moderation queue restricts safety reports to enforcement-capable roles'
);

select ok(
  position(
    'moderation enforcement access required' in
    pg_get_functiondef('public.get_moderation_case(text,uuid)'::regprocedure)
  ) > 0,
  'safety report detail requires moderator or admin access'
);

select ok(
  position(
    'log.item_kind in (''profile'', ''photo'')' in
    pg_get_functiondef('public.list_moderation_audit(uuid,integer)'::regprocedure)
  ) > 0,
  'reviewers only receive profile and photo moderation history'
);

select * from finish();
rollback;

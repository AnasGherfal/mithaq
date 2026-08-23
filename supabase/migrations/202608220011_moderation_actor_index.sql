create index member_moderation_enforcements_actor_idx
  on private.member_moderation_enforcements (actor_user_id, updated_at desc);

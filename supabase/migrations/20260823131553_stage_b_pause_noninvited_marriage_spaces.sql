update public.member_connection_spaces s
set membership_state = 'paused'::public.connection_space_membership_state,
    is_current = false,
    updated_at = clock_timestamp()
where s.space = 'marriage'::public.connection_space
  and s.membership_state = 'active'::public.connection_space_membership_state
  and not private.is_invited_marriage_user(s.user_id);

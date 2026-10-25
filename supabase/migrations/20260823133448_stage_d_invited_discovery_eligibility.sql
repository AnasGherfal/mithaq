create or replace function private.marriage_member_is_discoverable(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = 'public', 'private'
as $$
  select exists (
    select 1
    from public.users u
    join public.member_connection_spaces s
      on s.user_id = u.id
     and s.space = 'marriage'::public.connection_space
     and s.membership_state = 'active'::public.connection_space_membership_state
    join public.waitlist_applications a on a.user_id = u.id
    join public.member_profiles p on p.user_id = u.id
    join private.marriage_practical_priorities priorities on priorities.user_id = u.id
    where u.id = p_user_id
      and u.account_status = 'active'::public.account_status
      and a.status = 'invited'::public.waitlist_status
      and a.submitted_at is not null
      and a.questionnaire_completed_at is not null
      and p.profile_completed_at is not null
      and priorities.completed_at is not null
      and private.member_can_participate(p_user_id)
  );
$$;

revoke all on function private.marriage_member_is_discoverable(uuid) from public, anon, authenticated;

create or replace function private.members_are_blocked(
  p_user_a uuid,
  p_user_b uuid
)
returns boolean
language sql
stable
security definer
set search_path = public, private
as $$
  select exists (
    select 1
    from public.member_blocks b
    where (b.blocker_user_id = p_user_a and b.blocked_user_id = p_user_b)
       or (b.blocker_user_id = p_user_b and b.blocked_user_id = p_user_a)
  );
$$;

revoke all on function private.members_are_blocked(uuid, uuid) from public, anon, authenticated;
grant execute on function private.members_are_blocked(uuid, uuid) to service_role;

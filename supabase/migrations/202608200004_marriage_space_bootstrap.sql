create or replace function private.ensure_marriage_connection_space()
returns trigger
language plpgsql
security definer
set search_path = public, private
as $$
declare
  v_has_current boolean;
begin
  select exists (
    select 1
    from public.member_connection_spaces s
    where s.user_id = new.user_id
      and s.is_current
  ) into v_has_current;

  insert into public.member_connection_spaces (
    user_id,
    space,
    membership_state,
    is_current,
    joined_at,
    updated_at
  ) values (
    new.user_id,
    'marriage'::public.connection_space,
    'active'::public.connection_space_membership_state,
    not v_has_current,
    clock_timestamp(),
    clock_timestamp()
  )
  on conflict (user_id, space) do update
  set membership_state = 'active'::public.connection_space_membership_state,
      updated_at = clock_timestamp();

  return new;
end;
$$;

create trigger waitlist_application_ensures_marriage_space
  after insert on public.waitlist_applications
  for each row
  execute function private.ensure_marriage_connection_space();

revoke all on function private.ensure_marriage_connection_space()
  from public, anon, authenticated;
grant execute on function private.ensure_marriage_connection_space()
  to service_role;

alter table public.safety_reports
  drop constraint if exists safety_reports_reporter_user_id_fkey,
  drop constraint if exists safety_reports_target_user_id_fkey;

alter table public.safety_reports
  alter column reporter_user_id drop not null,
  alter column target_user_id drop not null;

alter table public.safety_reports
  add constraint safety_reports_reporter_user_id_fkey
    foreign key (reporter_user_id) references public.users(id) on delete set null,
  add constraint safety_reports_target_user_id_fkey
    foreign key (target_user_id) references public.users(id) on delete set null;

create or replace function public.purge_account_private_data(
  p_user_id uuid
)
returns void
language plpgsql
security definer
set search_path = public, private
as $$
begin
  if not exists (
    select 1
    from public.deletion_requests dr
    where dr.user_id = p_user_id
      and dr.request_scope = 'entire_account'
      and dr.status = 'in_progress'
  ) then
    raise exception 'account deletion is not in progress';
  end if;

  delete from private.phone_verifications
  where user_id = p_user_id;

  delete from private.referral_events
  where referred_user_id = p_user_id;

  -- Safety reports keep only the minimum structured audit needed to preserve
  -- moderation integrity after an account is deleted. Free-text may contain
  -- personal data about either participant, so erase it before Auth deletion
  -- removes the public user row and nulls the corresponding identity link.
  update public.safety_reports
  set details = null
  where reporter_user_id = p_user_id
     or target_user_id = p_user_id;
end;
$$;

revoke all on function public.purge_account_private_data(uuid) from public, anon, authenticated;
grant execute on function public.purge_account_private_data(uuid) to service_role;

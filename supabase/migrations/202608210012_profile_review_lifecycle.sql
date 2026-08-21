-- Ensure every completed member profile enters the private review lifecycle.
-- Previously save_member_profile() could complete a profile without creating
-- member_profile_reviews, while discovery required an approved review row.

insert into public.member_profile_reviews (
  user_id,
  state,
  review_after,
  updated_at
)
select
  p.user_id,
  'pending'::public.member_profile_review_state,
  null,
  clock_timestamp()
from public.member_profiles p
where p.profile_completed_at is not null
on conflict (user_id) do nothing;

create or replace function private.sync_member_profile_review_after_save()
returns trigger
language plpgsql
security definer
set search_path = public, private
as $$
declare
  v_previous_state public.member_profile_review_state;
  v_content_changed boolean := false;
begin
  if new.profile_completed_at is null then
    return new;
  end if;

  if tg_op = 'INSERT' then
    v_content_changed := true;
  else
    v_content_changed :=
      old.display_name is distinct from new.display_name
      or old.about_me is distinct from new.about_me
      or old.occupation is distinct from new.occupation
      or old.education is distinct from new.education
      or old.profile_completed_at is distinct from new.profile_completed_at;
  end if;

  select r.state
  into v_previous_state
  from public.member_profile_reviews r
  where r.user_id = new.user_id
  for update;

  if not found then
    insert into public.member_profile_reviews (
      user_id,
      state,
      review_after,
      updated_at
    ) values (
      new.user_id,
      'pending'::public.member_profile_review_state,
      null,
      clock_timestamp()
    )
    on conflict (user_id) do nothing;

    return new;
  end if;

  if v_content_changed
     and v_previous_state <> 'pending'::public.member_profile_review_state then
    update public.member_profile_reviews
    set state = 'pending'::public.member_profile_review_state,
        review_after = null,
        updated_at = clock_timestamp()
    where user_id = new.user_id;

    insert into private.member_profile_review_events (
      user_id,
      from_state,
      to_state,
      note_code,
      actor_reference,
      review_after
    ) values (
      new.user_id,
      v_previous_state,
      'pending'::public.member_profile_review_state,
      'profile_updated',
      'member-profile-save',
      null
    );
  end if;

  return new;
end;
$$;

revoke all on function private.sync_member_profile_review_after_save()
  from public, anon, authenticated;
grant execute on function private.sync_member_profile_review_after_save()
  to service_role;

drop trigger if exists member_profile_review_after_save on public.member_profiles;
create trigger member_profile_review_after_save
after insert or update of display_name, about_me, occupation, education, profile_completed_at
on public.member_profiles
for each row
execute function private.sync_member_profile_review_after_save();

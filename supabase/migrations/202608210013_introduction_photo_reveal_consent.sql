create table private.introduction_photo_reveal_consents (
  introduction_id uuid not null references private.controlled_introductions(id) on delete cascade,
  owner_user_id uuid not null references public.users(id) on delete cascade,
  revealed_at timestamptz not null default clock_timestamp(),
  primary key (introduction_id, owner_user_id)
);

create index introduction_photo_reveal_owner_idx
  on private.introduction_photo_reveal_consents (owner_user_id, revealed_at desc);

revoke all on table private.introduction_photo_reveal_consents
  from public, anon, authenticated;
grant select, insert, update, delete on table private.introduction_photo_reveal_consents
  to service_role;

create or replace function private.introduction_member_photo_is_revealed(
  p_introduction_id uuid,
  p_owner_user_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public, private
as $$
  select exists (
    select 1
    from private.controlled_introductions i
    join public.waitlist_applications a on a.user_id = p_owner_user_id
    join public.waitlist_preferences pref on pref.application_id = a.id
    where i.id = p_introduction_id
      and p_owner_user_id in (i.user_a_id, i.user_b_id)
      and i.status = 'mutually_accepted'::public.introduction_status
      and i.expires_at > clock_timestamp()
      and (
        pref.photo_privacy_preference in (
          'discovery_visible'::public.photo_privacy_preference,
          'blurred'::public.photo_privacy_preference,
          'after_mutual_interest'::public.photo_privacy_preference
        )
        or (
          pref.photo_privacy_preference = 'explicit_approval'::public.photo_privacy_preference
          and exists (
            select 1
            from private.introduction_photo_reveal_consents c
            where c.introduction_id = p_introduction_id
              and c.owner_user_id = p_owner_user_id
          )
        )
      )
  );
$$;

revoke all on function private.introduction_member_photo_is_revealed(uuid, uuid)
  from public, anon, authenticated;
grant execute on function private.introduction_member_photo_is_revealed(uuid, uuid)
  to service_role;

create or replace function public.get_my_introduction_reveal_state(
  p_introduction_id uuid
)
returns table (
  photo_preference public.photo_privacy_preference,
  approved_photo_available boolean,
  photo_revealed boolean,
  can_reveal_photo boolean,
  other_photo_revealed boolean
)
language plpgsql
security definer
set search_path = public, private
as $$
declare
  v_user_id uuid := auth.uid();
  v_other_user_id uuid;
  v_status public.introduction_status;
  v_expires_at timestamptz;
  v_preference public.photo_privacy_preference;
  v_has_photo boolean := false;
begin
  if v_user_id is null then
    raise exception 'authentication required';
  end if;

  select
    case
      when i.user_a_id = v_user_id then i.user_b_id
      when i.user_b_id = v_user_id then i.user_a_id
      else null
    end,
    i.status,
    i.expires_at
  into v_other_user_id, v_status, v_expires_at
  from private.controlled_introductions i
  where i.id = p_introduction_id;

  if v_other_user_id is null
     or v_status <> 'mutually_accepted'::public.introduction_status
     or v_expires_at <= clock_timestamp()
     or private.members_are_blocked(v_user_id, v_other_user_id)
     or private.marriage_pair_is_hidden(v_user_id, v_other_user_id) then
    raise exception 'introduction unavailable';
  end if;

  select pref.photo_privacy_preference
  into v_preference
  from public.waitlist_applications a
  join public.waitlist_preferences pref on pref.application_id = a.id
  where a.user_id = v_user_id;

  select exists (
    select 1
    from public.member_profile_photos p
    where p.user_id = v_user_id
      and p.review_state = 'approved'::public.member_photo_review_state
  ) into v_has_photo;

  return query
  select
    coalesce(v_preference, 'none'::public.photo_privacy_preference),
    v_has_photo,
    private.introduction_member_photo_is_revealed(p_introduction_id, v_user_id),
    (
      v_has_photo
      and v_preference = 'explicit_approval'::public.photo_privacy_preference
      and not private.introduction_member_photo_is_revealed(p_introduction_id, v_user_id)
    ),
    private.introduction_member_photo_is_revealed(p_introduction_id, v_other_user_id);
end;
$$;

create or replace function public.reveal_my_introduction_photo(
  p_introduction_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = public, private
as $$
declare
  v_user_id uuid := auth.uid();
  v_other_user_id uuid;
  v_status public.introduction_status;
  v_expires_at timestamptz;
  v_preference public.photo_privacy_preference;
begin
  if v_user_id is null then
    raise exception 'authentication required';
  end if;

  select
    case
      when i.user_a_id = v_user_id then i.user_b_id
      when i.user_b_id = v_user_id then i.user_a_id
      else null
    end,
    i.status,
    i.expires_at
  into v_other_user_id, v_status, v_expires_at
  from private.controlled_introductions i
  where i.id = p_introduction_id
  for update;

  if v_other_user_id is null
     or v_status <> 'mutually_accepted'::public.introduction_status
     or v_expires_at <= clock_timestamp()
     or private.members_are_blocked(v_user_id, v_other_user_id)
     or private.marriage_pair_is_hidden(v_user_id, v_other_user_id)
     or not private.member_can_participate(v_user_id)
     or not private.member_can_participate(v_other_user_id) then
    raise exception 'introduction unavailable';
  end if;

  select pref.photo_privacy_preference
  into v_preference
  from public.waitlist_applications a
  join public.waitlist_preferences pref on pref.application_id = a.id
  where a.user_id = v_user_id;

  if v_preference <> 'explicit_approval'::public.photo_privacy_preference then
    raise exception 'photo follows your saved privacy choice';
  end if;

  if not exists (
    select 1
    from public.member_profile_photos p
    where p.user_id = v_user_id
      and p.review_state = 'approved'::public.member_photo_review_state
  ) then
    raise exception 'approved photo required';
  end if;

  insert into private.introduction_photo_reveal_consents (
    introduction_id,
    owner_user_id,
    revealed_at
  ) values (
    p_introduction_id,
    v_user_id,
    clock_timestamp()
  )
  on conflict (introduction_id, owner_user_id) do nothing;

  return true;
end;
$$;

revoke all on function public.get_my_introduction_reveal_state(uuid) from public, anon;
revoke all on function public.reveal_my_introduction_photo(uuid) from public, anon;
grant execute on function public.get_my_introduction_reveal_state(uuid)
  to authenticated, service_role;
grant execute on function public.reveal_my_introduction_photo(uuid)
  to authenticated, service_role;

create or replace function public.list_introduction_photo_refs(
  p_introduction_id uuid
)
returns table (
  photo_id uuid,
  "position" smallint,
  is_primary boolean
)
language plpgsql
security definer
set search_path = public, private
as $$
declare
  v_viewer_user_id uuid := auth.uid();
  v_target_user_id uuid;
  v_status public.introduction_status;
  v_expires_at timestamptz;
begin
  if v_viewer_user_id is null then
    raise exception 'authentication required';
  end if;

  select
    case
      when i.user_a_id = v_viewer_user_id then i.user_b_id
      when i.user_b_id = v_viewer_user_id then i.user_a_id
      else null
    end,
    i.status,
    i.expires_at
  into v_target_user_id, v_status, v_expires_at
  from private.controlled_introductions i
  where i.id = p_introduction_id;

  if v_target_user_id is null then
    raise exception 'introduction photos unavailable';
  end if;

  if v_status <> 'mutually_accepted'::public.introduction_status
     or v_expires_at <= clock_timestamp()
     or private.members_are_blocked(v_viewer_user_id, v_target_user_id)
     or private.marriage_pair_is_hidden(v_viewer_user_id, v_target_user_id)
     or not private.member_can_participate(v_viewer_user_id)
     or not private.member_can_participate(v_target_user_id)
     or not private.introduction_member_photo_is_revealed(p_introduction_id, v_target_user_id) then
    return;
  end if;

  return query
  select
    p.id,
    p.position,
    p.is_primary
  from public.member_profile_photos p
  where p.user_id = v_target_user_id
    and p.review_state = 'approved'::public.member_photo_review_state
  order by p.is_primary desc, p.position, p.created_at, p.id;
end;
$$;

revoke all on function public.list_introduction_photo_refs(uuid)
  from public, anon;
grant execute on function public.list_introduction_photo_refs(uuid)
  to authenticated, service_role;

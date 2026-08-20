create table private.member_photo_review_events (
  id uuid primary key default gen_random_uuid(),
  photo_id uuid not null,
  user_id uuid not null references public.users(id) on delete cascade,
  previous_state public.member_photo_review_state not null,
  new_state public.member_photo_review_state not null,
  actor_reference text not null check (char_length(actor_reference) between 1 and 120),
  review_after timestamptz,
  recorded_at timestamptz not null default clock_timestamp()
);

create index member_photo_review_events_photo_time_idx
  on private.member_photo_review_events (photo_id, recorded_at, id);

create index member_photo_review_events_user_time_idx
  on private.member_photo_review_events (user_id, recorded_at desc, id);

revoke all on table private.member_photo_review_events
  from public, anon, authenticated;
grant select, insert on table private.member_photo_review_events to service_role;

create or replace function public.review_member_photo(
  p_photo_id uuid,
  p_state public.member_photo_review_state,
  p_review_after timestamptz default null,
  p_actor_reference text default 'moderation'
)
returns boolean
language plpgsql
security definer
set search_path = public, private
as $$
declare
  v_photo public.member_profile_photos%rowtype;
  v_actor_reference text := nullif(btrim(p_actor_reference), '');
begin
  if p_photo_id is null or p_state is null then
    raise exception 'member photo review input required';
  end if;

  if v_actor_reference is null or char_length(v_actor_reference) > 120 then
    raise exception 'invalid member photo review actor';
  end if;

  select *
  into v_photo
  from public.member_profile_photos p
  where p.id = p_photo_id
  for update;

  if not found then
    raise exception 'member photo unavailable';
  end if;

  if v_photo.review_state = p_state
     and v_photo.review_after is not distinct from p_review_after then
    return false;
  end if;

  update public.member_profile_photos
  set review_state = p_state,
      review_after = p_review_after,
      updated_at = clock_timestamp()
  where id = p_photo_id;

  insert into private.member_photo_review_events (
    photo_id,
    user_id,
    previous_state,
    new_state,
    actor_reference,
    review_after
  ) values (
    p_photo_id,
    v_photo.user_id,
    v_photo.review_state,
    p_state,
    v_actor_reference,
    p_review_after
  );

  return true;
end;
$$;

revoke all on function public.review_member_photo(
  uuid,
  public.member_photo_review_state,
  timestamptz,
  text
) from public, anon, authenticated;

grant execute on function public.review_member_photo(
  uuid,
  public.member_photo_review_state,
  timestamptz,
  text
) to service_role;

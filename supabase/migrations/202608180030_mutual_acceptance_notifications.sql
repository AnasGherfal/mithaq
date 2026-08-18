alter table private.member_notifications
  drop constraint if exists member_notifications_kind_check,
  drop constraint if exists member_notifications_check,
  drop constraint if exists member_notifications_shape_check;

alter table private.member_notifications
  add constraint member_notifications_kind_check
  check (kind in ('introduction_offered', 'introduction_mutually_accepted', 'message_received')),
  add constraint member_notifications_shape_check
  check (
    (kind in ('introduction_offered', 'introduction_mutually_accepted') and message_id is null)
    or (kind = 'message_received' and message_id is not null)
  );

create unique index if not exists member_notifications_intro_mutual_unique_idx
  on private.member_notifications (user_id, introduction_id, kind)
  where kind = 'introduction_mutually_accepted';

create or replace function private.notify_controlled_introduction_mutually_accepted()
returns trigger
language plpgsql
security definer
set search_path = public, private
as $$
begin
  if new.status <> 'mutually_accepted'::public.introduction_status
     or old.status = 'mutually_accepted'::public.introduction_status then
    return new;
  end if;

  insert into private.member_notifications (
    user_id,
    kind,
    introduction_id,
    created_at
  ) values
    (
      new.user_a_id,
      'introduction_mutually_accepted',
      new.id,
      coalesce(new.mutually_accepted_at, clock_timestamp())
    ),
    (
      new.user_b_id,
      'introduction_mutually_accepted',
      new.id,
      coalesce(new.mutually_accepted_at, clock_timestamp())
    )
  on conflict do nothing;

  return new;
end;
$$;

create trigger controlled_introduction_mutual_notification
  after update of status on private.controlled_introductions
  for each row execute function private.notify_controlled_introduction_mutually_accepted();

revoke all on function private.notify_controlled_introduction_mutually_accepted()
from public, anon, authenticated;

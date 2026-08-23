-- Stage G rollback-only acceptance test for privacy-minimal activity notifications.
-- Exercises all three notification kinds, equal-timestamp cursor pagination,
-- unread count, and mark-all-read semantics without leaving staging data behind.

begin;

insert into auth.users (id, email, raw_user_meta_data)
values
  ('a7000000-0000-4000-8000-000000000001'::uuid, 'stage-g-a@acceptance.invalid', '{}'::jsonb),
  ('b7000000-0000-4000-8000-000000000002'::uuid, 'stage-g-b@acceptance.invalid', '{}'::jsonb);

insert into private.controlled_introductions (
  id, user_a_id, user_b_id, expires_at, created_by
) values (
  'c7000000-0000-4000-8000-000000000003'::uuid,
  'a7000000-0000-4000-8000-000000000001'::uuid,
  'b7000000-0000-4000-8000-000000000002'::uuid,
  clock_timestamp() + interval '7 days',
  'stage-g-acceptance'
);

update private.controlled_introductions
set user_a_decision = 'accepted'::public.introduction_decision,
    user_b_decision = 'accepted'::public.introduction_decision,
    status = 'mutually_accepted'::public.introduction_status,
    mutually_accepted_at = clock_timestamp()
where id = 'c7000000-0000-4000-8000-000000000003'::uuid;

insert into private.introduction_conversations (
  id, introduction_id, user_a_id, user_b_id
) values (
  'd7000000-0000-4000-8000-000000000004'::uuid,
  'c7000000-0000-4000-8000-000000000003'::uuid,
  'a7000000-0000-4000-8000-000000000001'::uuid,
  'b7000000-0000-4000-8000-000000000002'::uuid
);

insert into private.conversation_messages (
  id, conversation_id, sender_user_id, body, client_nonce
) values (
  'e7000000-0000-4000-8000-000000000005'::uuid,
  'd7000000-0000-4000-8000-000000000004'::uuid,
  'a7000000-0000-4000-8000-000000000001'::uuid,
  'stage g acceptance message',
  'stage-g-acceptance-nonce-0001'
);

-- Force all three notifications to the same timestamp to prove the v2 tuple
-- cursor uses the UUID tie-breaker without skipping equal-timestamp rows.
update private.member_notifications
set created_at = '2026-08-23 20:00:00+00'::timestamptz
where user_id = 'b7000000-0000-4000-8000-000000000002'::uuid
  and introduction_id = 'c7000000-0000-4000-8000-000000000003'::uuid;

select set_config('request.jwt.claim.sub', 'b7000000-0000-4000-8000-000000000002', true);

create temporary table stage_g_page_one on commit drop as
select * from public.list_my_notifications_v2(null, null, 2);

do $$
declare
  v_unread bigint;
  v_total integer;
  v_offered integer;
  v_mutual integer;
  v_message integer;
  v_cursor_created_at timestamptz;
  v_cursor_id uuid;
  v_older_count integer;
  v_marked integer;
begin
  select public.get_my_notification_unread_count() into v_unread;
  if v_unread <> 3 then
    raise exception 'expected 3 unread notifications, got %', v_unread;
  end if;

  select count(*) into v_total from stage_g_page_one;
  if v_total <> 2 then
    raise exception 'expected first activity page size 2, got %', v_total;
  end if;

  select count(*) filter (where kind = 'introduction_offered'),
         count(*) filter (where kind = 'introduction_mutually_accepted'),
         count(*) filter (where kind = 'message_received')
  into v_offered, v_mutual, v_message
  from private.member_notifications
  where user_id = 'b7000000-0000-4000-8000-000000000002'::uuid
    and introduction_id = 'c7000000-0000-4000-8000-000000000003'::uuid;

  if v_offered <> 1 or v_mutual <> 1 or v_message <> 1 then
    raise exception 'unexpected activity kinds offered %, mutual %, message %', v_offered, v_mutual, v_message;
  end if;

  select created_at, notification_id
  into v_cursor_created_at, v_cursor_id
  from stage_g_page_one
  order by created_at desc, notification_id desc
  offset 1 limit 1;

  select count(*) into v_older_count
  from public.list_my_notifications_v2(v_cursor_created_at, v_cursor_id, 30);

  if v_older_count <> 1 then
    raise exception 'equal-timestamp cursor expected 1 older notification, got %', v_older_count;
  end if;

  select public.mark_my_notifications_read_v2(created_at, notification_id)
  into v_marked
  from stage_g_page_one
  order by created_at desc, notification_id desc
  limit 1;

  if v_marked <> 3 then
    raise exception 'mark-all cursor expected to mark 3 notifications, got %', v_marked;
  end if;

  select public.get_my_notification_unread_count() into v_unread;
  if v_unread <> 0 then
    raise exception 'expected 0 unread after mark-all, got %', v_unread;
  end if;
end
$$;

select 'PASS' as stage_g_activity_acceptance,
       3 as notification_kinds,
       2 as first_page_size,
       1 as equal_timestamp_older_page,
       0 as unread_after_mark_all;

rollback;

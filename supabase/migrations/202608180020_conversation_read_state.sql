create table private.conversation_member_reads (
  conversation_id uuid not null references private.introduction_conversations(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  last_read_at timestamptz not null,
  updated_at timestamptz not null default clock_timestamp(),
  primary key (conversation_id, user_id)
);

create index conversation_member_reads_user_idx
  on private.conversation_member_reads (user_id, updated_at desc);

revoke all on table private.conversation_member_reads from public, anon, authenticated;
grant select, insert, update, delete on table private.conversation_member_reads to service_role;

create or replace function public.mark_my_conversation_read(
  p_introduction_id uuid,
  p_through timestamptz default null
)
returns timestamptz
language plpgsql
security definer
set search_path = public, private
as $$
declare
  v_user_id uuid := auth.uid();
  v_conversation_id uuid;
  v_through timestamptz;
  v_saved timestamptz;
begin
  if v_user_id is null then
    raise exception 'authentication required';
  end if;

  v_conversation_id := private.member_open_conversation_id(p_introduction_id, v_user_id);
  if v_conversation_id is null then
    raise exception 'conversation unavailable';
  end if;

  v_through := least(coalesce(p_through, clock_timestamp()), clock_timestamp());

  insert into private.conversation_member_reads (
    conversation_id,
    user_id,
    last_read_at,
    updated_at
  ) values (
    v_conversation_id,
    v_user_id,
    v_through,
    clock_timestamp()
  )
  on conflict (conversation_id, user_id) do update
  set last_read_at = greatest(private.conversation_member_reads.last_read_at, excluded.last_read_at),
      updated_at = clock_timestamp()
  returning last_read_at into v_saved;

  return v_saved;
end;
$$;

create or replace function public.list_my_conversation_unread_counts()
returns table (
  introduction_id uuid,
  unread_count bigint
)
language plpgsql
stable
security definer
set search_path = public, private
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'authentication required';
  end if;

  if not exists (
    select 1
    from public.users u
    where u.id = v_user_id
      and u.account_status = 'active'
  ) then
    raise exception 'account unavailable';
  end if;

  return query
  select
    c.introduction_id,
    count(m.id) filter (
      where m.sender_user_id <> v_user_id
        and m.sent_at > coalesce(r.last_read_at, '-infinity'::timestamptz)
    )::bigint as unread_count
  from private.introduction_conversations c
  left join private.conversation_member_reads r
    on r.conversation_id = c.id
   and r.user_id = v_user_id
  left join private.conversation_messages m
    on m.conversation_id = c.id
  where (c.user_a_id = v_user_id or c.user_b_id = v_user_id)
    and private.member_open_conversation_id(c.introduction_id, v_user_id) = c.id
  group by c.id, c.introduction_id, r.last_read_at
  order by c.opened_at desc, c.introduction_id;
end;
$$;

revoke all on function public.mark_my_conversation_read(uuid, timestamptz) from public, anon, authenticated;
grant execute on function public.mark_my_conversation_read(uuid, timestamptz) to authenticated, service_role;

revoke all on function public.list_my_conversation_unread_counts() from public, anon, authenticated;
grant execute on function public.list_my_conversation_unread_counts() to authenticated, service_role;

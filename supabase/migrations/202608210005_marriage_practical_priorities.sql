create table private.marriage_practical_priorities (
  user_id uuid primary key references public.users(id) on delete cascade,
  living_arrangement text not null check (
    living_arrangement in ('independent_home', 'with_family_initially', 'with_family_long_term', 'flexible')
  ),
  children_plan text not null check (
    children_plan in ('want_children', 'do_not_want_children', 'unsure')
  ),
  work_after_marriage text not null check (
    work_after_marriage in ('both_work', 'one_may_pause', 'open_to_discuss', 'no_preference')
  ),
  wedding_style text not null check (
    wedding_style in ('simple', 'moderate', 'large', 'discuss_together')
  ),
  completed_at timestamptz not null default clock_timestamp(),
  created_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default clock_timestamp()
);

revoke all on table private.marriage_practical_priorities from public, anon, authenticated;
grant select, insert, update, delete on table private.marriage_practical_priorities to service_role;

create or replace function public.get_my_marriage_practical_priorities()
returns table (
  living_arrangement text,
  children_plan text,
  work_after_marriage text,
  wedding_style text,
  completed_at timestamptz
)
language plpgsql
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
    from public.member_connection_spaces s
    where s.user_id = v_user_id
      and s.space = 'marriage'::public.connection_space
      and s.membership_state = 'active'::public.connection_space_membership_state
  ) then
    raise exception 'marriage space required';
  end if;

  return query
  select
    p.living_arrangement,
    p.children_plan,
    p.work_after_marriage,
    p.wedding_style,
    p.completed_at
  from private.marriage_practical_priorities p
  where p.user_id = v_user_id;
end;
$$;

create or replace function public.save_my_marriage_practical_priorities(
  p_living_arrangement text,
  p_children_plan text,
  p_work_after_marriage text,
  p_wedding_style text
)
returns table (
  living_arrangement text,
  children_plan text,
  work_after_marriage text,
  wedding_style text,
  completed_at timestamptz
)
language plpgsql
security definer
set search_path = public, private
as $$
declare
  v_user_id uuid := auth.uid();
  v_now timestamptz := clock_timestamp();
begin
  if v_user_id is null then
    raise exception 'authentication required';
  end if;

  if not exists (
    select 1 from public.users u
    where u.id = v_user_id
      and u.account_status = 'active'
  ) then
    raise exception 'account unavailable';
  end if;

  if not exists (
    select 1
    from public.member_connection_spaces s
    where s.user_id = v_user_id
      and s.space = 'marriage'::public.connection_space
      and s.membership_state = 'active'::public.connection_space_membership_state
  ) then
    raise exception 'marriage space required';
  end if;

  if p_living_arrangement is null or p_living_arrangement not in (
    'independent_home', 'with_family_initially', 'with_family_long_term', 'flexible'
  ) then
    raise exception 'invalid living arrangement';
  end if;

  if p_children_plan is null or p_children_plan not in (
    'want_children', 'do_not_want_children', 'unsure'
  ) then
    raise exception 'invalid children plan';
  end if;

  if p_work_after_marriage is null or p_work_after_marriage not in (
    'both_work', 'one_may_pause', 'open_to_discuss', 'no_preference'
  ) then
    raise exception 'invalid work preference';
  end if;

  if p_wedding_style is null or p_wedding_style not in (
    'simple', 'moderate', 'large', 'discuss_together'
  ) then
    raise exception 'invalid wedding style';
  end if;

  insert into private.marriage_practical_priorities (
    user_id,
    living_arrangement,
    children_plan,
    work_after_marriage,
    wedding_style,
    completed_at,
    created_at,
    updated_at
  ) values (
    v_user_id,
    p_living_arrangement,
    p_children_plan,
    p_work_after_marriage,
    p_wedding_style,
    v_now,
    v_now,
    v_now
  )
  on conflict (user_id) do update
  set living_arrangement = excluded.living_arrangement,
      children_plan = excluded.children_plan,
      work_after_marriage = excluded.work_after_marriage,
      wedding_style = excluded.wedding_style,
      completed_at = coalesce(private.marriage_practical_priorities.completed_at, excluded.completed_at),
      updated_at = excluded.updated_at;

  return query
  select
    p.living_arrangement,
    p.children_plan,
    p.work_after_marriage,
    p.wedding_style,
    p.completed_at
  from private.marriage_practical_priorities p
  where p.user_id = v_user_id;
end;
$$;

revoke all on function public.get_my_marriage_practical_priorities() from public, anon;
revoke all on function public.save_my_marriage_practical_priorities(text, text, text, text) from public, anon;
grant execute on function public.get_my_marriage_practical_priorities() to authenticated, service_role;
grant execute on function public.save_my_marriage_practical_priorities(text, text, text, text) to authenticated, service_role;

-- Group pools: leads pick who gets shuffled into a sprint's groups, so
-- people who stopped coming aren't. Everyone outside the pool stays
-- unassigned. The pool isn't saved; the page sends it with each shuffle.

-- generate_groups now takes the pool. Active participants in p_pool are
-- shuffled; leads, inactive accounts and unknown ids are skipped.
drop function public.generate_groups(bigint, integer);

create function public.generate_groups(p_sprint bigint, p_size integer, p_pool uuid[])
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  s public.sprints;
  pool integer;
  group_count integer;
begin
  s := private.lock_sprint_for_admin(p_sprint);
  if s.groups_published_at is not null then
    raise exception 'Groups for this sprint are already published. Move people instead of reshuffling.';
  end if;
  if p_size is null or p_size not between 2 and 8 then
    raise exception 'Group size must be from 2 to 8.';
  end if;

  select count(*) into pool
  from public.participants p
  where p.id = any (coalesce(p_pool, '{}')) and p.active and p.role = 'participant';
  if pool = 0 then
    raise exception 'The pool is empty. Add at least one participant.';
  end if;

  delete from public.groups g where g.sprint_id = p_sprint;

  group_count := ceil(pool::numeric / p_size)::integer;
  insert into public.groups (sprint_id, number)
  select p_sprint, n from generate_series(1, group_count) as n;

  insert into public.group_members (sprint_id, group_id, participant_id)
  select p_sprint, g.id, shuffled.id
  from (
    select p.id, row_number() over (order by random()) - 1 as i
    from public.participants p
    where p.id = any (p_pool) and p.active and p.role = 'participant'
  ) as shuffled
  join public.groups g on g.sprint_id = p_sprint and g.number = (shuffled.i % group_count) + 1;

  return group_count;
end;
$$;

revoke execute on function public.generate_groups(bigint, integer, uuid[]) from public, anon;
grant execute on function public.generate_groups(bigint, integer, uuid[]) to authenticated;

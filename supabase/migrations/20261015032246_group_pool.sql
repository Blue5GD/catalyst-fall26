-- Group pools: leads pick who gets shuffled into a sprint's groups, so
-- people who stopped coming aren't. Everyone outside the pool stays
-- unassigned. The pool is saved per sprint, so a reshuffle starts from the
-- same people.

create table public.group_pool (
  sprint_id bigint not null references public.sprints (id) on delete cascade,
  participant_id uuid not null references public.participants (id) on delete cascade,
  primary key (sprint_id, participant_id)
);

alter table public.group_pool enable row level security;

create policy "Admins read group pools"
  on public.group_pool for select
  to authenticated
  using (
    exists (select 1 from public.participants p where p.id = (select auth.uid()) and p.role = 'admin' and p.active)
  );

revoke all on public.group_pool from anon, authenticated;
grant select (sprint_id, participant_id) on public.group_pool to authenticated;

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

  delete from public.group_pool gp where gp.sprint_id = p_sprint;
  insert into public.group_pool (sprint_id, participant_id)
  select p_sprint, p.id
  from public.participants p
  where p.id = any (coalesce(p_pool, '{}')) and p.active and p.role = 'participant';

  select count(*) into pool from public.group_pool gp where gp.sprint_id = p_sprint;
  if pool = 0 then
    raise exception 'The pool is empty. Add at least one participant.';
  end if;

  delete from public.groups g where g.sprint_id = p_sprint;

  group_count := ceil(pool::numeric / p_size)::integer;
  insert into public.groups (sprint_id, number)
  select p_sprint, n from generate_series(1, group_count) as n;

  insert into public.group_members (sprint_id, group_id, participant_id)
  select p_sprint, g.id, shuffled.participant_id
  from (
    select gp.participant_id, row_number() over (order by random()) - 1 as i
    from public.group_pool gp
    where gp.sprint_id = p_sprint
  ) as shuffled
  join public.groups g on g.sprint_id = p_sprint and g.number = (shuffled.i % group_count) + 1;

  return group_count;
end;
$$;

-- Same as before, plus: putting someone in a group adds them to the pool, so
-- a reshuffle keeps them. Taking someone out leaves the pool alone.
create or replace function public.move_to_group(
  p_sprint bigint,
  p_participant uuid,
  p_group_number integer,
  p_new_group boolean default false
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_id bigint;
  next_number integer;
begin
  perform private.lock_sprint_for_admin(p_sprint);
  if not exists (select 1 from public.participants p where p.id = p_participant and p.active) then
    raise exception 'That person isn''t an active participant. Reload the page and pick again.';
  end if;

  if coalesce(p_new_group, false) then
    select coalesce(max(g.number), 0) + 1 into next_number from public.groups g where g.sprint_id = p_sprint;
    insert into public.groups (sprint_id, number) values (p_sprint, next_number) returning id into target_id;
  elsif p_group_number is not null then
    select g.id into target_id from public.groups g where g.sprint_id = p_sprint and g.number = p_group_number;
    if target_id is null then
      raise exception 'That group doesn''t exist. Reload the page and pick again.';
    end if;
  end if;

  if target_id is null then
    delete from public.group_members m where m.sprint_id = p_sprint and m.participant_id = p_participant;
  else
    insert into public.group_members (sprint_id, group_id, participant_id)
    values (p_sprint, target_id, p_participant)
    on conflict (sprint_id, participant_id) do update set group_id = excluded.group_id;
    insert into public.group_pool (sprint_id, participant_id)
    select p_sprint, p.id from public.participants p where p.id = p_participant and p.role = 'participant'
    on conflict do nothing;
  end if;

  delete from public.groups g
  where g.sprint_id = p_sprint
    and not exists (select 1 from public.group_members m where m.group_id = g.id);
end;
$$;

-- Sprints grouped before pools existed: their pool is whoever is in a group.
insert into public.group_pool (sprint_id, participant_id)
select m.sprint_id, m.participant_id
from public.group_members m
join public.participants p on p.id = m.participant_id
where p.role = 'participant'
on conflict do nothing;

revoke execute on function public.generate_groups(bigint, integer, uuid[]) from public, anon;
grant execute on function public.generate_groups(bigint, integer, uuid[]) to authenticated;

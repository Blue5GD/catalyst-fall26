-- Points each group member earned during a sprint, for the group page (PRD
-- G-2), and a fix so "New group" leaves someone alone if they already are.

-- Signed-in users can't read point_entries.created_at, so this does the date
-- filtering for them. It returns only what the group page shows: each grouped
-- member's points between the sprint's first and last day, New Haven time.
-- Draft groups stay hidden from participants, as in the RLS policies.
create function public.sprint_points(p_sprint bigint)
returns table (participant_id uuid, points bigint)
language sql
stable
security definer
set search_path = ''
as $$
  select m.participant_id, coalesce(sum(e.amount), 0)::bigint
  from public.sprints s
  join public.group_members m on m.sprint_id = s.id
  left join public.point_entries e
    on e.participant_id = m.participant_id
    and (e.created_at at time zone 'America/New_York')::date between s.starts_on and s.ends_on
  where s.id = p_sprint
    and (s.groups_published_at is not null or private.is_admin())
  group by m.participant_id;
$$;

revoke execute on function public.sprint_points(bigint) from public, anon;
grant execute on function public.sprint_points(bigint) to authenticated;

-- Same as before, except "New group" for someone who is already the only
-- member of their group does nothing, so their group number doesn't change.
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
    if exists (
      select 1 from public.group_members m
      where m.sprint_id = p_sprint and m.participant_id = p_participant
        and not exists (
          select 1 from public.group_members o
          where o.group_id = m.group_id and o.participant_id <> p_participant
        )
    ) then
      return;
    end if;
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
  end if;

  delete from public.groups g
  where g.sprint_id = p_sprint
    and not exists (select 1 from public.group_members m where m.group_id = g.id);
end;
$$;

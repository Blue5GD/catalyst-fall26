-- Groups: the sprint calendar, random groups per sprint, and the admin
-- functions that make, adjust and publish them (PRD G-1, G-2).
--
-- Draft groups are visible only to admins. Once a sprint's groups are
-- published, anyone signed in can read them. Visitors never can. Nobody
-- writes these tables directly; the admin functions below do every write.

-- Sprints --------------------------------------------------------------------

create table public.sprints (
  id bigint generated always as identity primary key,
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  number smallint not null unique check (number > 0),
  title text not null check (length(trim(title)) > 0),
  starts_on date not null,
  ends_on date not null,
  group_mode text not null default 'random' check (group_mode in ('random', 'self_select')),
  groups_published_at timestamptz,
  check (ends_on >= starts_on)
);

comment on table public.sprints is
  'The program calendar. groups_published_at is null while the sprint''s groups are a draft.';

insert into public.sprints (number, slug, title, starts_on, ends_on, group_mode) values
  (1, 'project-1', 'Personal website', '2026-09-28', '2026-10-11', 'random'),
  (2, 'project-2', 'AI agent', '2026-10-12', '2026-10-25', 'random'),
  (3, 'project-3', 'Board-game bot tournament', '2026-11-02', '2026-11-15', 'self_select'),
  (4, 'final-project', 'Final project', '2026-11-16', '2026-12-06', 'self_select'),
  (5, 'demo-day', 'Demo Day', '2026-12-07', '2026-12-13', 'self_select');

-- Groups ---------------------------------------------------------------------

-- Numbers are set when a group is made and never change, so a published
-- "Group 5" stays Group 5 even if another group empties.
create table public.groups (
  id bigint generated always as identity primary key,
  sprint_id bigint not null references public.sprints (id) on delete cascade,
  number smallint not null check (number > 0),
  unique (sprint_id, number),
  unique (id, sprint_id)
);

-- sprint_id is copied from the group so the primary key can allow only one
-- group per person per sprint. The composite key keeps the copy honest.
create table public.group_members (
  sprint_id bigint not null,
  group_id bigint not null,
  participant_id uuid not null references public.participants (id) on delete cascade,
  primary key (sprint_id, participant_id),
  foreign key (group_id, sprint_id) references public.groups (id, sprint_id) on delete cascade
);

create index group_members_group_id_idx on public.group_members (group_id);

-- Access -------------------------------------------------------------------

alter table public.sprints enable row level security;
alter table public.groups enable row level security;
alter table public.group_members enable row level security;

create policy "Anyone can read sprints"
  on public.sprints for select
  to anon, authenticated
  using (true);

-- private.is_admin() isn't callable by signed-in users, so the admin check is
-- written out here. It reads only columns they're already granted.
create policy "Signed-in users read published groups; admins read drafts"
  on public.groups for select
  to authenticated
  using (
    exists (select 1 from public.sprints s where s.id = sprint_id and s.groups_published_at is not null)
    or exists (select 1 from public.participants p where p.id = (select auth.uid()) and p.role = 'admin' and p.active)
  );

create policy "Signed-in users read published members; admins read drafts"
  on public.group_members for select
  to authenticated
  using (
    exists (select 1 from public.sprints s where s.id = sprint_id and s.groups_published_at is not null)
    or exists (select 1 from public.participants p where p.id = (select auth.uid()) and p.role = 'admin' and p.active)
  );

revoke all on public.sprints, public.groups, public.group_members from anon, authenticated;

grant select (id, slug, number, title, starts_on, ends_on, group_mode, groups_published_at)
  on public.sprints to anon, authenticated;
grant select (id, sprint_id, number) on public.groups to authenticated;
grant select (sprint_id, group_id, participant_id) on public.group_members to authenticated;

-- Admin functions ------------------------------------------------------------

-- Checks the caller is an admin and locks the sprint row, so two leads
-- changing the same sprint take turns.
create function private.lock_sprint_for_admin(p_sprint bigint)
returns public.sprints
language plpgsql
security definer
set search_path = ''
as $$
declare
  s public.sprints;
begin
  if not private.is_admin() then
    raise exception 'Only Catalyst leads can change groups.';
  end if;
  select * into s from public.sprints where id = p_sprint for update;
  if not found then
    raise exception 'That sprint doesn''t exist.';
  end if;
  return s;
end;
$$;

-- Replaces the sprint's draft with a fresh shuffle of every active participant
-- (not admins). Dealing round-robin into ceil(n / size) groups keeps sizes
-- within one of each other: 10 people at size 4 make 4, 3, 3.
create function public.generate_groups(p_sprint bigint, p_size integer)
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

  select count(*) into pool from public.participants p where p.active and p.role = 'participant';
  if pool = 0 then
    raise exception 'No participants to group yet.';
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
    where p.active and p.role = 'participant'
  ) as shuffled
  join public.groups g on g.sprint_id = p_sprint and g.number = (shuffled.i % group_count) + 1;

  return group_count;
end;
$$;

-- Moves one person, in a draft or after publishing. p_new_group puts them in a
-- new group numbered after the highest; otherwise p_group_number must be an
-- existing group, or null to take them out of their group. The database picks
-- the new number so two leads can't both claim it. Any group left empty is
-- deleted.
create function public.move_to_group(
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
  end if;

  delete from public.groups g
  where g.sprint_id = p_sprint
    and not exists (select 1 from public.group_members m where m.group_id = g.id);
end;
$$;

-- Makes the sprint's groups visible to everyone signed in. There's no
-- unpublish; a lead can clear groups_published_at in the table editor.
create function public.publish_groups(p_sprint bigint)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  s public.sprints;
begin
  s := private.lock_sprint_for_admin(p_sprint);
  if s.groups_published_at is not null then
    raise exception 'Groups for this sprint are already published.';
  end if;
  if not exists (select 1 from public.groups g where g.sprint_id = p_sprint) then
    raise exception 'Generate groups before publishing.';
  end if;
  update public.sprints set groups_published_at = now() where id = p_sprint;
end;
$$;

revoke execute on function private.lock_sprint_for_admin(bigint) from public, anon, authenticated;
revoke execute on function public.generate_groups(bigint, integer) from public, anon;
revoke execute on function public.move_to_group(bigint, uuid, integer, boolean) from public, anon;
revoke execute on function public.publish_groups(bigint) from public, anon;

grant execute on function public.generate_groups(bigint, integer) to authenticated;
grant execute on function public.move_to_group(bigint, uuid, integer, boolean) to authenticated;
grant execute on function public.publish_groups(bigint) to authenticated;

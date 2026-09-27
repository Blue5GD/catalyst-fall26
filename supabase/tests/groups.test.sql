-- Tests for supabase/migrations/*_groups.sql.
-- Run with: npx supabase test db
begin;
create extension if not exists pgtap with schema extensions;
select plan(39);

-- Only the accounts made here take part in the shuffle. Everything is rolled
-- back at the end.
update public.participants set active = false;
delete from public.groups;
update public.sprints set groups_published_at = null;

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-00000000000a', 'pgtap-lead@yale.edu', '{"name":"Pgtap Lead","netid":"zzlead"}'),
  ('00000000-0000-0000-0000-00000000000d', 'pgtap-gone@yale.edu', '{"name":"Pgtap Gone","netid":"zzgone"}');
-- Ten participants: ...0101 to ...0110, NetIDs zzp01 to zzp10.
insert into auth.users (id, email, raw_user_meta_data)
select
  ('00000000-0000-0000-0000-0000000001' || lpad(i::text, 2, '0'))::uuid,
  'pgtap-p' || i || '@yale.edu',
  json_build_object('name', 'Pgtap P' || i, 'netid', 'zzp' || lpad(i::text, 2, '0'))::jsonb
from generate_series(1, 10) as i;
update public.participants set role = 'admin' where netid = 'zzlead';
update public.participants set active = false where netid = 'zzgone';

create function pg_temp.act_as(uid uuid) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
$$;
create function pg_temp.sprint(p_slug text) returns bigint language sql as $$
  select id from public.sprints where slug = p_slug;
$$;

-- As a visitor --------------------------------------------------------------
set local role anon;

select isnt_empty($$select * from public.sprints$$, 'visitors can read sprints');
select throws_ok($$select * from public.groups$$, '42501', null, 'visitors cannot read groups');
select throws_ok($$select * from public.group_members$$, '42501', null, 'visitors cannot read group members');

-- As a participant ----------------------------------------------------------
reset role;
select pg_temp.act_as('00000000-0000-0000-0000-000000000101');
set local role authenticated;

select throws_ok(
  $$select public.generate_groups(pg_temp.sprint('project-1'), 4)$$,
  'P0001', 'Only Catalyst leads can change groups.', 'a participant cannot generate groups'
);
select throws_ok(
  $$select public.move_to_group(pg_temp.sprint('project-1'), '00000000-0000-0000-0000-000000000102', 1)$$,
  'P0001', 'Only Catalyst leads can change groups.', 'a participant cannot move people'
);
select throws_ok(
  $$select public.publish_groups(pg_temp.sprint('project-1'))$$,
  'P0001', 'Only Catalyst leads can change groups.', 'a participant cannot publish'
);

-- As an admin: generate -------------------------------------------------------
reset role;
select pg_temp.act_as('00000000-0000-0000-0000-00000000000a');
set local role authenticated;

select throws_ok(
  $$select public.generate_groups(pg_temp.sprint('project-1'), 1)$$,
  'P0001', 'Group size must be from 2 to 8.', 'group size below 2 is refused'
);
select is(public.generate_groups(pg_temp.sprint('project-1'), 4), 3, 'ten participants at size 4 make three groups');
select results_eq(
  $$select count(*)::int from public.group_members where sprint_id = pg_temp.sprint('project-1') group by group_id order by 1 desc$$,
  $$values (4), (3), (3)$$,
  'group sizes differ by at most one'
);
select is(
  (select count(*)::int from public.group_members where sprint_id = pg_temp.sprint('project-1')),
  10,
  'every participant is placed'
);
select is_empty(
  $$select 1 from public.group_members where sprint_id = pg_temp.sprint('project-1')
    and participant_id in ('00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000000d')$$,
  'admins and inactive accounts are not shuffled in'
);
select is(public.generate_groups(pg_temp.sprint('project-1'), 4), 3, 'generating again works on a draft');
select is(
  (select count(*)::int from public.groups where sprint_id = pg_temp.sprint('project-1')),
  3,
  'generating again replaces the draft'
);

-- A participant can't see the draft -----------------------------------------------
reset role;
select pg_temp.act_as('00000000-0000-0000-0000-000000000101');
set local role authenticated;

select is_empty($$select * from public.groups where sprint_id = pg_temp.sprint('project-1')$$, 'participants cannot see draft groups');

-- As an admin: move ---------------------------------------------------------------
reset role;
select pg_temp.act_as('00000000-0000-0000-0000-00000000000a');
set local role authenticated;

select lives_ok(
  $$select public.move_to_group(pg_temp.sprint('project-1'), '00000000-0000-0000-0000-000000000101', 1)$$,
  'an admin moves someone to an existing group'
);
select is(
  (select g.number::int from public.group_members m join public.groups g on g.id = m.group_id
   where m.sprint_id = pg_temp.sprint('project-1') and m.participant_id = '00000000-0000-0000-0000-000000000101'),
  1,
  'the person is in the group they were moved to'
);
select lives_ok(
  $$select public.move_to_group(pg_temp.sprint('project-1'), '00000000-0000-0000-0000-000000000101', null, true)$$,
  'moving to a new group makes one'
);
select is(
  (select count(*)::int from public.groups where sprint_id = pg_temp.sprint('project-1')),
  4,
  'the new group exists'
);
select throws_ok(
  $$select public.move_to_group(pg_temp.sprint('project-1'), '00000000-0000-0000-0000-000000000101', 5)$$,
  'P0001', 'That group doesn''t exist. Reload the page and pick again.',
  'a group number that doesn''t exist is refused, even the next one (a stale "New group" pick)'
);
select lives_ok(
  $$select public.move_to_group(pg_temp.sprint('project-1'), '00000000-0000-0000-0000-000000000101', null)$$,
  'an admin removes someone from their group'
);
select is(
  (select count(*)::int from public.groups where sprint_id = pg_temp.sprint('project-1')),
  3,
  'a group left empty is deleted'
);
select is_empty(
  $$select 1 from public.group_members where sprint_id = pg_temp.sprint('project-1')
    and participant_id = '00000000-0000-0000-0000-000000000101'$$,
  'the removed person is in no group'
);
select throws_ok(
  $$select public.move_to_group(pg_temp.sprint('project-1'), '00000000-0000-0000-0000-00000000000d', 1)$$,
  'P0001', 'That person isn''t an active participant. Reload the page and pick again.', 'inactive accounts cannot be moved in'
);
select lives_ok(
  $$select public.move_to_group(pg_temp.sprint('project-1'), '00000000-0000-0000-0000-00000000000a', 1)$$,
  'an admin can add a lead by hand'
);

-- As an admin: publish ------------------------------------------------------------
select throws_ok(
  $$select public.publish_groups(pg_temp.sprint('project-2'))$$,
  'P0001', 'Generate groups before publishing.', 'publishing with no groups is refused'
);
select lives_ok($$select public.publish_groups(pg_temp.sprint('project-1'))$$, 'an admin publishes groups');
select throws_ok(
  $$select public.generate_groups(pg_temp.sprint('project-1'), 4)$$,
  'P0001', 'Groups for this sprint are already published. Move people instead of reshuffling.',
  'generating after publish is refused'
);
select throws_ok(
  $$select public.publish_groups(pg_temp.sprint('project-1'))$$,
  'P0001', 'Groups for this sprint are already published.', 'publishing twice is refused'
);
select lives_ok(
  $$select public.move_to_group(pg_temp.sprint('project-1'), '00000000-0000-0000-0000-000000000101', 2)$$,
  'admins can still move people after publishing'
);

-- Emptying a middle group leaves a gap; numbers never shift.
with leaving as materialized (
  select m.participant_id from public.group_members m join public.groups g on g.id = m.group_id
  where g.sprint_id = pg_temp.sprint('project-1') and g.number = 2
)
select public.move_to_group(pg_temp.sprint('project-1'), participant_id, null) from leaving;

select results_eq(
  $$select number::int from public.groups where sprint_id = pg_temp.sprint('project-1') order by number$$,
  $$values (1), (3)$$,
  'other groups keep their numbers when one empties'
);
select lives_ok(
  $$select public.move_to_group(pg_temp.sprint('project-1'), '00000000-0000-0000-0000-000000000101', null, true)$$,
  'a new group takes the number above the highest'
);
select results_eq(
  $$select number::int from public.groups where sprint_id = pg_temp.sprint('project-1') order by number$$,
  $$values (1), (3), (4)$$,
  'the gap is not reused'
);
select public.move_to_group(pg_temp.sprint('project-1'), '00000000-0000-0000-0000-000000000101', null, true);
select results_eq(
  $$select number::int from public.groups where sprint_id = pg_temp.sprint('project-1') order by number$$,
  $$values (1), (3), (4)$$,
  '"New group" for someone already alone keeps their group number'
);

-- Points this sprint --------------------------------------------------------------
reset role;
insert into public.point_entries (participant_id, amount, reason, created_at) values
  ('00000000-0000-0000-0000-000000000101', 3, 'pgtap in sprint', '2026-09-30 12:00-04'),
  ('00000000-0000-0000-0000-000000000101', 5, 'pgtap before sprint', '2026-09-27 23:30-04'),
  ('00000000-0000-0000-0000-000000000101', 7, 'pgtap after sprint', '2026-10-12 00:30-04');

-- A participant sees published groups ---------------------------------------------
reset role;
select pg_temp.act_as('00000000-0000-0000-0000-000000000102');
set local role authenticated;

select isnt_empty($$select * from public.groups where sprint_id = pg_temp.sprint('project-1')$$, 'participants see published groups');
select isnt_empty($$select * from public.group_members where sprint_id = pg_temp.sprint('project-1')$$, 'participants see published members');
select is(
  (select points::int from public.sprint_points(pg_temp.sprint('project-1')) where participant_id = '00000000-0000-0000-0000-000000000101'),
  3,
  'sprint points count only entries between the sprint''s first and last day, New Haven time'
);
select is(
  (select points::int from public.sprint_points(pg_temp.sprint('project-1')) where participant_id = '00000000-0000-0000-0000-000000000102'),
  0,
  'grouped members with no points this sprint show 0'
);

reset role;
update public.sprints set groups_published_at = null where id = pg_temp.sprint('project-1');
select pg_temp.act_as('00000000-0000-0000-0000-000000000102');
set local role authenticated;
select is_empty($$select * from public.sprint_points(pg_temp.sprint('project-1'))$$, 'participants get no sprint points for draft groups');

reset role;
set local role anon;
select throws_ok($$select * from public.sprint_points(1)$$, '42501', null, 'visitors cannot read sprint points');

select * from finish();
rollback;

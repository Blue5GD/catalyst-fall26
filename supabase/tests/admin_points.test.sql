-- Tests for supabase/migrations/*_admin_points.sql.
-- Run with: npx supabase test db
begin;
create extension if not exists pgtap with schema extensions;
select plan(17);

-- The sign-up trigger creates a participants row for each of these. Names and
-- emails are unusual so they can't clash with accounts already in the database.
insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-00000000000a', 'pgtap-lead@yale.edu', '{"name":"Pgtap Lead","netid":"zzlead"}'),
  ('00000000-0000-0000-0000-00000000000b', 'pgtap-maya@yale.edu', '{"name":"Pgtap Maya","netid":"zzmaya"}'),
  ('00000000-0000-0000-0000-00000000000c', 'pgtap-sam@yale.edu', '{"name":"Pgtap Sam","netid":"zzsam"}'),
  ('00000000-0000-0000-0000-00000000000d', 'pgtap-gone@yale.edu', '{"name":"Pgtap Gone","netid":"zzgone"}');
update public.participants set role = 'admin' where netid = 'zzlead';
update public.participants set active = false where netid = 'zzgone';

-- Act as a signed-in user for the rest of the transaction.
create function pg_temp.act_as(uid uuid) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
$$;

-- As a participant ------------------------------------------------------------
select pg_temp.act_as('00000000-0000-0000-0000-00000000000b');
set local role authenticated;

select throws_ok(
  $$select public.add_point_entries(array['00000000-0000-0000-0000-00000000000c']::uuid[], 3, 'Nice', 'award')$$,
  'P0001', 'Only Catalyst leads can add points.',
  'a participant cannot add points'
);
select throws_ok(
  $$select * from public.recent_point_entries(50)$$,
  'P0001', 'Only Catalyst leads can see all entries.',
  'a participant cannot read the recent log'
);
select throws_ok(
  $$select private.is_admin()$$,
  '42501', null,
  'private.is_admin is not callable over the API'
);
select is(
  (select role from public.participants where netid = 'zzmaya'),
  'participant',
  'a signed-in user can read role'
);

-- As an admin -----------------------------------------------------------------
reset role;
select pg_temp.act_as('00000000-0000-0000-0000-00000000000a');
set local role authenticated;

select is(
  public.add_point_entries(
    array['00000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-00000000000c']::uuid[],
    3, '  Won the design challenge  ', 'award'
  ),
  2,
  'an admin adds one entry per person'
);
select throws_ok(
  $$select public.add_point_entries(array['00000000-0000-0000-0000-00000000000b','00000000-0000-0000-0000-00000000000b']::uuid[], 1, 'x', 'award')$$,
  'P0001', 'The same person is listed twice.',
  'duplicate ids are rejected'
);
select throws_ok(
  $$select public.add_point_entries(array['00000000-0000-0000-0000-00000000000d']::uuid[], 1, 'x', 'award')$$,
  'P0001', 'Some of these people aren''t active participants. Reload the page and pick again.',
  'inactive participants are rejected'
);
select throws_ok(
  $$select public.add_point_entries(array['00000000-0000-0000-0000-00000000000b']::uuid[], 0, 'x', 'award')$$,
  'P0001', 'Points can''t be 0.',
  'zero points are rejected'
);
select throws_ok(
  $$select public.add_point_entries(array['00000000-0000-0000-0000-00000000000b']::uuid[], 1, '   ', 'award')$$,
  'P0001', 'Add a reason. It shows in each person''s points history.',
  'a blank reason is rejected'
);
select throws_ok(
  $$select public.add_point_entries(array['00000000-0000-0000-0000-00000000000b']::uuid[], 1, 'x', 'attendance')$$,
  'P0001', 'Kind must be award or correction.',
  'other source types are rejected'
);
select is(
  (select count(*)::integer from public.point_history('00000000-0000-0000-0000-00000000000c')),
  1,
  'an admin can read anyone''s history'
);
select is(
  (select count(*)::integer from public.recent_point_entries(50) where netid in ('zzmaya', 'zzsam')),
  2,
  'an admin can read the recent log'
);

-- Stored rows (checked as the table owner) -------------------------------------
reset role;
select is(
  (select count(*)::integer from public.point_entries
    where created_by = 'Pgtap Lead' and reason = 'Won the design challenge' and amount = 3 and source_type = 'award'),
  2,
  'created_by is set by the database and the reason is trimmed'
);

-- History as a participant ------------------------------------------------------
select pg_temp.act_as('00000000-0000-0000-0000-00000000000b');
set local role authenticated;
select is(
  (select count(*)::integer from public.point_history('00000000-0000-0000-0000-00000000000b')),
  1,
  'a participant can read their own history'
);
select is(
  (select count(*)::integer from public.point_history('00000000-0000-0000-0000-00000000000c')),
  0,
  'a participant cannot read someone else''s history'
);

-- A deactivated admin -----------------------------------------------------------
reset role;
update public.participants set active = false where netid = 'zzlead';
select pg_temp.act_as('00000000-0000-0000-0000-00000000000a');
set local role authenticated;
select throws_ok(
  $$select public.add_point_entries(array['00000000-0000-0000-0000-00000000000b']::uuid[], 1, 'x', 'award')$$,
  'P0001', 'Only Catalyst leads can add points.',
  'a deactivated admin cannot add points'
);

-- Visitors ---------------------------------------------------------------------
reset role;
set local role anon;
select throws_ok(
  $$select role from public.participants$$,
  '42501', null,
  'visitors cannot read role'
);

reset role;
select * from finish();
rollback;

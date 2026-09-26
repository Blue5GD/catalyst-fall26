-- Corrections link to the entry they fix, and limits move into the database.
--
-- - add_point_entries takes an optional p_source_id: the entry being corrected.
--   An entry can be corrected once, and only for its own person.
-- - The 1–100 points and 200-character reason limits are checked here too, not
--   only on the page. A correction may undo up to the full original amount.
-- - created_by is the admin's NetID, matching what leads type in the table editor.
-- - point_history and recent_point_entries say whether each entry was already
--   corrected, and recent_point_entries whether the person is still active.

create index point_entries_source_id_idx on public.point_entries (source_id) where source_id is not null;

-- Adding entries -------------------------------------------------------------

drop function public.add_point_entries(uuid[], integer, text, text);

create function public.add_point_entries(
  p_participant_ids uuid[],
  p_amount integer,
  p_reason text,
  p_source_type text,
  p_source_id bigint default null
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  admin_netid text;
  original public.point_entries;
  max_points integer := 100;
  inserted integer;
begin
  if not private.is_admin() then
    raise exception 'Only Catalyst leads can add points.';
  end if;
  if p_participant_ids is null or cardinality(p_participant_ids) = 0 then
    raise exception 'Add at least one person.';
  end if;
  if cardinality(p_participant_ids) <> (select count(distinct x) from unnest(p_participant_ids) as x) then
    raise exception 'The same person is listed twice.';
  end if;
  if (select count(*) from public.participants p where p.id = any (p_participant_ids) and p.active)
     <> cardinality(p_participant_ids) then
    raise exception 'Some of these people aren''t active participants. Reload the page and pick again.';
  end if;
  if p_reason is null or length(trim(p_reason)) = 0 then
    raise exception 'Add a reason. It shows in each person''s points history.';
  end if;
  if length(trim(p_reason)) > 200 then
    raise exception 'Keep the reason to 200 characters or fewer.';
  end if;
  if p_source_type is null or p_source_type not in ('manual', 'award') then
    raise exception 'Kind must be award or correction.';
  end if;

  if p_source_id is not null then
    if p_source_type <> 'manual' or cardinality(p_participant_ids) <> 1 then
      raise exception 'A correction is for one person and one entry.';
    end if;
    -- Two admins correcting the same entry at once: the second one waits here,
    -- then sees the first correction below.
    perform pg_advisory_xact_lock(p_source_id);
    select * into original from public.point_entries e
      where e.id = p_source_id and e.participant_id = p_participant_ids[1];
    if not found then
      raise exception 'The entry being corrected isn''t in this person''s history.';
    end if;
    if exists (
      select 1 from public.point_entries e
      where e.source_type = 'manual' and e.source_id = p_source_id::text
    ) then
      raise exception 'That entry was already corrected.';
    end if;
    max_points := greatest(max_points, abs(original.amount));
  end if;

  if p_amount is null or p_amount = 0 or abs(p_amount) > max_points then
    raise exception 'Enter a whole number from 1 to %.', max_points;
  end if;

  select p.netid into admin_netid from public.participants p where p.id = auth.uid();

  insert into public.point_entries (participant_id, amount, reason, source_type, source_id, created_by)
  select x, p_amount, trim(p_reason), p_source_type, p_source_id::text, admin_netid
  from unnest(p_participant_ids) as x;

  get diagnostics inserted = row_count;
  return inserted;
end;
$$;

-- Reading history ---------------------------------------------------------------

drop function public.point_history(uuid);

create function public.point_history(p_participant uuid)
returns table (
  id bigint,
  amount integer,
  reason text,
  source_type text,
  created_by text,
  created_at timestamptz,
  corrected boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  select e.id, e.amount, e.reason, e.source_type, e.created_by, e.created_at,
    exists (select 1 from public.point_entries c where c.source_type = 'manual' and c.source_id = e.id::text)
  from public.point_entries e
  where e.participant_id = p_participant
    and (p_participant = auth.uid() or private.is_admin())
  order by e.created_at desc, e.id desc;
$$;

drop function public.recent_point_entries(integer);

create function public.recent_point_entries(p_limit integer default 50)
returns table (
  id bigint,
  participant_id uuid,
  netid text,
  name text,
  active boolean,
  amount integer,
  reason text,
  source_type text,
  created_by text,
  created_at timestamptz,
  corrected boolean
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not private.is_admin() then
    raise exception 'Only Catalyst leads can see all entries.';
  end if;
  return query
    select e.id, e.participant_id, p.netid, p.name, p.active, e.amount, e.reason, e.source_type,
      e.created_by, e.created_at,
      exists (select 1 from public.point_entries c where c.source_type = 'manual' and c.source_id = e.id::text)
    from public.point_entries e
    join public.participants p on p.id = e.participant_id
    order by e.created_at desc, e.id desc
    limit least(greatest(coalesce(p_limit, 50), 1), 200);
end;
$$;

-- Access -------------------------------------------------------------------

revoke execute on function public.add_point_entries(uuid[], integer, text, text, bigint) from public, anon;
revoke execute on function public.point_history(uuid) from public, anon;
revoke execute on function public.recent_point_entries(integer) from public, anon;

grant execute on function public.add_point_entries(uuid[], integer, text, text, bigint) to authenticated;
grant execute on function public.point_history(uuid) to authenticated;
grant execute on function public.recent_point_entries(integer) to authenticated;

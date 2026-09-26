-- Admin points: who's an admin, adding point entries from the site, and
-- reading reasons.
--
-- Reasons and who awarded what stay ungranted as columns (a column grant
-- would show every row's reason to everyone). These functions return them
-- only to the person they belong to, or to an admin.

-- Role ---------------------------------------------------------------------

-- Signed-in pages need to know who's an admin. Visitors still can't see roles.
grant select (role) on public.participants to authenticated;

create function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select p.role = 'admin' from public.participants p where p.id = auth.uid()),
    false
  );
$$;

revoke execute on function private.is_admin() from public, anon, authenticated;

-- Adding entries -------------------------------------------------------------

-- One entry per person, all or nothing. created_by is always the caller's
-- name, so the log can't claim someone else awarded the points.
create function public.add_point_entries(
  p_participant_ids uuid[],
  p_amount integer,
  p_reason text,
  p_source_type text
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  admin_name text;
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
  if p_amount is null or p_amount = 0 then
    raise exception 'Points can''t be 0.';
  end if;
  if p_reason is null or length(trim(p_reason)) = 0 then
    raise exception 'Add a reason. It shows in each person''s points history.';
  end if;
  if p_source_type is null or p_source_type not in ('manual', 'award') then
    raise exception 'Kind must be award or correction.';
  end if;

  select p.name into admin_name from public.participants p where p.id = auth.uid();

  insert into public.point_entries (participant_id, amount, reason, source_type, created_by)
  select x, p_amount, trim(p_reason), p_source_type, admin_name
  from unnest(p_participant_ids) as x;

  get diagnostics inserted = row_count;
  return inserted;
end;
$$;

-- Reading history ---------------------------------------------------------------

-- Your own entries, or anyone's if you're an admin. Anyone else gets no rows.
create function public.point_history(p_participant uuid)
returns table (
  id bigint,
  amount integer,
  reason text,
  source_type text,
  created_by text,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select e.id, e.amount, e.reason, e.source_type, e.created_by, e.created_at
  from public.point_entries e
  where e.participant_id = p_participant
    and (p_participant = auth.uid() or private.is_admin())
  order by e.created_at desc, e.id desc;
$$;

-- The latest entries across everyone, for the admin log.
create function public.recent_point_entries(p_limit integer default 50)
returns table (
  id bigint,
  participant_id uuid,
  netid text,
  name text,
  amount integer,
  reason text,
  source_type text,
  created_by text,
  created_at timestamptz
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
    select e.id, e.participant_id, p.netid, p.name, e.amount, e.reason, e.source_type, e.created_by, e.created_at
    from public.point_entries e
    join public.participants p on p.id = e.participant_id
    order by e.created_at desc, e.id desc
    limit least(greatest(coalesce(p_limit, 50), 1), 200);
end;
$$;

-- Access -------------------------------------------------------------------

revoke execute on function public.add_point_entries(uuid[], integer, text, text) from public, anon;
revoke execute on function public.point_history(uuid) from public, anon;
revoke execute on function public.recent_point_entries(integer) from public, anon;

grant execute on function public.add_point_entries(uuid[], integer, text, text) to authenticated;
grant execute on function public.point_history(uuid) to authenticated;
grant execute on function public.recent_point_entries(integer) to authenticated;

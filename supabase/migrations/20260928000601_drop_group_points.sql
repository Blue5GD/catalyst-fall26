-- Groups no longer have points of their own. Every point belongs to one
-- person, and a group that attends in full earns each member a bonus point
-- instead of a multiplier. The group page stopped showing sprint points, so
-- nothing calls this anymore.
drop function public.sprint_points(bigint);

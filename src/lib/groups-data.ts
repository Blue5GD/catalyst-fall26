// Reads sprints and groups from Supabase. RLS decides what comes back:
// drafts only for admins, published groups for anyone signed in.
import type { SupabaseClient } from '@supabase/supabase-js';
import { arrangeGroups, type Group, type Person, type Sprint } from './groups.ts';

export async function loadSprints(supabase: SupabaseClient): Promise<{ sprints: Sprint[]; error: boolean }> {
  const { data, error } = await supabase
    .from('sprints')
    .select('id, slug, number, title, starts_on, ends_on, groups_published_at')
    .order('number');
  if (error) console.error('Failed to load sprints:', error);
  return { sprints: (data ?? []) as Sprint[], error: Boolean(error) };
}

export async function loadGroups(
  supabase: SupabaseClient,
  sprintId: number,
): Promise<{ groups: Group[]; unassigned: Person[]; people: Person[]; error: boolean }> {
  const [groups, members, people] = await Promise.all([
    supabase.from('groups').select('id, number').eq('sprint_id', sprintId),
    supabase.from('group_members').select('group_id, participant_id').eq('sprint_id', sprintId),
    supabase.from('participants').select('id, netid, name, role').eq('active', true).order('name'),
  ]);
  for (const result of [groups, members, people]) {
    if (result.error) console.error('Failed to load groups:', result.error);
  }
  const everyone = (people.data ?? []) as Person[];
  return {
    ...arrangeGroups(groups.data ?? [], members.data ?? [], everyone),
    people: everyone,
    error: Boolean(groups.error || members.error || people.error),
  };
}

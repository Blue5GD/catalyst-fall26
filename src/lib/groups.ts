// Sprints and groups: picking the current sprint, the size preview and forms
// on /admin/groups, and arranging groups for display. Pure functions, so they
// run under `npm test` without Astro.

import { isUuid } from './points-form.ts';

export const MIN_GROUP_SIZE = 2;
export const MAX_GROUP_SIZE = 8;
export const DEFAULT_GROUP_SIZE = 4;

/** A row from the sprints table. Dates are 'YYYY-MM-DD'. */
export interface Sprint {
  id: number;
  slug: string;
  number: number;
  title: string;
  starts_on: string;
  ends_on: string;
  groups_published_at: string | null;
}

/** An active participant, as read from the participants table. */
export interface Person {
  id: string;
  netid: string;
  name: string;
  role: 'participant' | 'admin';
}

export interface Group {
  number: number;
  members: Person[];
}

export type GroupAction =
  | { action: 'generate'; size: number }
  | { action: 'move'; participantId: string; groupNumber: number | null }
  | { action: 'publish' };

const newHavenDate = new Intl.DateTimeFormat('en-CA', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  timeZone: 'America/New_York',
});

/** Today's date in New Haven, as 'YYYY-MM-DD'. */
export function todayInNewHaven(now = new Date()): string {
  return newHavenDate.format(now);
}

/** The sprint running on `today`, else the next one to start, else the last one. */
export function currentSprint<T extends Pick<Sprint, 'starts_on' | 'ends_on'>>(sprints: T[], today: string): T | null {
  const sorted = [...sprints].sort((a, b) => a.starts_on.localeCompare(b.starts_on));
  return (
    sorted.find((s) => s.starts_on <= today && today <= s.ends_on) ??
    sorted.find((s) => s.starts_on > today) ??
    sorted.at(-1) ??
    null
  );
}

/** The sizes generate_groups() makes: ceil(n / size) groups, within one of each other. */
export function groupSizes(n: number, size: number): number[] {
  if (n <= 0) return [];
  const count = Math.ceil(n / size);
  return Array.from({ length: count }, (_, i) => Math.floor(n / count) + (i < n % count ? 1 : 0));
}

const WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];
const word = (n: number) => WORDS[n] ?? String(n);

/** "27 participants → 7 groups: six of 4, one of 3." */
export function sizePreview(n: number, size: number): string {
  if (n <= 0) return 'No participants to group yet.';
  const sizes = groupSizes(n, size);
  const counts = new Map<number, number>();
  for (const s of sizes) counts.set(s, (counts.get(s) ?? 0) + 1);
  const people = `${n} ${n === 1 ? 'participant' : 'participants'}`;
  const groups = `${sizes.length} ${sizes.length === 1 ? 'group' : 'groups'}`;
  const parts = [...counts].map(([s, c]) => `${word(c)} of ${s}`);
  return `${people} → ${groups}: ${parts.join(', ')}.`;
}

function text(form: FormData, name: string): string {
  const value = form.get(name);
  return typeof value === 'string' ? value.trim() : '';
}

/** One POST from /admin/groups, or an error to show on the page. */
export function parseGroupAction(form: FormData): GroupAction | { error: string } {
  switch (text(form, 'action')) {
    case 'generate': {
      const raw = text(form, 'size');
      const size = /^\d{1,2}$/.test(raw) ? Number(raw) : NaN;
      if (!(size >= MIN_GROUP_SIZE && size <= MAX_GROUP_SIZE)) {
        return { error: `Group size must be from ${MIN_GROUP_SIZE} to ${MAX_GROUP_SIZE}.` };
      }
      return { action: 'generate', size };
    }
    case 'move': {
      const participantId = text(form, 'participant');
      if (!isUuid(participantId)) return { error: 'Pick a person to move. Reload the page and try again.' };
      const to = text(form, 'to');
      if (to === 'none') return { action: 'move', participantId: participantId.toLowerCase(), groupNumber: null };
      if (!/^[1-9]\d{0,3}$/.test(to)) return { error: 'Pick a group to move them to.' };
      return { action: 'move', participantId: participantId.toLowerCase(), groupNumber: Number(to) };
    }
    case 'publish':
      return { action: 'publish' };
    default:
      return { error: "That action isn't recognized. Reload the page and try again." };
  }
}

/**
 * Groups in number order with members by name, plus the active people in no
 * group. `people` is active accounts only, so inactive members drop out.
 */
export function arrangeGroups(
  groups: { id: number; number: number }[],
  memberships: { group_id: number; participant_id: string }[],
  people: Person[],
): { groups: Group[]; unassigned: Person[] } {
  const byId = new Map(people.map((p) => [p.id, p]));
  const groupIds = new Set(groups.map((g) => g.id));
  const placed = new Set(memberships.filter((m) => groupIds.has(m.group_id)).map((m) => m.participant_id));
  const arranged = [...groups]
    .sort((a, b) => a.number - b.number)
    .map((g) => ({
      number: g.number,
      members: memberships
        .filter((m) => m.group_id === g.id)
        .map((m) => byId.get(m.participant_id))
        .filter((p): p is Person => p !== undefined)
        .sort((a, b) => a.name.localeCompare(b.name)),
    }));
  return { groups: arranged, unassigned: people.filter((p) => !placed.has(p.id)) };
}

export function groupOf(groups: Group[], participantId: string): Group | null {
  return groups.find((g) => g.members.some((m) => m.id === participantId)) ?? null;
}

/** "01" */
export function sprintNumber(n: number): string {
  return String(n).padStart(2, '0');
}

// Sprint dates are calendar dates stored as midnight UTC, so format in UTC.
const monthDay = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });

/** "Sep 28 – Oct 11" */
export function dateRange(s: Pick<Sprint, 'starts_on' | 'ends_on'>): string {
  return `${monthDay.format(new Date(s.starts_on))} – ${monthDay.format(new Date(s.ends_on))}`;
}

/** The toast after a redirect from /admin/groups, from ?done=…. */
export function groupsDoneMessage(params: URLSearchParams, people: Person[]): string | null {
  switch (params.get('done')) {
    case 'generate': {
      const n = params.get('n') ?? '';
      if (!/^\d{1,3}$/.test(n)) return null;
      return `Made ${n} ${n === '1' ? 'group' : 'groups'}.`;
    }
    case 'publish':
      return 'Groups published. Participants can see them now.';
    case 'move': {
      const person = people.find((p) => p.id === params.get('who'));
      const to = params.get('to') ?? '';
      if (!person) return null;
      if (to === 'none') return `Removed ${person.name} from their group.`;
      return /^[1-9]\d{0,3}$/.test(to) ? `Moved ${person.name} to Group ${to}.` : null;
    }
    default:
      return null;
  }
}

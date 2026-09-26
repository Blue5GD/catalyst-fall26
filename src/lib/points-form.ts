// The admin "Award or remove points" form, plus formatting shared by /me and
// /admin. Pure functions, so they run under `npm test` without Astro.

export const MAX_POINTS = 100;
export const MAX_REASON = 200;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MINUS = '−';

/** A row from point_history(). */
export interface PointRow {
  id: number;
  amount: number;
  reason: string;
  source_type: string;
  created_by: string | null;
  created_at: string;
  /** A correction already points at this entry. */
  corrected: boolean;
}

/** A row from recent_point_entries(). */
export interface RecentRow extends PointRow {
  participant_id: string;
  netid: string;
  name: string;
  active: boolean;
}

export interface AwardFormValues {
  participantIds: string[];
  direction: 'award' | 'remove';
  points: string;
  kind: 'award' | 'correction';
  reason: string;
  /** The entry being corrected, as sent in the hidden field. Empty if none. */
  corrects: string;
}

/** What add_point_entries() needs. */
export interface AwardInput {
  participantIds: string[];
  amount: number;
  reason: string;
  sourceType: 'award' | 'manual';
  /** The entry this corrects, or null. */
  sourceId: number | null;
}

export type AwardErrors = Partial<Record<'people' | 'points' | 'reason', string>>;

export const EMPTY_VALUES: AwardFormValues = {
  participantIds: [],
  direction: 'award',
  points: '',
  kind: 'award',
  reason: '',
  corrects: '',
};

export function isUuid(value: string | null | undefined): value is string {
  return typeof value === 'string' && UUID.test(value);
}

function text(form: FormData, name: string): string {
  const value = form.get(name);
  return typeof value === 'string' ? value.trim() : '';
}

/**
 * maxPoints is MAX_POINTS, or more when correcting a bigger entry (the page
 * looks the entry up first).
 */
export function parseAwardForm(form: FormData, maxPoints = MAX_POINTS): {
  values: AwardFormValues;
  errors: AwardErrors;
  input: AwardInput | null;
} {
  const ids = form
    .getAll('participant')
    .filter((v): v is string => isUuid(typeof v === 'string' ? v : null))
    .map((v) => v.toLowerCase());

  const values: AwardFormValues = {
    participantIds: [...new Set(ids)],
    direction: text(form, 'direction') === 'remove' ? 'remove' : 'award',
    points: text(form, 'points'),
    kind: text(form, 'kind') === 'correction' ? 'correction' : 'award',
    reason: text(form, 'reason').replace(/\s+/g, ' '),
    corrects: String(parseCorrectId(text(form, 'corrects')) ?? ''),
  };

  const errors: AwardErrors = {};
  if (values.participantIds.length === 0) errors.people = 'Add at least one person.';

  const points = /^\d{1,6}$/.test(values.points) ? Number(values.points) : NaN;
  if (!(points >= 1 && points <= maxPoints)) {
    errors.points = `Enter a whole number from 1 to ${maxPoints}.`;
  }

  if (!values.reason) {
    errors.reason = "Add a reason. It shows in each person's points history.";
  } else if (values.reason.length > MAX_REASON) {
    errors.reason = `Keep the reason to ${MAX_REASON} characters or fewer. It has ${values.reason.length}.`;
  }

  const input: AwardInput | null =
    Object.keys(errors).length === 0
      ? {
          participantIds: values.participantIds,
          amount: values.direction === 'remove' ? -points : points,
          reason: values.reason,
          sourceType: values.kind === 'correction' ? 'manual' : 'award',
          // Only a correction links to an entry. Switching Kind to Award drops it.
          sourceId: values.kind === 'correction' && values.corrects ? Number(values.corrects) : null,
        }
      : null;

  return { values, errors, input };
}

/** The points limit when correcting this entry: the full amount, even over MAX_POINTS. */
export function correctionMax(entry: Pick<PointRow, 'amount'> | null | undefined): number {
  return entry ? Math.max(MAX_POINTS, Math.abs(entry.amount)) : MAX_POINTS;
}

/** The entry id from ?correct= or the form, or null if it isn't a plausible id. */
export function parseCorrectId(value: string | null): number | null {
  if (!value || !/^[1-9]\d{0,14}$/.test(value)) return null;
  return Number(value);
}

/** Form values that undo an entry: same person and points, opposite direction. */
export function correctionValues(
  participantId: string,
  entry: Pick<PointRow, 'id' | 'amount' | 'reason'>,
): AwardFormValues {
  return {
    participantIds: [participantId],
    direction: entry.amount > 0 ? 'remove' : 'award',
    points: String(Math.abs(entry.amount)),
    kind: 'correction',
    reason: `Correction: ${entry.reason}`.slice(0, MAX_REASON),
    corrects: String(entry.id),
  };
}

export function formatPoints(amount: number): string {
  return amount < 0 ? `${MINUS}${Math.abs(amount)}` : `+${amount}`;
}

const dateOnly = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  timeZone: 'America/New_York',
});
const dateTime = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
  timeZone: 'America/New_York',
});

/** "Sep 30", or "Sep 30, 9:14 PM" with time. Always in New Haven time. */
export function formatDate(iso: string, withTime = false): string {
  return (withTime ? dateTime : dateOnly).format(new Date(iso));
}

/** "+3 to Maya Chen and Sam Okafor". Empty when there's nothing to say yet. */
export function peopleSummary(names: string[], amount: number | null): string {
  if (names.length === 0 || amount === null) return '';
  let who: string;
  if (names.length === 1) who = names[0];
  else if (names.length <= 3) who = `${names.slice(0, -1).join(', ')} and ${names.at(-1)}`;
  else who = `${names.slice(0, 2).join(', ')} and ${names.length - 2} others`;
  return `${formatPoints(amount)} to ${who}`;
}

/** The rank to show on /me. Before any points everyone ties for 1st, which says nothing. */
export function shownRank(earned: number, rank: number | null): number | null {
  return earned > 0 ? rank : null;
}

export function buttonLabel(count: number): string {
  if (count === 0) return 'Add entries';
  return count === 1 ? 'Add 1 entry' : `Add ${count} entries`;
}

/** The toast after a successful submit, from ?added=<n>&amount=<signed>. */
export function addedMessage(params: URLSearchParams): string | null {
  const added = params.get('added') ?? '';
  const amount = params.get('amount') ?? '';
  if (!/^\d{1,3}$/.test(added) || !/^-?\d{1,6}$/.test(amount)) return null;
  const n = Number(added);
  return `Added ${formatPoints(Number(amount))} to ${n} ${n === 1 ? 'person' : 'people'}.`;
}

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  addedMessage,
  buttonLabel,
  correctionMax,
  correctionValues,
  formatDate,
  formatPoints,
  groupChoiceLabel,
  isUuid,
  matchingGroup,
  parseAwardForm,
  parseCorrectId,
  peopleSummary,
  shownRank,
} from './points-form.ts';

const A = '00000000-0000-0000-0000-00000000000a';
const B = '00000000-0000-0000-0000-00000000000b';

function form(fields: Record<string, string | string[]>): FormData {
  const f = new FormData();
  for (const [k, v] of Object.entries(fields)) for (const x of [v].flat()) f.append(k, x);
  return f;
}

test('parseAwardForm builds an award for several people', () => {
  const { input, errors } = parseAwardForm(
    form({ participant: [A, B], direction: 'award', points: ' 7 ', kind: 'award', reason: ' Won  the challenge ' }),
  );
  assert.deepEqual(errors, {});
  assert.deepEqual(input, {
    participantIds: [A, B],
    amount: 7,
    reason: 'Won the challenge',
    sourceType: 'award',
    sourceId: null,
  });
});

test('parseAwardForm turns remove + correction into a negative manual entry', () => {
  const { input } = parseAwardForm(
    form({ participant: A, direction: 'remove', points: '2', kind: 'correction', reason: 'Counted twice' }),
  );
  assert.deepEqual(input, { participantIds: [A], amount: -2, reason: 'Counted twice', sourceType: 'manual', sourceId: null });
});

test('parseAwardForm links a correction to the entry it fixes', () => {
  const { input } = parseAwardForm(
    form({ participant: A, direction: 'remove', points: '2', kind: 'correction', reason: 'x', corrects: '42' }),
  );
  assert.equal(input?.sourceId, 42);
});

test('parseAwardForm drops the link when Kind is switched to Award', () => {
  const { input } = parseAwardForm(form({ participant: A, points: '2', kind: 'award', reason: 'x', corrects: '42' }));
  assert.equal(input?.sourceId, null);
});

test('parseAwardForm ignores a malformed corrects value', () => {
  const { values } = parseAwardForm(form({ participant: A, points: '2', kind: 'correction', reason: 'x', corrects: 'abc' }));
  assert.equal(values.corrects, '');
});

test('parseAwardForm accepts a bigger correction when allowed', () => {
  const f = form({ participant: A, direction: 'remove', points: '250', kind: 'correction', reason: 'x', corrects: '7' });
  assert.equal(parseAwardForm(f).errors.points, 'Enter a whole number from 1 to 100.');
  assert.deepEqual(parseAwardForm(f, 250).errors, {});
});

test('correctionMax allows the full original amount', () => {
  assert.equal(correctionMax(null), 100);
  assert.equal(correctionMax({ amount: 5 }), 100);
  assert.equal(correctionMax({ amount: -250 }), 250);
});

test('parseAwardForm drops duplicate and malformed ids', () => {
  const { values } = parseAwardForm(form({ participant: [A, A.toUpperCase(), 'nope', B], points: '1', reason: 'x' }));
  assert.deepEqual(values.participantIds, [A, B]);
});

test('parseAwardForm requires people, a valid number and a reason', () => {
  const { input, errors } = parseAwardForm(form({ points: '', reason: '   ' }));
  assert.equal(input, null);
  assert.equal(errors.people, 'Add at least one person.');
  assert.equal(errors.points, 'Enter a whole number from 1 to 100.');
  assert.equal(errors.reason, "Add a reason. It shows in each person's points history.");
});

for (const bad of ['0', '-3', '1.5', '101', 'ten', '1e2']) {
  test(`parseAwardForm rejects points "${bad}"`, () => {
    const { errors } = parseAwardForm(form({ participant: A, points: bad, reason: 'x' }));
    assert.equal(errors.points, 'Enter a whole number from 1 to 100.');
  });
}

test('parseAwardForm rejects a reason over 200 characters', () => {
  const { errors } = parseAwardForm(form({ participant: A, points: '1', reason: 'a'.repeat(201) }));
  assert.equal(errors.reason, 'Keep the reason to 200 characters or fewer. It has 201.');
});

test('parseAwardForm keeps entered values for re-rendering', () => {
  const { values } = parseAwardForm(form({ participant: A, direction: 'remove', points: 'x', kind: 'correction', reason: 'r' }));
  assert.deepEqual(values, {
    participantIds: [A],
    direction: 'remove',
    points: 'x',
    kind: 'correction',
    reason: 'r',
    corrects: '',
  });
});

test('parseCorrectId accepts positive integers only', () => {
  assert.equal(parseCorrectId('42'), 42);
  for (const bad of [null, '', 'abc', '-1', '0', '1.5', '1234567890123456']) assert.equal(parseCorrectId(bad), null);
});

test('isUuid', () => {
  assert.equal(isUuid(A), true);
  assert.equal(isUuid('abc'), false);
  assert.equal(isUuid(null), false);
});

test('correctionValues reverses the entry', () => {
  assert.deepEqual(correctionValues(A, { id: 9, amount: 3, reason: 'Workshop 1' }), {
    participantIds: [A],
    direction: 'remove',
    points: '3',
    kind: 'correction',
    reason: 'Correction: Workshop 1',
    corrects: '9',
  });
  assert.equal(correctionValues(A, { id: 9, amount: -2, reason: 'x' }).direction, 'award');
  assert.equal(correctionValues(A, { id: 9, amount: 1, reason: 'a'.repeat(200) }).reason.length, 200);
});

test('formatPoints uses a real minus sign', () => {
  assert.equal(formatPoints(3), '+3');
  assert.equal(formatPoints(-2), '−2');
});

test('formatDate uses New Haven time', () => {
  // 02:30 UTC on Oct 1 is still Sep 30 in New Haven.
  assert.equal(formatDate('2026-10-01T02:30:00Z'), 'Sep 30');
  assert.equal(formatDate('2026-10-01T02:30:00Z', true).replace(/\s/g, ' '), 'Sep 30, 10:30 PM');
});

test('peopleSummary', () => {
  assert.equal(peopleSummary([], 3), '');
  assert.equal(peopleSummary(['Maya Chen'], null), '');
  assert.equal(peopleSummary(['Maya Chen'], 3), '+3 to Maya Chen');
  assert.equal(peopleSummary(['Maya Chen', 'Sam Okafor'], -2), '−2 to Maya Chen and Sam Okafor');
  assert.equal(peopleSummary(['A', 'B', 'C'], 1), '+1 to A, B and C');
  assert.equal(peopleSummary(['A', 'B', 'C', 'D', 'E'], 1), '+1 to A, B and 3 others');
});

test('peopleSummary names the group when the picks are exactly one group', () => {
  assert.equal(peopleSummary(['A', 'B', 'C'], 2, 4), '+2 to Group 4 (3 people)');
  assert.equal(peopleSummary(['A'], -1, 7), '−1 to Group 7 (1 person)');
  assert.equal(peopleSummary(['A'], null, 7), '');
});

const C = '00000000-0000-0000-0000-00000000000c';
const groups = [
  { number: 4, memberIds: [A, B], names: ['Ada', 'Ben'] },
  { number: 5, memberIds: [C], names: ['Cy'] },
];

test('groupChoiceLabel lists the members after the number', () => {
  assert.equal(groupChoiceLabel(groups[0]), 'Group 4 · Ada, Ben');
});

test('matchingGroup finds the group whose members are exactly the picks', () => {
  assert.equal(matchingGroup([B, A], groups), 4);
  assert.equal(matchingGroup([C], groups), 5);
  // A missing or extra person means it's no longer "the group".
  assert.equal(matchingGroup([A], groups), null);
  assert.equal(matchingGroup([A, B, C], groups), null);
  assert.equal(matchingGroup([], [{ number: 9, memberIds: [], names: [] }]), null);
});

test('buttonLabel', () => {
  assert.equal(buttonLabel(0), 'Add entries');
  assert.equal(buttonLabel(1), 'Add 1 entry');
  assert.equal(buttonLabel(4), 'Add 4 entries');
});

test('addedMessage reads the redirect query', () => {
  assert.equal(addedMessage(new URLSearchParams('added=2&amount=3')), 'Added +3 to 2 people.');
  assert.equal(addedMessage(new URLSearchParams('added=1&amount=-2')), 'Added −2 to 1 person.');
  assert.equal(addedMessage(new URLSearchParams('added=1&amount=-250')), 'Added −250 to 1 person.');
  assert.equal(addedMessage(new URLSearchParams('added=abc&amount=3')), null);
  assert.equal(addedMessage(new URLSearchParams('')), null);
});

test('shownRank hides the rank until someone has points', () => {
  assert.equal(shownRank(0, 1), null);
  assert.equal(shownRank(5, 3), 3);
  assert.equal(shownRank(5, null), null);
});

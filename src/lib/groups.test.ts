import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  arrangeGroups,
  currentSprint,
  dateRange,
  groupOf,
  groupSizes,
  groupsDoneMessage,
  parseGroupAction,
  sizePreview,
  sprintNumber,
  todayInNewHaven,
  type Person,
} from './groups.ts';

const A = '00000000-0000-0000-0000-00000000000a';
const B = '00000000-0000-0000-0000-00000000000b';
const C = '00000000-0000-0000-0000-00000000000c';

function form(fields: Record<string, string>): FormData {
  const f = new FormData();
  for (const [k, v] of Object.entries(fields)) f.append(k, v);
  return f;
}

const sprints = [
  { slug: 'project-2', starts_on: '2026-10-12', ends_on: '2026-10-25' },
  { slug: 'project-1', starts_on: '2026-09-28', ends_on: '2026-10-11' },
  { slug: 'project-3', starts_on: '2026-11-02', ends_on: '2026-11-15' },
];

test('currentSprint picks the sprint running today, including its first and last day', () => {
  assert.equal(currentSprint(sprints, '2026-09-28')?.slug, 'project-1');
  assert.equal(currentSprint(sprints, '2026-10-11')?.slug, 'project-1');
  assert.equal(currentSprint(sprints, '2026-10-12')?.slug, 'project-2');
});

test('currentSprint picks the next sprint before the first and in a gap', () => {
  assert.equal(currentSprint(sprints, '2026-09-27')?.slug, 'project-1');
  assert.equal(currentSprint(sprints, '2026-10-28')?.slug, 'project-3');
});

test('currentSprint picks the last sprint after the program ends, and null with none', () => {
  assert.equal(currentSprint(sprints, '2027-01-01')?.slug, 'project-3');
  assert.equal(currentSprint([], '2026-09-27'), null);
});

test('todayInNewHaven uses New Haven time, not UTC', () => {
  // 02:00 UTC on Sep 28 is still Sep 27 in New Haven.
  assert.equal(todayInNewHaven(new Date('2026-09-28T02:00:00Z')), '2026-09-27');
});

test('groupSizes keeps sizes within one of each other', () => {
  assert.deepEqual(groupSizes(10, 4), [4, 3, 3]);
  assert.deepEqual(groupSizes(8, 4), [4, 4]);
  assert.deepEqual(groupSizes(3, 4), [3]);
  assert.deepEqual(groupSizes(0, 4), []);
});

test('sizePreview describes the groups the shuffle will make', () => {
  assert.equal(sizePreview(27, 4), '27 participants → 7 groups: six of 4, one of 3.');
  assert.equal(sizePreview(8, 4), '8 participants → 2 groups: two of 4.');
  assert.equal(sizePreview(1, 4), '1 participant → 1 group: one of 1.');
  assert.equal(sizePreview(0, 4), 'No participants to group yet.');
});

test('parseGroupAction reads generate with a size from 2 to 8', () => {
  assert.deepEqual(parseGroupAction(form({ action: 'generate', size: ' 3 ' })), { action: 'generate', size: 3 });
  assert.deepEqual(parseGroupAction(form({ action: 'generate', size: '1' })), { error: 'Group size must be from 2 to 8.' });
  assert.deepEqual(parseGroupAction(form({ action: 'generate', size: '9' })), { error: 'Group size must be from 2 to 8.' });
  assert.deepEqual(parseGroupAction(form({ action: 'generate', size: 'four' })), { error: 'Group size must be from 2 to 8.' });
});

test('parseGroupAction reads move to a group or to no group', () => {
  assert.deepEqual(parseGroupAction(form({ action: 'move', participant: A.toUpperCase(), to: '3' })), {
    action: 'move',
    participantId: A,
    groupNumber: 3,
  });
  assert.deepEqual(parseGroupAction(form({ action: 'move', participant: A, to: 'none' })), {
    action: 'move',
    participantId: A,
    groupNumber: null,
  });
});

test('parseGroupAction rejects a bad person, a bad group and unknown actions', () => {
  assert.deepEqual(parseGroupAction(form({ action: 'move', participant: 'nope', to: '1' })), {
    error: 'Pick a person to move. Reload the page and try again.',
  });
  assert.deepEqual(parseGroupAction(form({ action: 'move', participant: A, to: '0' })), {
    error: 'Pick a group to move them to.',
  });
  assert.deepEqual(parseGroupAction(form({ action: 'publish' })), { action: 'publish' });
  assert.deepEqual(parseGroupAction(form({ action: 'delete' })), {
    error: "That action isn't recognized. Reload the page and try again.",
  });
});

const people: Person[] = [
  { id: A, netid: 'aa1', name: 'Ada', role: 'participant' },
  { id: B, netid: 'bb2', name: 'Ben', role: 'participant' },
  { id: C, netid: 'cc3', name: 'Cy', role: 'admin' },
];

test('arrangeGroups orders groups by number and members by name', () => {
  const { groups, unassigned } = arrangeGroups(
    [{ id: 20, number: 2 }, { id: 10, number: 1 }],
    [
      { group_id: 10, participant_id: B },
      { group_id: 10, participant_id: A },
      { group_id: 20, participant_id: C },
    ],
    people,
  );
  assert.deepEqual(groups.map((g) => [g.number, g.members.map((m) => m.name)]), [
    [1, ['Ada', 'Ben']],
    [2, ['Cy']],
  ]);
  assert.deepEqual(unassigned, []);
});

test('arrangeGroups lists a late sign-up as unassigned', () => {
  const { unassigned } = arrangeGroups([{ id: 10, number: 1 }], [{ group_id: 10, participant_id: A }], people);
  assert.deepEqual(unassigned.map((p) => p.name), ['Ben', 'Cy']);
});

test('arrangeGroups drops members who are no longer active', () => {
  const gone = '00000000-0000-0000-0000-00000000000d';
  const { groups } = arrangeGroups(
    [{ id: 10, number: 1 }, { id: 20, number: 2 }],
    [
      { group_id: 10, participant_id: A },
      { group_id: 10, participant_id: gone },
      { group_id: 20, participant_id: gone },
    ],
    people,
  );
  assert.deepEqual(groups.map((g) => g.members.map((m) => m.name)), [['Ada'], []]);
});

test('groupOf finds the group someone is in', () => {
  const { groups } = arrangeGroups([{ id: 10, number: 4 }], [{ group_id: 10, participant_id: A }], people);
  assert.equal(groupOf(groups, A)?.number, 4);
  assert.equal(groupOf(groups, B), null);
});

test('sprintNumber and dateRange format the sprint label', () => {
  assert.equal(sprintNumber(1), '01');
  assert.equal(dateRange({ starts_on: '2026-09-28', ends_on: '2026-10-11' }), 'Sep 28 – Oct 11');
});

test('groupsDoneMessage confirms each action from the redirect URL', () => {
  const msg = (q: string) => groupsDoneMessage(new URLSearchParams(q), people);
  assert.equal(msg('done=generate&n=7'), 'Made 7 groups.');
  assert.equal(msg('done=generate&n=1'), 'Made 1 group.');
  assert.equal(msg('done=publish'), 'Groups published. Participants can see them now.');
  assert.equal(msg(`done=move&who=${A}&to=3`), 'Moved Ada to Group 3.');
  assert.equal(msg(`done=move&who=${A}&to=none`), 'Removed Ada from their group.');
  assert.equal(msg('done=move&who=nobody&to=3'), null);
  assert.equal(msg('done=generate&n=lots'), null);
  assert.equal(msg(''), null);
});

// Compares member profiles in members/ with accounts in Supabase, matched by
// NetID. Lists sign-ups with no profile, profiles with no sign-up, likely
// NetID typos, and people whose two names differ.
// Run it with: npm run check:matches
//
// It only reads what the public site can read, so the publishable key in
// .env.local is enough. Accounts marked inactive are hidden from it.

import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';

const DIR = 'members';

const url = process.env.PUBLIC_SUPABASE_URL;
const key = process.env.PUBLIC_SUPABASE_PUBLISHABLE_KEY;
if (!url || !key) {
  console.error('Missing Supabase keys. Run: cp .env.example .env.local');
  process.exit(1);
}

// Profiles in the repo, by NetID.
const profiles = new Map();
for (const file of await readdir(DIR)) {
  if (path.extname(file) !== '.json' || file.startsWith('_')) continue;
  const netid = path.basename(file, '.json');
  try {
    profiles.set(netid, JSON.parse(await readFile(path.join(DIR, file), 'utf8')).name ?? '');
  } catch {
    profiles.set(netid, '');
  }
}

// Accounts in Supabase, by NetID.
const { data, error } = await createClient(url, key).from('participants').select('netid, name');
if (error) {
  console.error(`Couldn't read participants from Supabase: ${error.message}`);
  process.exit(1);
}
const accounts = new Map(data.map((p) => [p.netid, p.name]));

// Number of single-letter edits between two strings.
function distance(a, b) {
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const row = [i];
    for (let j = 1; j <= b.length; j++) {
      row[j] = Math.min(prev[j] + 1, row[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = row;
  }
  return prev[b.length];
}

const noProfile = [...accounts.keys()].filter((n) => !profiles.has(n)).sort();
const noAccount = [...profiles.keys()].filter((n) => !accounts.has(n)).sort();
const normalize = (s) => s.trim().replace(/\s+/g, ' ').toLowerCase();

// NetIDs are short, so two edits apart is common between different people.
// Flag one edit apart, or two apart only when the names also match.
const likelySame = (a, p) => {
  const d = distance(a, p);
  return d === 1 || (d === 2 && normalize(accounts.get(a)) === normalize(profiles.get(p)));
};
const typos = noProfile.flatMap((a) =>
  noAccount.filter((p) => likelySame(a, p)).map((p) => `${a} signed up, ${p} has a profile. Same person?`),
);
const nameDiffs = [...accounts]
  .filter(([n, name]) => profiles.has(n) && normalize(name) !== normalize(profiles.get(n)))
  .map(([n, name]) => `${n}: signed up as "${name}", profile says "${profiles.get(n)}"`);

const matched = [...accounts.keys()].filter((n) => profiles.has(n)).length;
console.log(`${matched} matched · ${accounts.size} accounts · ${profiles.size} profiles\n`);

function section(title, lines) {
  if (lines.length === 0) return;
  console.log(`${title} (${lines.length})`);
  for (const line of lines) console.log(`  ${line}`);
  console.log();
}

section('Likely NetID typos', typos);
section('Signed up, no profile yet', noProfile.map((n) => `${n}  ${accounts.get(n)}`));
section('Profile, no sign-up yet', noAccount.map((n) => `${n}  ${profiles.get(n)}`));
section('Names differ', nameDiffs);

if (typos.length + noProfile.length + noAccount.length + nameDiffs.length === 0) {
  console.log('✓ Every account has a profile and every profile has an account.');
}

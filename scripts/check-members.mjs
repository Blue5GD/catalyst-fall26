// Checks every profile in members/ so reviewers can merge first PRs quickly.
// Run it yourself with: npm run check:members
//
// The rules here match src/content.config.ts. If you change one, change both.

import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const DIR = 'members';
const NETID = /^[a-z][a-z0-9]{1,11}$/;
const GITHUB = /^[A-Za-z0-9-]{1,39}$/;
const PHOTO_EXTS = ['.jpg', '.jpeg', '.png'];
const MAX_PHOTO_BYTES = 2 * 1024 * 1024;
const MIN_PHOTO_SIZE = 400;
const ALLOWED_FIELDS = ['name', 'bio', 'github', 'website', 'role'];
const ROLES = ['Lead', 'Instructor'];
const IGNORED = new Set(['_template.json', 'README.md', '.gitkeep']);
// Values from _template.json. A profile still using them wasn't filled in.
const PLACEHOLDERS = {
  name: 'Your Name',
  bio: 'One line about you, 120 characters max.',
  github: 'your-github-username',
  website: 'https://your-site.com',
};

const errors = [];
const fail = (file, message) => errors.push(`${DIR}/${file}: ${message}`);

const files = (await readdir(DIR)).filter((f) => !IGNORED.has(f) && !f.startsWith('.'));
const profiles = new Map();
const photos = new Map();
const githubOwners = new Map();

for (const file of files) {
  const ext = path.extname(file).toLowerCase();
  const netid = path.basename(file, path.extname(file));

  if (ext !== path.extname(file)) {
    fail(file, `use a lowercase extension, like "${netid}${ext}". The site can't load "${path.extname(file)}".`);
    continue;
  }

  if (ext !== '.json' && !PHOTO_EXTS.includes(ext)) {
    fail(file, `only .json, .jpg and .png files belong here. Rename or remove this file.`);
    continue;
  }
  if (!NETID.test(netid)) {
    fail(file, `the file name must be your NetID in lowercase, like "ab123${ext}".`);
    continue;
  }
  if (ext === '.json') profiles.set(netid, file);
  else if (photos.has(netid)) fail(file, `there is already a photo for ${netid} (${photos.get(netid)}). Keep only one.`);
  else photos.set(netid, file);
}

for (const [netid, file] of profiles) {
  const text = await readFile(path.join(DIR, file), 'utf8');
  if (text.startsWith('\uFEFF')) {
    fail(file, 'the file starts with an invisible "BOM" character. In Cursor (or VS Code), click "UTF-8 with BOM" in the bottom bar, choose "Save with Encoding", then "UTF-8".');
    continue;
  }
  let data;
  try {
    data = JSON.parse(text);
  } catch (err) {
    fail(file, `this isn't valid JSON (${err.message}). Check for a missing comma or quote.`);
    continue;
  }
  if (typeof data !== 'object' || data === null || Array.isArray(data)) {
    fail(file, 'the file must contain one object in { curly braces }, like _template.json.');
    continue;
  }

  for (const key of Object.keys(data)) {
    if (!ALLOWED_FIELDS.includes(key)) fail(file, `unknown field "${key}". Allowed fields: ${ALLOWED_FIELDS.join(', ')}.`);
  }
  if (typeof data.name !== 'string' || !data.name.trim()) fail(file, '"name" is required.');
  else if (data.name.length > 60) fail(file, '"name" must be 60 characters or fewer.');
  else if (/[\r\n]/.test(data.name)) fail(file, '"name" must be on one line. Remove the line break.');
  if (typeof data.bio !== 'string' || !data.bio.trim()) fail(file, '"bio" is required. One line about you.');
  else if (data.bio.length > 120) fail(file, `"bio" must be 120 characters or fewer (yours is ${data.bio.length}).`);
  else if (/[\r\n]/.test(data.bio)) fail(file, '"bio" must be one line. Remove the line break (\\n).');

  for (const [key, placeholder] of Object.entries(PLACEHOLDERS)) {
    if (data[key] === placeholder) {
      const fix = key === 'name' || key === 'bio' ? 'Replace it with your own.' : 'Replace it with your own, or delete the line.';
      fail(file, `"${key}" still has the example from the template. ${fix}`);
    }
  }
  if (data.github !== undefined && (typeof data.github !== 'string' || !GITHUB.test(data.github))) {
    fail(file, '"github" should be just your username, like "octocat", not a full link.');
  } else if (typeof data.github === 'string') {
    const key = data.github.toLowerCase();
    if (githubOwners.has(key)) {
      fail(file, `"github" is "${data.github}", the same as members/${githubOwners.get(key)}.json. Use your own GitHub username.`);
    } else {
      githubOwners.set(key, netid);
    }
  }
  if (data.website !== undefined) {
    let ok = false;
    try {
      ok = ['https:', 'http:'].includes(new URL(data.website).protocol);
    } catch {}
    if (!ok) fail(file, '"website" must be a full link starting with https://');
  }

  if (data.role !== undefined && !ROLES.includes(data.role)) {
    fail(file, `"role" must be one of: ${ROLES.join(', ')}. Participants should leave it out.`);
  }

  if (!photos.has(netid)) fail(file, `add your photo as members/${netid}.jpg (or .png).`);
}

for (const [netid, file] of photos) {
  if (!profiles.has(netid)) {
    fail(file, `there's no members/${netid}.json for this photo. Add your profile file too.`);
    continue;
  }
  const full = path.join(DIR, file);
  const { size } = await stat(full);
  if (size > MAX_PHOTO_BYTES) {
    fail(file, `the photo is ${(size / 1024 / 1024).toFixed(1)} MB. Keep it under 2 MB; resizing to about 800 × 800 px is plenty.`);
  }
  try {
    const meta = await sharp(full).metadata();
    const expected = path.extname(file).toLowerCase() === '.png' ? 'png' : 'jpeg';
    if (meta.format !== expected) {
      fail(file, `this file is really a ${meta.format ?? 'unknown'} image. Export it as a real ${expected.toUpperCase()} (renaming isn't enough).`);
    } else if (Math.min(meta.width, meta.height) < MIN_PHOTO_SIZE) {
      fail(file, `the photo is ${meta.width} × ${meta.height} px. It needs to be at least ${MIN_PHOTO_SIZE} × ${MIN_PHOTO_SIZE} px.`);
    }
  } catch {
    fail(file, "this file couldn't be opened as an image. Export it again as a JPEG or PNG.");
  }
}

if (errors.length > 0) {
  console.error(`Found ${errors.length} problem${errors.length === 1 ? '' : 's'} with member profiles:\n`);
  for (const e of errors) console.error(`  ✗ ${e}`);
  console.error('\nSee CONTRIBUTING.md for the full steps.');
  process.exit(1);
}

console.log(`✓ ${profiles.size === 1 ? '1 member profile looks' : `${profiles.size} member profiles look`} good.`);

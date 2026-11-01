import type { ImageMetadata } from 'astro';
import { getCollection } from 'astro:content';

// Lowercase extensions only; scripts/check-members.mjs rejects .JPG and friends.
const photos = import.meta.glob<{ default: ImageMetadata }>('/members/*.{jpg,jpeg,png}', {
  eager: true,
});

function photoFor(netid: string): ImageMetadata | undefined {
  const match = Object.entries(photos).find(([path]) =>
    path.replace(/^.*\//, '').replace(/\.[^.]+$/, '') === netid,
  );
  return match?.[1].default;
}

export interface Member {
  netid: string;
  name: string;
  bio: string;
  github?: string;
  website?: string;
  agent?: string;
  role?: 'Lead' | 'Instructor';
  photo?: ImageMetadata;
}

// Leads first, then instructors, then everyone else.
const ROLE_ORDER = { Lead: 0, Instructor: 1 } as const;
const roleRank = (m: Member) => (m.role ? ROLE_ORDER[m.role] : 2);

export async function getMembers(): Promise<Member[]> {
  const entries = await getCollection('members');
  return entries
    .map((entry) => ({ netid: entry.id, ...entry.data, photo: photoFor(entry.id) }))
    .sort((a, b) => roleRank(a) - roleRank(b) || a.name.localeCompare(b.name));
}

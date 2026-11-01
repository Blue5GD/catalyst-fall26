import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

// Values from members/_template.json. A profile still using them wasn't filled in.
const notPlaceholder = (placeholder: string) => [
  (value: string) => value !== placeholder,
  { error: 'Still the example from the template. Replace it with your own.' },
] as const;
const oneLine = [(value: string) => !/[\r\n]/.test(value), { error: 'Must be one line.' }] as const;
const notBlank = [(value: string) => value.trim().length > 0, { error: 'Required.' }] as const;

// One file per participant: members/<netid>.json, with the photo next to it
// as members/<netid>.jpg (or .png). Files starting with "_" are templates.
// scripts/check-members.mjs also checks things a schema can't: photos, BOMs
// and duplicate GitHub usernames.
const members = defineCollection({
  loader: glob({ pattern: ['*.json', '!_*.json'], base: './members' }),
  schema: z.object({
    name: z.string().max(60).refine(...notBlank).refine(...oneLine).refine(...notPlaceholder('Your Name')),
    bio: z
      .string()
      .max(120)
      .refine(...notBlank)
      .refine(...oneLine)
      .refine(...notPlaceholder('One line about you, 120 characters max.')),
    github: z
      .string()
      .regex(/^[A-Za-z0-9-]{1,39}$/)
      .refine(...notPlaceholder('your-github-username'))
      .optional(),
    // Only web links. A javascript: link here would run on the members page.
    website: z
      .url({ protocol: /^https?$/, error: 'Must be a full link starting with https://' })
      .refine(...notPlaceholder('https://your-site.com'))
      .optional(),
    // A link to the participant's Project 2 AI agent.
    agent: z
      .url({ protocol: /^https?$/, error: 'Must be a full link starting with https://' })
      .refine(...notPlaceholder('https://your-agent.com'))
      .optional(),
    // Set by leads only. Participants leave it out.
    role: z.enum(['Lead', 'Instructor']).optional(),
  }),
});

// One Markdown file per update in happening-now/, shown on the home page,
// newest first. Set pin: true to keep an update above the rest. Leads write
// these. Files starting with "_" are skipped, and this-week.md has its own spot.
const now = defineCollection({
  loader: glob({ pattern: ['*.md', '!_*.md', '!this-week.md'], base: './happening-now' }),
  schema: z.object({
    title: z.string().refine(...notBlank).refine(...oneLine),
    date: z.coerce.date(),
    pin: z.boolean().optional(),
  }),
});

// happening-now/this-week.md: a short list beside the updates, like due
// dates and office hours. No frontmatter needed. Delete it to hide the list.
const week = defineCollection({
  loader: glob({ pattern: 'this-week.md', base: './happening-now' }),
  schema: z.object({}),
});

export const collections = { members, now, week };

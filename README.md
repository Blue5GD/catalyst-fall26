# Catalyst

The platform for **y/cs Catalyst**, a fall program of two-week build sprints for Yale Computer Society members. It shows who's in the program and where everyone stands on points.

**New to Catalyst? Your first task is to add yourself to the members page. Start with [CONTRIBUTING.md](CONTRIBUTING.md).**

---

## For contributors

### Run it locally

You need [Node.js 22](https://nodejs.org).

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open [localhost:4321](http://localhost:4321).

### How it's built

- **[Astro](https://docs.astro.build)** renders the pages. Most pages are plain HTML built ahead of time. Pages that need live data or know who you are run on the server for each request (they have `export const prerender = false`).
- **[Supabase](https://supabase.com/docs)** stores accounts and points, and handles email and password sign-in.
- **[Vercel](https://vercel.com)** hosts the site.

| Page | Built | Data comes from |
|---|---|---|
| `/` home | Ahead of time | `src/pages/index.astro` |
| `/members` | Ahead of time | The files in `members/` |
| `/leaderboard` | Per request | Supabase `leaderboard` view |
| `/signin`, `/signup` | Per request | Supabase Auth |

The **Sign in / Sign out** link in the header is a [server island](https://docs.astro.build/en/guides/server-islands/). It loads separately on each visit, so the rest of the page can stay static.

### Where things live

```
members/                 One JSON file + one photo per person (see CONTRIBUTING.md)
src/pages/               One file per page. The file path is the URL.
src/layouts/             The shared page frame: header, footer, fonts
src/components/          Pieces used across pages
src/lib/                 Helpers: loading members, Supabase client, sign-in rules
src/middleware.ts        Runs before every on-demand page; works out who's signed in
src/content.config.ts    The fields allowed in members/*.json
src/styles/global.css    Colors, type and shared styles, from DESIGN.md
src/lib/guards.ts        Sign-in and admin checks for pages
src/lib/points-form.ts   The admin points form and points formatting
src/pages/me.astro       Your points and history
src/pages/admin/         Admin pages (leads only)
scripts/check-members.mjs  Checks every profile in members/
scripts/check-pr-scope.mjs Checks a participant's PR only touches their own profile
scripts/check-matches.mjs  Compares profiles with sign-ups (leads run it by hand)
supabase/migrations/     Database tables and access rules, as SQL
docs/LEADS.md            How leads run things: points, accounts, setup
```

### Design

Every page follows [DESIGN.md](DESIGN.md), which is based on the y/cs slide template: black background, white DM Sans type, thin lines and one peach accent. Check it before you add or change a page.

### Checks

```bash
npm run check:members   # validate members/ like CI does
npm run check:pr        # your branch only changes your own profile
npm run check           # type-check the site
npm run build           # make sure the site builds
```

All four run on every pull request (`.github/workflows/check-members.yml`), in two jobs: **Profiles** and **Build**. The `check:pr` step is skipped for leads (repo owners, members and collaborators), whose PRs can change anything. `main` requires both jobs to pass before a merge.

`npm run check:matches` isn't part of CI. It compares `members/` with the accounts in Supabase (see [docs/LEADS.md](docs/LEADS.md)).

`npm test` runs the unit tests in `src/lib/*.test.ts`. `npx supabase test db` runs the database tests in `supabase/tests/` against local Supabase (`npx supabase start` first; it needs Docker).

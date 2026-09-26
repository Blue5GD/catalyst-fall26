## Development

When starting the dev server, use background mode:

```
astro dev --background
```

Manage the background server with `astro dev stop`, `astro dev status`, and `astro dev logs`.

## Documentation

Full documentation: https://docs.astro.build

Consult these guides before working on related tasks:

- [Adding pages, dynamic routes, or middleware](https://docs.astro.build/en/guides/routing/)
- [Working with Astro components](https://docs.astro.build/en/basics/astro-components/)
- [Using React, Vue, Svelte, or other framework components](https://docs.astro.build/en/guides/framework-components/)
- [Adding or managing content](https://docs.astro.build/en/guides/content-collections/)
- [Adding styles or using Tailwind](https://docs.astro.build/en/guides/styling/)
- [Supporting multiple languages](https://docs.astro.build/en/guides/internationalization/)

FOR PRODUCT DIRECTION:
@PRD.md

FOR ANY DESIGN WORK:
@DESIGN.md

Never mention Claude or Anthropic in commit messages.



## Project rules

- Read README.md for how the site is built and where things live.
- `members/*.json` rules live in two places that must match: `src/content.config.ts` and `scripts/check-members.mjs`.
- `point_entries` is append-only (enforced by a trigger). Fix mistakes with a negative entry; never add update or delete paths.
- Who's signed in comes from `Astro.locals.user`, which middleware loads from the `participants` row. Never trust `user_metadata` for identity; users can edit it.
- `Astro.locals.supabase` is null when `.env.local` is missing. Handle that instead of crashing.
- Every table in `public` needs RLS and explicit column grants. Change the schema with a new file in `supabase/migrations/` (`npx supabase migration new <name>`), not in the dashboard.
- Participants are beginners. Keep `members/` and CONTRIBUTING.md simple, and keep check error messages specific about how to fix the problem.

# Lead handbook

How Catalyst leads run the platform day to day. Everything here happens in the [Supabase dashboard](https://supabase.com/dashboard/project/ttstppxlaedpnoonivbw) or on GitHub. You don't need to write code.

## Reviewing members-page PRs

Before you merge a participant's first PR, check:

- [ ] The **Profiles** and **Build** checks are green. They catch bad JSON, template values left in, bad photos, extra files, other people's profiles and a `"role"` line.
- [ ] The NetID in the file names looks like the person's. The check can't verify it.
- [ ] The photo is a real, appropriate photo of the person.

If the checks say "awaiting approval", click **Approve and run**. GitHub holds runs for some first-time contributors.

Merging deploys the site automatically. The profile shows up within a few minutes.

### Check that profiles match sign-ups

The leaderboard finds each person's photo by NetID, so a typo in either place leaves them with a grey square. Every few days, run:

```bash
npm run check:matches
```

It lists likely NetID typos, sign-ups with no profile yet, profiles with no sign-up yet, and people whose sign-up name differs from their profile. Fix a typo in whichever place is wrong: rename the files in a PR, or edit `netid` in the `participants` table. Accounts marked inactive don't show up in the report.

## Points

Points live in the `point_entries` table. Each row is one award, and the leaderboard adds them up.

### Award points

1. Go to `/admin` on the site. Only accounts with `role` set to `admin` can open it.
2. Pick one or more people, the points (1 to 100), and a short, specific reason like "Won the Project 1 design challenge".
3. Choose **Award** for challenge or project prizes, or **Correction** when you're fixing a mistake.

The reason shows in each person's points history. The site records your NetID as the person who awarded the points.

### Fix a mistake

You can't edit or delete an entry. The log is append-only on purpose, so there's always a record of every change. To undo one:

1. Find the entry under **Recent entries** on `/admin`, or on the person's page (click their name).
2. Click **Correct**. The form fills in the reversing entry.
3. Check it and submit. The original entry then shows **Corrected**, and it can't be corrected a second time.

Entries for people who are no longer active can't be corrected.

### Table editor (fallback)

If the site is down, add a row in **Table Editor → point_entries → Insert → Insert row**:

| Field | What to enter |
|---|---|
| `participant_id` | Click it and pick the person by name |
| `amount` | Points to award, like `1` or `2`. Negative to undo an entry. |
| `reason` | Short and specific: "Workshop 1 attendance", "Group 4 photo, Oct 3" |
| `source_type` | `manual` for anything you enter by hand; `award` for challenge or project prizes |
| `source_id` | For a correction, the `id` of the entry you're undoing. Otherwise leave it empty. |
| `created_by` | Your NetID |

Leave `id` and `created_at` empty. They fill themselves in.

**Don't record reward spending as a negative entry.** The leaderboard ranks by the sum of these rows, so spending would lower someone's rank. Rewards get their own table in Phase 2 (PRD P-5). Until then, track redemptions separately.

## Accounts

Participants create their own accounts at `/signup` with their name, NetID, Yale email and a password. The NetID isn't verified.

### Make someone a lead

**Table Editor → participants**, find their row, and set `role` to `admin`.

### Someone signed up with the wrong NetID

This happens after a typo, or when someone takes another person's NetID. The real owner then sees "That NetID already has an account".

1. **Table Editor → participants**, find the wrong row by email.
2. Change its `netid` to the correct one for that person. If they shouldn't have an account at all, set `active` to `false` and change `netid` to something unused, like `removed1` (lowercase letters and numbers only).
3. Tell the real owner to sign up again.

Points are tied to the account, not the NetID, so they stay with the right person.

### Remove someone

Set `active` to `false` in **participants**. They disappear from the leaderboard, and their points stay in the log.

You can only delete an account (**Authentication → Users → Delete user**) if it has no points. Once points exist, the append-only log keeps the account from being deleted.

To take someone off the members page, delete their two files in `members/` with a PR.

### Forgotten passwords

There's no "forgot password" page yet, and password emails need a custom email provider (see setup below). Once that's set up: **Authentication → Users**, find the person, and choose **Send password recovery**.

## One-time setup

### Database

Apply the database migrations to the live project. You only need to do this when `supabase/migrations/` changes. Do it **before** merging the PR that adds the migration, so the site never runs against an older database:

```bash
npx supabase login
npx supabase link --project-ref ttstppxlaedpnoonivbw
npx supabase db push
```

### Sign-in settings

In **Authentication → Sign In / Providers → Email**:

- **Email** sign-in must be on.
- **Confirm email:**
  - **Off (current choice):** people are signed in right after they sign up. Nobody proves they own the email address.
  - **On:** Supabase's built-in email only sends to your own Supabase team, so first set up a real email provider under **Authentication → Emails → SMTP Settings** (for example Resend). Then open **Authentication → Emails → Templates → Confirm signup** and paste in [`supabase/templates/confirmation.html`](../supabase/templates/confirmation.html), so the link works on any device.

In **Authentication → URL Configuration**:

- **Site URL:** the production address, like `https://catalyst-fall26.vercel.app`.
- **Redirect URLs:** add `https://<your-site>/**` and `http://localhost:4321/**`.

In **Authentication → Policies** (or **Passwords**), set the minimum password length to **8**, to match the sign-up form.

### Hosting (Vercel)

1. Import the GitHub repo into Vercel. It detects Astro automatically.
2. Under **Settings → Environment Variables**, add `PUBLIC_SUPABASE_URL` and `PUBLIC_SUPABASE_PUBLISHABLE_KEY` with the values from `.env.example`.
3. Deploy. Every merge to `main` redeploys.

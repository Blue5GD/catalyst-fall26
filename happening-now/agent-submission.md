---
title: Add your AI agent to the members page
date: 2026-10-31
---

Your profile can now link to your Project 2 agent. To add it:

1. On your fork's GitHub page, click **Sync fork**, then **Update branch**. In your `catalyst-fall26` folder, run `git checkout main`, `git pull`, and `git checkout -b add-agent`.
2. Open `members/<your-netid>.json` and add an `"agent"` line with a link to your agent's repo or demo. Put a comma at the end of the line above it, but not on the new line:

   ```json
   "github": "alexbell",
   "agent": "https://github.com/alexbell/study-buddy-agent"
   ```

3. Commit, push and open a pull request. Once a lead merges it, an **AI agent** link shows up under your name.

Stuck? See [Changing or removing your profile](https://github.com/eliboug/catalyst-fall26/blob/main/CONTRIBUTING.md#changing-or-removing-your-profile), or bring it to office hours.

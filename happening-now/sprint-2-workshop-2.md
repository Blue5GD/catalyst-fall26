---
title: Sprint 2 Workshop 2
date: 2026-10-15
---

Today we talked about how to build multi-agent systems, and the frameworks and techniques you'll use to build them well. We hope you learned something!

**Slides:** [view the deck](https://docs.google.com/presentation/d/1jLAcyA7yE66R9Cavj-BCQW5799HABCPSxpjWe55CKDc/edit?usp=sharing)

#### Your project: due Friday, Oct 30

Build a multi-agent system for a use case you choose. You can start from the [Repo Investigator](https://github.com/jeet-parikh/catalyst-agent-workshop/tree/main/repo_investigator) or [Movie Agent](https://github.com/jeet-parikh/catalyst-agent-workshop/tree/main/movie_agent) scaffold, or build your own agent. A good project has:

- A clear improvement in how well a task gets done
- Two or more of the agent patterns from today's workshop
- A working demo you can show

#### Add your agent to the members page

Your profile can now link to your agent. To add it:

1. On your fork's GitHub page, click **Sync fork**, then **Update branch**. In your `catalyst-fall26` folder, run `git checkout main`, `git pull`, and `git checkout -b add-agent`.
2. Open `members/<your-netid>.json` and add an `"agent"` line with a link to your agent's repo or demo. Put a comma at the end of the line above it, but not on the new line:

   ```json
   "github": "alexbell",
   "agent": "https://github.com/alexbell/study-buddy-agent"
   ```

3. Commit, push and open a pull request. Once a lead merges it, an **AI agent** link shows up under your name.

Stuck? See [Changing or removing your profile](https://github.com/eliboug/catalyst-fall26/blob/main/CONTRIBUTING.md#changing-or-removing-your-profile), or bring it to office hours.

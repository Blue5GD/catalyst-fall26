# Your first task: add yourself to the members page

Your first Catalyst task is to put your name and photo on the members page by opening a **pull request** (PR). It takes about 20 minutes, and you'll use the same Git and GitHub steps on every project this fall.

**Do it before the first workshop on Tuesday, Sep 29.**

**The members page is public.** Anyone with the link can see your name, photo and bio. Only add what you're happy to share.

## What you'll change

You'll add two files to the `members/` folder, both named with your NetID in lowercase:

```
members/ab123.json   ← your name and a one-line bio
members/ab123.jpg    ← your photo (.jpg or .png)
```

That's the whole change. Don't edit any other files. For a finished example, look at [`members/esb82.json`](members/esb82.json). That profile belongs to a lead, so it has a `"role": "Lead"` line. **Don't copy that line into yours.**

## Words you'll see

| Word | What it means |
|---|---|
| **Repo** (repository) | A project folder that Git tracks, including its full history. |
| **Fork** | Your own copy of someone else's repo on GitHub. You can change it freely. |
| **Clone** | Downloading a repo from GitHub to your computer. |
| **Branch** | A separate line of work inside a repo, so your changes don't touch `main` until they're approved. |
| **Commit** | A saved snapshot of your changes, with a message describing them. |
| **Push** | Uploading your commits from your computer to GitHub. |
| **Pull request (PR)** | A request asking the original repo to take your changes. Leads review it and merge it. |

## Before you start

You need three things. If you already have them, skip ahead.

1. **A GitHub account.** Sign up at [github.com](https://github.com).
2. **Git.** Open a terminal (Terminal on Mac, PowerShell on Windows) and run:

   ```bash
   git --version
   ```

   If you see a version number, you're set. If not, install Git from [git-scm.com](https://git-scm.com/downloads) and open a new terminal.
3. **Cursor**, the code editor we use. Download it from [cursor.com](https://cursor.com/download), install it, and sign in when it asks. The free plan is enough. If you already use VS Code, Cursor looks and works the same way.

If you've never used Git on this computer, tell it who you are. Use the email on your GitHub account:

```bash
git config --global user.name "Your Name"
git config --global user.email "you@example.com"
```

## Steps

In the commands below, replace `ab123` with your NetID and `YOUR-USERNAME` with your GitHub username.

### 1. Fork the repo

Click **Fork** at the top right of [github.com/eliboug/catalyst-fall26](https://github.com/eliboug/catalyst-fall26), then click **Create fork**.

You should now be on `github.com/YOUR-USERNAME/catalyst-fall26`. That's your copy.

### 2. Clone your fork

```bash
git clone https://github.com/YOUR-USERNAME/catalyst-fall26.git
cd catalyst-fall26
```

This downloads your fork into a new `catalyst-fall26` folder and moves you into it. Open that folder in Cursor (**File → Open Folder**).

### 3. Make a branch

```bash
git checkout -b add-ab123
```

You should see `Switched to a new branch 'add-ab123'`.

### 4. Add your profile

1. Copy the template:

   ```bash
   cp members/_template.json members/ab123.json
   ```

2. Open `members/ab123.json` in Cursor and fill it in:

   ```json
   {
     "name": "Alex Bell",
     "bio": "Sophomore in CS. I like building tools for musicians.",
     "github": "alexbell",
     "website": "https://alexbell.dev"
   }
   ```

   | Field | Required | Rules |
   |---|---|---|
   | `name` | Yes | 60 characters max |
   | `bio` | Yes | One line, 120 characters max |
   | `github` | No | Just your username, not a link |
   | `website` | No | A full link starting with `https://` |
   | `role` | **Don't add** | Only for leads and instructors. Leave it out, or a lead will ask you to remove it before merging. |

   Don't have a website yet? Delete that line. You'll build one in Project 1. If you delete the last line, also delete the comma at the end of the line above it. JSON doesn't allow a trailing comma.

3. Add your photo to the `members/` folder as `ab123.jpg` (or `ab123.png`):
   - A clear photo of your face, centered. It's cropped to a square.
   - At least 400 × 400 px and under 2 MB. Phone photos are usually too big. To shrink one:
     - **Mac:** open it in Preview, choose **Tools → Adjust Size**, and set the width to 800.
     - **Any computer:** drop it into [squoosh.app](https://squoosh.app), resize it to 800 px wide, and download it as a JPEG.
   - The file must really be a JPEG or PNG. Renaming a `.heic` or `.webp` file to `.jpg` won't work; export it instead.

### 5. Preview it (optional)

If you have [Node.js 22](https://nodejs.org) installed, you can run the same check your PR will run and see the page on your computer:

```bash
npm install
cp .env.example .env.local
npm run check:members
npm run dev
```

Then open [localhost:4321/members](http://localhost:4321/members). Press `Ctrl+C` in the terminal to stop the server.

`.env.local` holds the settings the site needs to load the leaderboard and sign-in. Git ignores it, so it won't end up in your PR.

### 6. Commit and push

```bash
git add members/ab123.json members/ab123.jpg
git commit -m "Add ab123 to members page"
git push -u origin add-ab123
```

Run `git status` before committing if you want to check that only your two files are included.

### 7. Open the pull request

1. Go to your fork on GitHub. A yellow banner shows **Compare & pull request**. Click it.
2. Check that it says `eliboug/catalyst-fall26` on the left and your fork on the right.
3. Title it `Add <your name> to members page`, then click **Create pull request**.
4. Wait a minute for the **Check member profiles** check to finish:
   - **Green check:** you're done. A lead will review and merge it.
   - **Red X:** click **Details** to see what's wrong. Fix it on your computer, then commit and push again (step 6, without `-u origin add-ab123`). The PR updates by itself.

Once a lead merges your PR, you'll be on the members page within a few minutes. Then star the repo.

## If something goes wrong

| Problem | Fix |
|---|---|
| `git push` asks for a password and then fails | GitHub doesn't accept account passwords in the terminal. Install [GitHub CLI](https://cli.github.com) and run `gh auth login`, then push again. |
| `Permission denied` or `403` when you push | You cloned the original repo instead of your fork. Run `git remote set-url origin https://github.com/YOUR-USERNAME/catalyst-fall26.git` and push again. |
| The check says "isn't valid JSON" | Look for a missing quote or comma, or an extra comma after the last line. Cursor underlines JSON mistakes in red. |
| The check says the file name must be your NetID | Both files must be named with your NetID in lowercase, like `ab123.json` and `ab123.jpg`. |
| The check says the photo is really a different format | Export the photo as a JPEG or PNG. Renaming it isn't enough. |
| The check says your PR should only change files in `members/` | You changed another file by accident. Run the command the check shows to undo it, then commit and push. |
| The check mentions a "BOM" character | Your editor saved the file in a slightly different format. The check's message says how to re-save it in Cursor. |
| No **Compare & pull request** banner | Go to the **Pull requests** tab on your fork, click **New pull request**, and choose your branch. |
| Something else | Ask in the group chat or at office hours, and paste the error message. |

## Changing or removing your profile

To change your profile, make a new branch, edit your files, and open another PR. To remove it, open a PR that deletes your two files, or ask a lead to do it for you.

---
id: r6-01
title: "Work on a branch"
release: r6
order: 1
prerequisites: []
outcomes:
  - Read git status and git log well enough to know where you are
  - Create a branch, commit on it, and leave main unchanged
  - Push the branch to GitHub with gh
evidence: [commit]
---

<LessonMission
  role="on-call engineer"
  problem="Every R0-R5 commit landed on main. A half-finished README edit is about to sit next to replay-safe checkout. There is no branch to review, and no remote if the laptop dies."
  destination="A branch named r6/team-workflow, one commit that is not on main, and the same commit on GitHub."
/>

# Work on a branch

A **branch** is a named pointer at a commit. `main` is the branch you treat as the last known-good shop. You do new work on a second pointer so `main` stays shippable while the change is unfinished. R0 made the first commit on `main`. This page is the first time you leave it on purpose.

## See the idea first

From `gold-pasal`:

```bash
git status -sb
git log --oneline -5
```

```text
## main
<hash> <your latest R5 message>
...
<hash> Set up the Gold Pasal workshop
```

`## main` means HEAD is `main` and the working tree is clean. Hashes and messages are yours. If the first line is `## main...origin/main` you already have a GitHub remote from R0's optional `gh repo create`; keep it. If `git status` lists files, finish or stash that work before you continue.

## Publish the repo if it is still local-only

```bash
gh --version
git remote -v
```

If `gh` is missing: macOS `brew install gh`, Linux follow [cli.github.com](https://cli.github.com/). Then once per machine:

```bash
gh auth login
```

Pick GitHub.com, HTTPS, and login in the browser.

If `git remote -v` is empty, create the GitHub repository from this folder (private is fine):

```bash
gh repo create gold-pasal --private --source=. --remote=origin --push
```

```text
https://github.com/<you>/gold-pasal
```

`--source=.` uses the folder you are in. `--push` sends `main`. The URL is now the backup and the place pull requests will open.

If `origin` already exists, skip `gh repo create`. Confirm you can see `main` on GitHub with `gh repo view --web` (opens a browser) or `gh repo view`.

## Create a branch and commit on it

```bash
git checkout -b r6/team-workflow
git status -sb
```

```text
Switched to a new branch 'r6/team-workflow'
## r6/team-workflow
```

`checkout -b` creates the branch and moves HEAD to it. `main` still points at the same commit it did a second ago.

Open `README.md` and add one line under the existing verify instructions, so a reviewer can see a real diff:

```markdown
    uv sync --all-groups
    ./scripts/verify.sh
    uv run --env-file .env pytest tests/inventory -m integration -q
```

Save. Then:

```bash
git diff
git add README.md
git commit -m "Document the inventory test command in the README"
git log --oneline -3
git log --oneline main..HEAD
```

```text
<hash> Document the inventory test command in the README
<hash> <previous on main>
...
<hash> Document the inventory test command in the README
```

`main..HEAD` lists commits that are on this branch and not on `main`. One line. That is the change a pull request will show tomorrow.

`main` itself did not move:

```bash
git log --oneline -1 main
```

That prints the R5 tip, not the README commit.

## Push the branch

```bash
git push -u origin HEAD
```

```text
Enumerating objects: ...
To https://github.com/<you>/gold-pasal.git
 * [new branch]      HEAD -> r6/team-workflow
```

`-u origin HEAD` sets this local branch to track `origin/r6/team-workflow`. Later `git push` with no arguments is enough.

`HEAD` here means "the branch I am on". You did not push `main`. A reviewer looking at GitHub's default branch still sees R5.

## What the words mean

| Word | In this repo |
| --- | --- |
| commit | a snapshot with a hash and a message |
| branch | a name pointing at a commit (`main`, `r6/team-workflow`) |
| `HEAD` | the commit you are on right now |
| remote | a copy of the repo elsewhere (`origin` is GitHub) |
| tracking | your local branch knows which remote branch to push to |

`git checkout main` moves you back. The README commit stays on `r6/team-workflow` until you merge it. Stay on `r6/team-workflow` for the next page.

Do not commit `.env`. `git status` must never list it. If it does, it is not ignored: restore the `.env` line in `.gitignore` from [R0](/releases/r0/01-set-up-the-workshop) before you add anything else.

## If it fails

| What you see | Cause | Fix |
| --- | --- | --- |
| `fatal: not a git repository` | Wrong folder | `cd` into `gold-pasal` |
| `gh: command not found` | CLI not installed | `brew install gh` or the installer on cli.github.com |
| `gh auth login` waits | Browser step unfinished | Complete the device code in the browser |
| `remote origin already exists` on `gh repo create` | You published in R0 | Skip create; use the existing remote |
| `failed to push` / permission | Not logged in, or the remote is someone else's | `gh auth status`; `git remote -v` |
| `main` already has the README line | You committed on `main` | `git checkout -b r6/team-workflow` still works if the commit is the tip; if you need `main` clean, say so on the next page before opening the PR |
| `.env` in `git status` | Ignore rule missing | Fix `.gitignore`; `git rm --cached .env` if it was added |

## Practice

<LessonQuiz
  question="You are on r6/team-workflow with one extra commit. You run git checkout main. What happens to that commit?"
  a="It is deleted"
  b="It stays on r6/team-workflow; main does not include it"
  c="It is copied onto main automatically"
  d="Git asks you to rebase"
  correct="b"
>

A commit belongs to the history reachable from a branch name. Checking out `main` only moves `HEAD`. The README commit is still reachable from `r6/team-workflow`. `git log main..r6/team-workflow` still shows it.

</LessonQuiz>

Next: [Open a pull request](02-open-a-pull-request), using this branch.

<EvidenceCard
  command="git log --oneline main..HEAD && git status -sb"
  artifact="one commit on r6/team-workflow, not on main; branch pushed to origin"
  invariant="New work happens on a branch. main stays at the last known-good shop until a review merges it."
/>

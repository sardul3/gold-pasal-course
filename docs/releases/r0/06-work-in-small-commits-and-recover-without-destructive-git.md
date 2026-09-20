---
id: r0-06
title: "Small commits"
release: r0
order: 6
prerequisites: [r0-05]
outcomes:
  - Inspect status, unstaged diff, and staged diff as three different views
  - Stage one path, unstage it, and leave the file on disk
  - Refuse git add ., reset --hard, and force-push for these exercises
evidence: [commit, ci-run]
---

<LessonMission
  role="new backend engineer"
  problem="The shop files are on disk, but Git either has no snapshot yet or a vague commit would claim a quote that does not exist."
  destination="You can explain tracked vs untracked files, unstage a mistake without deleting it, and name what must not enter history."
/>

# Small commits

Work in `gold-pasal`. A commit should answer one question, such as “does a fresh checkout import the package?” Do not write a message that claims a quote.

## See the idea first

```bash
git status --short --branch
git diff
git diff --staged
git log --oneline -5
```

A **commit** is a named snapshot of tracked files. `git status` is the map. `git diff` shows **unstaged** changes to **tracked** files. `git diff --staged` shows what the next commit would contain.

Two common first-run results:

1. **The starter already has commits.** `git log` prints short SHAs. `git status` is clean, or shows only files you edited.
2. **Git has no commits yet.** `git log` prints `fatal: ... does not have any commits yet`. `git status` lists shop files as `??`. `git diff` is empty because untracked files are not in the diff. Do not run `git add .` to make the emptiness go away.

## Tracked, untracked, ignored

- **Untracked** (`??`): Git sees the path and is not recording it yet.
- **Tracked**: Git already has a version. Edits show in `git diff`.
- **Ignored**: listed in `.gitignore`. `.venv/` and `.env` must stay ignored.

Never stage `.env`, private keys, or unrelated lesson notes. You will make the real R0 commit in the release gate. When you do, name paths instead of `git add .`.

<LessonQuiz
  question="If a file appears in git status as ?? but git diff is empty, will it enter the next commit?"
  a="Yes, because git status listed it"
  b="Not until you git add that path"
  c="Yes, if the file is not in .gitignore"
  d="No; untracked files can never be committed"
  correct="b"
>

Not until you `git add` that path. After `git add`, the content appears in `git diff --staged`.

</LessonQuiz>

## Recover without destroying work

`git restore --staged path/to/file` unstages and leaves the file on disk. If Git prints `fatal: could not resolve HEAD`, you have no snapshot yet. Unstage with:

```bash
git rm --cached path/to/file
```

`--cached` means “remove from the staging area only.” Dropping `--cached` would delete the file.

Do not use `git reset --hard`, force-push, or broad `git clean` for these exercises.

## Practice

Create `r0-git-practice.txt` in the shop root with one sentence: `Sita checks the scale before she trusts the rate card.`

```bash
git status --short
git diff
git add r0-git-practice.txt
git diff --staged
git restore --staged r0-git-practice.txt
```

If that last command fails with `could not resolve HEAD`, run `git rm --cached r0-git-practice.txt` instead. Then:

```bash
git status --short
rm r0-git-practice.txt
```

After `git add`, status should show the file staged. After unstaging, it should be `??` again. Do not commit the exercise.

## Check

```bash
./scripts/verify.sh
git status --short
```

Next: [Release gate: first CI check](07-release-gate-reproducible-environment-and-first-ci-check).

<EvidenceCard
  command="./scripts/verify.sh"
  artifact="a practice file that was staged, unstaged, and deleted without reset --hard"
  invariant="history contains only named paths; secrets and .venv stay out"
/>

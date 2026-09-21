---
id: r6-03
title: "Rebase and resolve conflicts"
release: r6
order: 3
prerequisites: [r6-02]
outcomes:
  - Rebase a feature branch onto an updated main
  - Resolve a merge conflict and continue the rebase
  - Recover with git rebase --abort when needed
evidence: [commit]
---

<LessonMission
  role="on-call engineer"
  problem="You started a README tweak yesterday. Someone merged a different README line to main this morning. git push is rejected, and the file now has both edits in it."
  destination="A rebase onto current main, one resolved README, and a branch that fast-forwards when you push."
/>

# Rebase and resolve conflicts

`main` moved when you merged the last PR. Any new branch you open from an older `main` is behind. **Rebase** takes your commits and replays them on top of the current `main`, one at a time. When two commits edited the same lines, Git stops and asks you to write the combined file. That stop is a **conflict**.

This page manufactures one on purpose so you see the markers once, in a file you can afford to break.

## See the idea first

From `gold-pasal`, on an up-to-date `main`:

```bash
git checkout main
git pull origin main
git checkout -b r6/readme-hold-note
```

Add a new line at the end of `README.md`:

```markdown
Holds expire. Pass a clock into place_hold in tests.
```

```bash
git add README.md
git commit -m "Note hold expiry in the README"
```

Leave this branch. On `main`, add a *different* last line so the two commits cannot auto-merge:

```bash
git checkout main
```

Put this last line in `README.md` instead (do not keep the hold sentence):

```markdown
Checkout replays by Idempotency-Key.
```

```bash
git add README.md
git commit -m "Note checkout replay in the README"
git push origin main
```

You just committed straight to `main`. That is the situation a teammate's merged PR creates. You are simulating them. If GitHub rejects the push because `main` is protected, put that commit on a tiny branch, open a PR, and merge it; the rest of the page is the same. Switch back:

```bash
git checkout r6/readme-hold-note
git rebase main
```

```text
Auto-merging README.md
CONFLICT (content): Merge conflict in README.md
error: could not apply <hash>... Note hold expiry in the README
hint: Resolve all conflicts manually, mark them as resolved with
hint: "git add/rm <conflicted_files>", then run "git rebase --continue".
hint: To abort and get back to the state before "git rebase", run "git rebase --abort".
```

Git stopped in the middle of the replay.

## Read the markers

Open `README.md`. The conflicted region looks like this (hashes differ):

```text
<<<<<<< HEAD
Checkout replays by Idempotency-Key.
=======
Holds expire. Pass a clock into place_hold in tests.
>>>>>>> <hash> (Note hold expiry in the README)
```

| Marker | Meaning |
| --- | --- |
| `<<<<<<< HEAD` | the file as it is on the commit you are rebasing *onto* (`main`) |
| `=======` | divider |
| `>>>>>>> <hash>` | your commit that is being replayed |

Delete the markers. Keep both sentences; both are true:

```markdown
Checkout replays by Idempotency-Key.
Holds expire. Pass a clock into place_hold in tests.
```

Then:

```bash
git add README.md
git rebase --continue
```

If Git opens an editor for the commit message, save and close it (the original message is fine).

```text
[detached HEAD <hash>] Note hold expiry in the README
Successfully rebased and updated refs/heads/r6/readme-hold-note.
```

```bash
git log --oneline --graph -5
```

```text
* <hash> Note hold expiry in the README
* <hash> Note checkout replay in the README
* <hash> Merge pull request #<n> from <you>/r6/team-workflow
...
```

Your commit sits *on top of* the new `main` commit. Linear. That is what rebase is for.

## Push after a rebase

The branch changed history (the README commit has a new hash). If you had already pushed `r6/readme-hold-note`, a plain `git push` is rejected. Update the remote with a lease, not a blind force:

```bash
git push -u origin HEAD --force-with-lease
```

`--force-with-lease` overwrites the remote branch only if nobody else pushed to it in the meantime. Plain `--force` does not check. Do not `--force-with-lease` `main`.

Open a PR for this branch the same way as the last page, or merge it locally if you want to skip a second GitHub round-trip:

```bash
git checkout main
git merge --ff-only r6/readme-hold-note
git push origin main
git branch -d r6/readme-hold-note
```

`--ff-only` refuses to merge if `main` would need a merge commit. After a rebase onto `main` it fast-forwards. Push so GitHub's `main` matches.

## Abort and recover

If the conflict looks wrong and you have not run `--continue`:

```bash
git rebase --abort
```

You are back on `r6/readme-hold-note` as it was before `git rebase main`. Nothing on `main` changes.

`git merge` is the other way to combine branches. It creates a merge commit and leaves your original hashes alone. This course rebases short feature branches onto `main` so `git log --oneline` on `main` stays a readable list. Do not rebase commits that other people already based work on. Your unmerged feature branch is yours.

`git revert` makes a new commit that undoes an old one. Use it on `main` after a bad merge. It is the safe opposite of rewriting history.

## If it fails

| What you see | Cause | Fix |
| --- | --- | --- |
| `CONFLICT` and you cannot find the markers | The editor hid them, or you resolved the wrong file | `git status` lists `UU` files; open those |
| `rebase --continue` says you have uncommitted changes | You edited but did not `git add` | `git add` the resolved file |
| `rebase --continue` says nothing to commit | You deleted both sides and the file matches `main` | `git rebase --skip` if your commit is empty on purpose; otherwise restore a side and add |
| `cannot rebase: you have unstaged changes` | Dirty tree | Commit or stash first |
| `refusing to merge unrelated histories` | Wrong folder or a second `git init` | Stay in the `gold-pasal` you have used since R0 |
| `--force-with-lease` rejected | Remote moved | `git fetch` and look at `git log origin/r6/readme-hold-note`; do not force until you know why |

## Practice

<LessonQuiz
  question="During a rebase, HEAD in the conflict markers is which version of the file?"
  a="Your feature commit being replayed"
  b="The commit you are rebasing onto, here main"
  c="The original root commit from R0"
  d="The copy on GitHub, always"
  correct="b"
>

Rebase puts you in a detached state where `HEAD` is the new base. `<<<<<<< HEAD` is `main`'s line. `>>>>>>>` is your commit. You edit until the file is the shop you want, then `git add` and `--continue`.

</LessonQuiz>

Next: [Run integration tests in CI](04-run-integration-tests-in-ci), so the seven inventory tests run on GitHub, not only on your laptop.

<EvidenceCard
  command="git log --oneline --graph -5"
  artifact="hold-note commit on top of main; README with both sentences and no conflict markers"
  invariant="A short feature branch is rebased onto current main. Conflict markers never land in the merged file."
/>

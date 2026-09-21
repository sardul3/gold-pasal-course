---
id: r6-02
title: "Open a pull request"
release: r6
order: 2
prerequisites: [r6-01]
outcomes:
  - Open a pull request from r6/team-workflow into main with gh
  - Read the diff and the CI check on the PR
  - Merge the PR and confirm main moved
evidence: [pull-request, ci-run]
---

<LessonMission
  role="on-call engineer"
  problem="The README commit exists on a branch. Nobody can review it unless they ssh to your laptop. main has no record of the discussion, and application-ci has not run on this change."
  destination="A GitHub pull request for the README commit, merged into main, with the PR URL in your history."
/>

# Open a pull request

A **pull request** (PR) is a GitHub page that says: these commits on that branch should land on `main`. It holds the diff, the discussion, and the CI result. You already push with Git. `gh` talks to GitHub's API so you can open and merge without clicking through every field in the browser, though the browser view is still the thing a reviewer reads.

Stay on `r6/team-workflow` from the previous page.

## See the idea first

```bash
gh pr create --base main --head r6/team-workflow --title "Document the inventory test command" --body "$(cat <<'EOF'
## Summary
- README now shows the integration test command next to verify.sh

## Test plan
- [ ] README renders on GitHub
- [ ] application-ci is green on this branch
EOF
)"
```

```text
https://github.com/<you>/gold-pasal/pull/1
```

The number is yours (1 if this is the first PR). That URL is the evidence for this page.

## What GitHub created

```bash
gh pr view --json number,title,baseRefName,headRefName,url --jq '{number,title,base:.baseRefName,head:.headRefName,url}'
```

```text
{"base":"main","head":"r6/team-workflow","number":1,"title":"Document the inventory test command","url":"https://github.com/<you>/gold-pasal/pull/1"}
```

`--base main` is the branch that will receive the commits. `--head r6/team-workflow` is the branch you pushed. The test plan is a checklist for the person who merges, including you today.

Open the same PR in the browser:

```bash
gh pr view --web
```

Files changed should be `README.md` only. If `.env` is in the diff, do not merge. Close the PR, fix `.gitignore`, and start again.

## CI on the PR

R0 added `.github/workflows/ci.yml`. A push to a branch with an open PR starts `application-ci`. Watch it:

```bash
gh pr checks
```

```text
application-ci / verify	pass	<seconds>	https://github.com/<you>/gold-pasal/actions/runs/<id>
```

The first run can take a minute while `uv` caches. `pending` then `pass` is normal. `fail` means `./scripts/verify.sh` failed on Ubuntu the way it would fail on your laptop: open the log URL, scroll to the red step, fix it on the branch, `git push`. Do not push a second branch to hide a red PR.

Today the workflow has one job (`verify`) and it skips `tests/inventory` because `verify.sh` runs `pytest -m "not integration"`. The [CI page](04-run-integration-tests-in-ci) adds the second job. You still want `verify` green before you merge.

## Read the diff the way a reviewer does

```bash
gh pr diff
```

You should see the one README line, prefixed with `+`. That is the whole change. A reviewer's job is to say whether that line belongs on `main`, not to re-run the shop in their head.

On GitHub you can comment on a line. For this PR, comment on your own diff if you want the habit, then resolve it. You do not need a second person to finish the course. On a team, you wait for someone else.

## Merge

```bash
gh pr merge --merge --delete-branch
```

```text
✓ Merged pull request #<n> (Document the inventory test command)
✓ Deleted local r6/team-workflow
✓ Deleted remote branch r6/team-workflow
```

`--merge` creates a merge commit on `main` (GitHub's default "Create a merge commit"). `--delete-branch` removes `r6/team-workflow` locally and on GitHub so you do not keep shipping from a merged name.

Update your local `main`:

```bash
git checkout main
git pull origin main
git log --oneline -3
```

```text
<merge hash> Merge pull request #<n> from <you>/r6/team-workflow
<hash> Document the inventory test command in the README
<hash> <your previous R5 tip>
```

`main` now contains the README commit. The PR URL is still valid; GitHub marks it Merged. Copy that URL into whatever you use as a portfolio ledger.

## If it fails

| What you see | Cause | Fix |
| --- | --- | --- |
| `no commits between main and r6/team-workflow` | You committed on `main`, or never committed | `git log --oneline main..r6/team-workflow` must show a commit |
| `Head sha didn't match` / push rejected | Local branch behind the remote | `git push` the latest commit, then `gh pr create` |
| `gh pr create` opens an editor | You omitted `--title` and `--body` | Ctrl-C and rerun the command as written |
| Checks stay yellow | Actions not enabled, or the first run is still installing | GitHub repo Settings → Actions → allow; wait |
| `verify` red on Ubuntu, green locally | Uncommitted file, or line endings | Read the CI log; run `./scripts/verify.sh` again locally |
| `gh pr merge` wants a different strategy | Repo default is squash or rebase | `--merge` is the one this page uses; do not squash away the commit message you will grep later |

## Practice

<LessonQuiz
  question="application-ci is red on the PR. You already ran verify.sh locally and it was green. What do you do?"
  a="Merge anyway; local green is enough"
  b="Open the failing step's log, fix the branch, push, and wait for a new check"
  c="Delete the workflow file so the PR can merge"
  d="Open a second PR that reverts the first"
  correct="b"
>

CI is the same command on a clean Ubuntu checkout. A local pass with leftover files or a different Python does not override it. The fix lands on the same branch; the PR updates in place.

</LessonQuiz>

Next: [Rebase and resolve conflicts](03-rebase-and-resolve-conflicts), when `main` moves under you.

<EvidenceCard
  command="gh pr view --json url,state,mergedAt --jq ."
  artifact="merged pull request URL for the README commit; main pulled"
  invariant="Work reaches main through a reviewed pull request, not a commit on the default branch"
/>

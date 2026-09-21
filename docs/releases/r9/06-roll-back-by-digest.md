---
id: r9-06
title: "Roll back by digest"
release: r9
order: 6
prerequisites: [r9-05]
outcomes:
  - Revert the manifest to the last known-good digest
  - Re-run smoke without rebuilding the old image
evidence: [pull-request, deployment]
---

<LessonMission
  role="delivery owner"
  problem="Smoke failed on the new digest. Someone wants to docker build the old Dockerfile instead of pinning the last good sha256."
  destination="A revert PR restores the previous digest. Smoke passes. The failed digest remains in GHCR for forensics."
/>

# Roll back by digest

Rollback is Git: the previous digest in `deployment.yaml`. You do not rebuild. You do not retag `:good`. GHCR still has both digests. `kubectl rollout undo` on kind is a cluster emergency; the durable record is the revert commit.

## See the idea first

From `gold-pasal`:

```bash
git log -1 --oneline -- deploy/kind/deployment.yaml
```

```text
<hash> Promote gold-pasal-api@sha256:abc...
```

The parent of that commit should still have sha256:def, the last green smoke.

## Revert

```bash
git checkout -b r9/rollback-digest
git revert <promotion-commit> --no-edit
# or edit the image: line by hand to the last green digest
git commit --allow-empty # if you edited by hand, a normal commit instead
```

Open a PR. After merge, apply and `./scripts/smoke-kind.sh`.

Keep the failing smoke log in the PR description. Delete nothing from GHCR.

If a migration in the bad release is not backward compatible, rollback of the image is not enough. That is why R8 said not to mix breaking migrations into the drill. Call that out in the PR if you ever ship one.

## If it fails

| What you see | Cause | Fix |
| --- | --- | --- |
| revert conflicts | later commits touched the same line | Edit the digest by hand to the known-good value |
| smoke still fails | Secret or DB drift, not the image | describe; do not rebuild as the first move |

## Practice

<LessonQuiz
  question="What restores the last good bytes?"
  a="docker build of an old branch on the laptop"
  b="Putting the previous sha256 back in the manifest and applying"
  c="kind delete cluster"
  d="Deleting the bad GHCR tag only"
  correct="b"
>

The digest still exists. Point desired state at it. Rebuilding can produce different bytes.

</LessonQuiz>

Next: [Release gate: commit to running image](07-release-gate-commit-to-running-image).

<EvidenceCard
  command="git log -p -1 -- deploy/kind/deployment.yaml"
  artifact="revert PR, two digests named, smoke 200"
  invariant="Rollback is a digest you already published and tested."
/>

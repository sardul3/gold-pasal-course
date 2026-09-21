---
id: r8-06
title: "Roll out and roll back"
release: r8
order: 6
prerequisites: [r8-05]
outcomes:
  - Roll out a new image tag and watch status
  - Undo the Deployment to the previous revision
evidence: [deployment, runbook]
---

<LessonMission
  role="platform operator"
  problem="You changed the image tag and now /health is broken. There is no recorded previous ReplicaSet to return to."
  destination="A rollout of a bad image is reversed with kubectl rollout undo, and /health works again."
/>

# Roll out and roll back

A Deployment keeps a history of ReplicaSets. `kubectl rollout undo` points the Deployment back at the last working template. Migrations that are not backward compatible can make undo unsafe; for this page, only change a label or a broken tag so undo is valid. Run `alembic upgrade head` as a Job or an init step you document, not as a silent side effect of a random Pod restart.

## See the idea first

From `gold-pasal`:

```bash
kubectl rollout history deployment/gold-pasal-api
```

```text
REVISION  CHANGE-CAUSE
1         <none>
```

Add `kubectl.kubernetes.io/change-cause` via `kubectl annotate` or `kubectl apply` so history is readable.

## Break, then undo

Tag a copy of the image as `gold-pasal-api:bad`, or set an env var the app rejects. Apply. Watch:

```bash
kubectl rollout status deployment/gold-pasal-api
kubectl rollout undo deployment/gold-pasal-api
kubectl rollout status deployment/gold-pasal-api
curl -s -o /dev/null -w '%{http_code}\n' http://gold-pasal.local/health
```

Expect 200 after undo.

Prefer changing `image:` to a digest in R9. On kind, a tag you loaded is enough for the drill.

Do not `kubectl delete pod` as your rollback plan. That recreates the same bad template.

## If it fails

| What you see | Cause | Fix |
| --- | --- | --- |
| undo has only one revision | you never applied a second spec | Apply a change, then undo |
| migration forward-only | schema undo needed | Do not ship incompatible migrations in the same drill |

## Practice

<LessonQuiz
  question="What does kubectl rollout undo change?"
  a="Git history on GitHub"
  b="The Deployment spec back to a previous ReplicaSet template"
  c="The Docker image digest in GHCR"
  d="The kind node OS"
  correct="b"
>

Undo is cluster state. Git revert is R9, when Git is the desired-state store you promote.

</LessonQuiz>

Next: [Debug Pending and CrashLoop](07-debug-pending-and-crashloop).

<EvidenceCard
  command="kubectl rollout undo deployment/gold-pasal-api && kubectl rollout status deployment/gold-pasal-api"
  artifact="rollout history showing a failed revision and an undo"
  invariant="Rollback is a recorded previous template, not a hope that you remember the old YAML."
/>

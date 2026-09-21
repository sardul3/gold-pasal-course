---
id: r8-07
title: "Debug Pending and CrashLoop"
release: r8
order: 7
prerequisites: [r8-06]
outcomes:
  - Diagnose a Pending Pod from Events
  - Diagnose CrashLoopBackOff from logs and describe
evidence: [runbook]
---

<LessonMission
  role="platform operator"
  problem="The API is down. kubectl get pods says Pending or CrashLoopBackOff and you are about to delete the cluster."
  destination="You read Events, describe, and logs, and you can say whether the failure is schedule, image, config, or app."
/>

# Debug Pending and CrashLoop

**Pending** means the scheduler has not placed the Pod (resources, node selectors, PVC). **CrashLoopBackOff** means the container started and exited repeatedly. `kubectl describe pod` prints Events. `kubectl logs` prints stdout.

## See the idea first

From `gold-pasal`:

```bash
kubectl get pods -l app=gold-pasal-api
```

```text
NAME                               READY   STATUS    RESTARTS   AGE
gold-pasal-api-xxxx                1/1     Running   0          2m
```

If yours is already broken, stay there. If it is healthy, you will break it on purpose below.

## Two drills

Pending: raise `memory` requests to `64Gi` briefly, apply, `kubectl describe pod` and look for `FailedScheduling`. Restore requests.

CrashLoop: set `command: ["false"]` on the container, apply, `kubectl logs` (empty or immediate exit), `kubectl describe` for BackOff. Restore the uvicorn command.

```bash
kubectl describe pod -l app=gold-pasal-api | tail -30
kubectl logs -l app=gold-pasal-api --tail=50
```

Write four lines in `deploy/kind/RUNBOOK.md`: Pending, CrashLoop, empty endpoints, Ingress 404. Each line: what you look at first.

Do not jump to `kind delete cluster` unless the node is corrupt. That hides the evidence.

## If it fails

| What you see | Cause | Fix |
| --- | --- | --- |
| no Events | wrong namespace | kubectl get pod -A; use the namespace you applied |
| logs empty | container never started | describe for CreateContainerConfigError or image errors |

## Practice

<LessonQuiz
  question="A Pod is Pending. Where do you look first?"
  a="application-ci on GitHub"
  b="kubectl describe Events for FailedScheduling"
  c="Ollama"
  d="The VitePress site"
  correct="b"
>

Pending is scheduling. Events name the reason: memory, taints, missing PVC.

</LessonQuiz>

Next: [Release gate: kind rollout drill](08-release-gate-kind-rollout-drill).

<EvidenceCard
  command="kubectl describe pod -l app=gold-pasal-api"
  artifact="RUNBOOK.md with four failure lookups"
  invariant="Describe and logs before delete."
/>

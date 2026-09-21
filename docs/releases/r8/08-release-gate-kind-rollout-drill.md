---
id: r8-08
title: "Release gate: kind rollout drill"
release: r8
order: 8
prerequisites: [r8-07]
outcomes:
  - Perform a rollout and undo on kind
  - Show /health through Ingress after recovery
evidence: [commit, ci-run, demo]
---

<LessonMission
  role="platform operator"
  problem="A reviewer asks you to ship a new image and recover when it fails. You only have screenshots of Docker Desktop."
  destination="A witnessed apply, a broken rollout, an undo, and /health 200 on gold-pasal.local."
/>

# Release gate: kind rollout drill

This is the release gate. You apply desired state from `deploy/kind`, break it, undo, and curl the Ingress host. Same objects would apply on EKS or GKE with a different image pull secret and Ingress class. Cloud Run can host the container without Pods; the health URLs stay /health and /ready.

## See the idea first

From `gold-pasal`:

```bash
kubectl apply -f deploy/kind && kubectl rollout status deployment/gold-pasal-api
```

```text
deployment "gold-pasal-api" successfully rolled out
```

If apply needs a directory of files, `kubectl apply -f deploy/kind/` (trailing slash).

## Gate script

1. `kubectl apply -f deploy/kind/`
2. `kubectl rollout status deployment/gold-pasal-api`
3. Ship a known-bad change (bad command or huge request)
4. Show Pending or CrashLoop with describe
5. `kubectl rollout undo deployment/gold-pasal-api`
6. `curl --fail http://gold-pasal.local/health`

Optional: the [homelab Kustomize overlay](/side-quests/homelab-kustomize-overlay) if you have hardware. It is not required to pass.

R9 publishes this image to GHCR and deploys by digest instead of `:r7`.

## If it fails

| What you see | Cause | Fix |
| --- | --- | --- |
| Ingress still 502 after undo | controller or Service selector | Check endpoints and nginx logs |
| undo no-op | only one revision | The bad apply must create a new revision first |

## Practice

<LessonQuiz
  question="After this gate, where does a production-shaped image tag come from?"
  a="Untagged latest on the laptop"
  b="R9: one digest published to GHCR"
  c="npm run docs:dev"
  d="Ollama"
  correct="b"
>

kind used a local tag so you could learn objects. Delivery pins a digest.

</LessonQuiz>

<EvidenceCard
  command="kubectl rollout status deployment/gold-pasal-api && curl --fail http://gold-pasal.local/health"
  artifact="apply, bad revision, undo, curl 200"
  invariant="Desired state is YAML. Rollback is a previous revision."
/>

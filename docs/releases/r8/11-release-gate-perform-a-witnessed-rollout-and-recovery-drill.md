---
id: r8-11
title: "Release gate: perform a witnessed rollout and recovery drill"
release: r8
order: 11
prerequisites: [r8-10]
outcomes:
  - Apply release gate: perform a witnessed rollout and recovery drill to the cumulative Gold Pasal system
  - Explain the resulting behavior and its failure boundary
evidence: [commit, ci-run, demo]
---

<LessonMission
  role="homelab platform operator"
  problem="A new API image must roll out without dropping healthy traffic or hiding an invalid configuration."
  destination="Kubernetes converges to a constrained workload and exposes a tested rollback path."
/>

# Release gate: perform a witnessed rollout and recovery drill


This gate joins the release into one witnessed story: render desired state, validate it, roll out an immutable digest, prove traffic reaches only Ready pods, cause a controlled failure, diagnose it, and recover to a verified digest.

## See the idea first

Record the Git commit, promoted image digest, expected replica count, migration version, smoke URL, previous known-good digest, and drill stop conditions. Do not include credentials or secret values.

```bash
kubectl kustomize deploy/overlays/homelab > /tmp/release.yaml
kubectl apply --dry-run=server -f /tmp/release.yaml
uv run --project ../gold-pasal-course/checks pytest ../gold-pasal-course/checks/r8 --app-repo "$PWD"
kubectl diff -f /tmp/release.yaml
```

Read the rendered Deployment: distinct probes, requests and limits, non-root security context, graceful termination, and digest-pinned image. Confirm no rendered Secret contains `data` or `stringData`.

## Run the release

Apply the approved overlay. Watch Deployment conditions, ReplicaSets, pods, EndpointSlices, migration Job, and an HTTP smoke request. Capture running `imageID`, not only the configured image string.

```bash
kubectl rollout status deployment/gold-pasal-api --timeout=5m
kubectl get endpointslice -l kubernetes.io/service-name=gold-pasal-api
curl --fail --show-error https://api.<homelab-domain>/ready
```

## Practice

Use a reversible bad readiness configuration or known failing training image. State your hypothesis before inspection. Show that the failed pod receives no Service traffic and old capacity remains available. Diagnose with events and logs, then restore the previous digest through the declared release path.

<FailureWorkbench incident="The candidate never becomes Ready during the witnessed rollout." :hypotheses="['configuration reference is invalid', 'probe boundary is wrong', 'candidate image cannot start']" next-evidence="Correlate newest ReplicaSet events, pod conditions, previous logs, and EndpointSlices." />

<PredictThenRun prompt="What evidence will show traffic continuity during failure and complete recovery afterward?">

</PredictThenRun>

## Public evidence and pass criteria

```bash
uv run --project ../gold-pasal-course/checks pytest ../gold-pasal-course/checks/r8 --app-repo "$PWD"
kubectl rollout status deployment/gold-pasal-api
```

Pass only when the checks are green, the running digest matches the approved digest, smoke succeeds before and after recovery, secrets remain undisclosed, and the witness can explain why readiness—not liveness—protected traffic.

<EvidenceCard
  command="kubectl kustomize deploy/overlays/homelab | kubectl apply --dry-run=server -f -"
  artifact="rendered manifests, rollout status, and rollback evidence"
  invariant="unready workloads receive no traffic and credentials stay outside Git"
/>

<CareerSignal
  role="Python backend engineer with production AI skills"
  signal="rendered manifests, rollout status, and rollback evidence"
  interview-question="How do readiness, liveness, requests, limits, and rollout strategy interact?"
/>

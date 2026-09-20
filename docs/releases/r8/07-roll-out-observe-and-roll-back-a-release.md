---
id: r8-07
title: "Roll out, observe, and roll back a release"
release: r8
order: 7
prerequisites: [r8-06]
outcomes:
  - Apply roll out, observe, and roll back a release to the cumulative Gold Pasal system
  - Explain the resulting behavior and its failure boundary
evidence: [commit, ci-run]
---

<LessonMission
  role="homelab platform operator"
  problem="A new API image must roll out without dropping healthy traffic or hiding an invalid configuration."
  destination="Kubernetes converges to a constrained workload and exposes a tested rollback path."
/>

# Roll out, observe, and roll back a release


Changing the pod template creates a ReplicaSet. A RollingUpdate should add Ready pods before removing the old capacity, but Kubernetes cannot know whether the new checkout behavior is correct. You must observe both rollout mechanics and a user-facing signal.

## See the idea first

```yaml
strategy:
  type: RollingUpdate
  rollingUpdate:
    maxUnavailable: <availability-budget>
    maxSurge: <temporary-capacity-budget>
```

For a small homelab, integer values are easier to reason about than rounded percentages. `progressDeadlineSeconds` bounds how long a stuck rollout can remain ambiguous.

```bash
kubectl apply -k deploy/overlays/homelab
kubectl rollout status deployment/gold-pasal-api --timeout=5m
kubectl get rs,pods -l app=gold-pasal-api -w
kubectl rollout history deployment/gold-pasal-api
```

Status is the first gate, not the final proof. Follow it with a request through the Ingress and confirm the running `imageID` contains the promoted digest.

<FailureWorkbench incident="The new ReplicaSet never becomes available." :hypotheses="['image pull fails', 'startup or readiness fails', 'new resource request cannot be scheduled']" next-evidence="Describe the newest pod and read events plus previous logs before rolling back." />

## Roll back deliberately

In GitOps, revert the manifest commit to the previously verified digest. `kubectl rollout undo` is useful as an emergency drill, but it creates cluster state that Git will later overwrite. Record the previous digest before testing either path.

## Practice

Promote a known non-starting training image in a disposable namespace. Watch the old ReplicaSet continue serving because new pods never become Ready. Roll back to the recorded digest and repeat the smoke request.

<PredictThenRun prompt="During the failed rollout, how many old Ready endpoints must remain for the availability budget to hold?">

</PredictThenRun>

## Public evidence

```bash
kubectl rollout status deployment/gold-pasal-api
kubectl get pods -l app=gold-pasal-api -o jsonpath='{range .items[*]}{.status.containerStatuses[0].imageID}{"\n"}{end}'
```

Keep timestamps for failed rollout, endpoint continuity, rollback, and successful smoke test. That proves recovery, not merely eventual pod readiness.

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

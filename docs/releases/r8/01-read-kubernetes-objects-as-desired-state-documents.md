---
id: r8-01
title: "Read Kubernetes objects as desired-state documents"
release: r8
order: 1
prerequisites: []
outcomes:
  - Apply read kubernetes objects as desired-state documents to the cumulative Gold Pasal system
  - Explain the resulting behavior and its failure boundary
evidence: [commit, ci-run]
---

<LessonMission
  role="homelab platform operator"
  problem="A new API image must roll out without dropping healthy traffic or hiding an invalid configuration."
  destination="Kubernetes converges to a constrained workload and exposes a tested rollback path."
/>

# Read Kubernetes objects as desired-state documents


Gold Pasal's API should survive a node restart without somebody remembering a recovery command. Kubernetes does that by comparing **desired state**—the objects stored through its API—with observed state, then repeatedly reconciling the difference.

## See the idea first

A manifest is not a shell script. It does not say “create this container once.” Its `spec` says what should remain true; `status` reports what Kubernetes currently sees. Controllers keep working until the two agree.

Read this deliberately incomplete example:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: gold-pasal-api
spec:
  replicas: 2
  template:
    spec:
      containers:
        - name: api
          image: ghcr.io/example/gold-pasal@sha256:<digest>
```

`apiVersion` and `kind` select the contract. `metadata.name` gives this object an identity. `spec.replicas: 2` is the promise. The pod count may briefly be one, but the Deployment controller will try to restore two. The digest placeholder shows the required shape without giving you the course solution.

Use `kubectl explain deployment.spec` before copying fields from the internet. Then compare intent and observation:

```bash
kubectl get deployment gold-pasal-api -o yaml
kubectl get pods -l app=gold-pasal-api
kubectl describe deployment gold-pasal-api
```

The first command contains both `spec` and `status`. The second shows the pods selected by a label. The third combines conditions and events, which explain why convergence has or has not happened.

<FailureWorkbench incident="The Deployment asks for two replicas, but only one becomes Ready." :hypotheses="['the second pod cannot be scheduled', 'the container starts but its readiness check fails', 'the image cannot be pulled']" next-evidence="Compare Deployment conditions, pod status, and namespace events before editing the manifest." />

## Practice

Scale to three replicas, delete one pod, and watch the controller replace it. Do not delete the Deployment. Predict whether the replacement pod keeps the deleted pod's name.

<PredictThenRun prompt="After deleting one selected pod, which desired value stays constant and which observed values change?">

</PredictThenRun>

## Public evidence

Render first, then ask the cluster API to validate the result without persisting it:

```bash
kubectl kustomize deploy/overlays/homelab | kubectl apply --dry-run=server -f -
```

Keep the rendered output, the successful validation, and `kubectl get deployment -o wide` with your evidence. A client-side YAML parse is weaker: it cannot prove the cluster accepts the API fields.

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

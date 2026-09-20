---
id: r8-02
title: "Deploy immutable API images with Deployment and Service"
release: r8
order: 2
prerequisites: [r8-01]
outcomes:
  - Apply deploy immutable api images with deployment and service to the cumulative Gold Pasal system
  - Explain the resulting behavior and its failure boundary
evidence: [commit, ci-run]
---

<LessonMission
  role="homelab platform operator"
  problem="A new API image must roll out without dropping healthy traffic or hiding an invalid configuration."
  destination="Kubernetes converges to a constrained workload and exposes a tested rollback path."
/>

# Deploy immutable API images with Deployment and Service


The Gold Pasal API needs two separate Kubernetes jobs: a Deployment keeps healthy application pods running, while a Service gives those changing pods one stable network address.

## See the idea first

Pods are replaceable. Their names and IP addresses change. A Service selects pods by labels and publishes a stable virtual address. The selector must match the labels on the Deployment's pod template.

```yaml
spec:
  selector:
    matchLabels:
      app: gold-pasal-api
  template:
    metadata:
      labels:
        app: gold-pasal-api
    spec:
      containers:
        - name: api
          image: ghcr.io/example/gold-pasal@sha256:<digest>
```

The digest is part of the image identity. A tag such as `latest` can point to different bytes tomorrow; a `sha256` digest cannot. Kubernetes can therefore report exactly which artifact is running.

Now inspect the Service shape without copying a finished resource:

```yaml
spec:
  selector:
    app: gold-pasal-api
  ports:
    - name: http
      port: <service-port>
      targetPort: <named-container-port>
```

`port` is what clients call. `targetPort` is where the Uvicorn process serves the FastAPI app. A named container port makes accidental port drift easier to review.

## Follow traffic

```bash
kubectl get deploy,rs,pods,svc
kubectl get endpointslice -l kubernetes.io/service-name=gold-pasal-api
kubectl get pod -l app=gold-pasal-api \
  -o jsonpath='{range .items[*]}{.status.podIP}{"\n"}{end}'
```

EndpointSlice addresses should correspond to Ready selected pods. If there are pods but no endpoints, inspect selector labels and readiness before blaming DNS.

<FailureWorkbench incident="The Service exists, but requests time out." :hypotheses="['selector matches no pods', 'pods are not Ready', 'targetPort does not reach Uvicorn']" next-evidence="Inspect EndpointSlices, then compare Service selectors with pod labels and container ports." />

## Practice

Temporarily change one Service selector value in a disposable branch or namespace. Predict the EndpointSlice result, render and apply it, then restore the selector. Do not “fix” the drill by exposing pods directly.

<PredictThenRun prompt="Will the Service object remain present when its selector matches zero pods, and what will its endpoints show?">

</PredictThenRun>

## Public evidence

```bash
kubectl kustomize deploy/overlays/homelab | kubectl apply --dry-run=server -f -
kubectl rollout status deployment/gold-pasal-api
kubectl get endpointslice -l kubernetes.io/service-name=gold-pasal-api
```

Record the promoted digest from the rendered Deployment and at least one Ready endpoint. That links immutable artifact identity to routable workload state.

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

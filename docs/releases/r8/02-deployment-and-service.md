---
id: r8-02
title: "Deployment and Service"
release: r8
order: 2
prerequisites: [r8-01]
outcomes:
  - Apply a Deployment that uses gold-pasal-api:r7
  - Apply a ClusterIP Service and reach /health through kubectl port-forward
evidence: [deployment]
---

<LessonMission
  role="platform operator"
  problem="kind is empty. The Gold Pasal image exists only as a Docker image on the laptop."
  destination="A Deployment runs one API replica and a Service publishes port 8000 inside the cluster."
/>

# Deployment and Service

Put manifests under `deploy/kind/`. `imagePullPolicy: Never` tells Kubernetes to use the image you loaded with `kind load`. A **Deployment** owns a ReplicaSet, which owns Pods. A **Service** selects those Pods by labels.

## See the idea first

From `gold-pasal`:

```bash
mkdir -p deploy/kind && ls deploy/kind
```

```text

```

Empty is expected. The next files are `deployment.yaml` and `service.yaml`.

## Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: gold-pasal-api
spec:
  replicas: 1
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
          image: gold-pasal-api:r7
          imagePullPolicy: Never
          ports:
            - containerPort: 8000
```

You will add env, probes, and resources on later pages. Apply:

```bash
kubectl apply -f deploy/kind/deployment.yaml -f deploy/kind/service.yaml
kubectl rollout status deployment/gold-pasal-api
kubectl port-forward svc/gold-pasal-api 8000:8000
```

In another terminal, `curl -s http://127.0.0.1:8000/health`. Postgres is not in the cluster yet; /ready may fail. That is expected until you add a Postgres Deployment or point at the Compose database with `extraHosts`. For this page, /health is enough.

The Service YAML uses `selector: { app: gold-pasal-api }` and `port: 8000`. If the selector does not match Pod labels, `kubectl get endpoints` stays empty.

## If it fails

| What you see | Cause | Fix |
| --- | --- | --- |
| ErrImageNeverPull | image not loaded into kind | `kind load docker-image gold-pasal-api:r7 --name gold-pasal` |
| endpoints none | label mismatch | Match Deployment template labels to Service selector |

## Practice

<LessonQuiz
  question="Why imagePullPolicy Never on kind?"
  a="So Kubernetes always downloads from Docker Hub"
  b="So the cluster uses the image you loaded locally"
  c="So the Pod runs as root"
  d="So Ingress works"
  correct="b"
>

kind has no GHCR credentials yet. You loaded the R7 tag. Never means do not try a pull.

</LessonQuiz>

Next: [Ingress on kind](03-ingress-on-kind).

<EvidenceCard
  command="kubectl rollout status deployment/gold-pasal-api"
  artifact="Deployment and Service YAML under deploy/kind"
  invariant="Pods are replaceable. The Service name stays."
/>

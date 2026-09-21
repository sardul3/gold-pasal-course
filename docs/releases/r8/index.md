---
title: "R8: Kubernetes on kind"
description: "A local kind cluster runs the API with Deployment, Service, Ingress, probes, and a tested rollback."
---

# R8: Kubernetes on kind

**What you'll have:** a kind cluster; Deployment, Service, and Ingress for the R7 image; ConfigMap and Secret; probes; a rollout undo; a short debug runbook.

<LessonMission
  role="platform operator"
  problem="A new API image must roll out without dropping healthy traffic or hiding an invalid configuration."
  destination="kind converges to a constrained workload and you can undo a bad revision."
/>

## Before you start

You finished [R7](/releases/r7/): `docker compose up --build --wait` and `/ready` is 200. Prove it, then install `kind` and `kubectl`.

Homelab hardware is not required. Optional overlays live in [Homelab and Kustomize](/side-quests/homelab-kustomize-overlay). The objects you learn here are the same ones EKS and GKE expose.

## Guide

| Page | You will be able to |
| --- | --- |
| [kind cluster and Kubernetes objects](01-kind-cluster-and-kubernetes-objects) | create the cluster and name Pod, Deployment, Service, Ingress |
| [Deployment and Service](02-deployment-and-service) | run the R7 image and port-forward /health |
| [Ingress on kind](03-ingress-on-kind) | curl gold-pasal.local |
| [ConfigMaps and Secrets](04-configmaps-and-secrets) | inject Settings without committing tokens |
| [Probes, requests, and limits](05-probes-requests-and-limits) | fail readiness when /ready fails |
| [Roll out and roll back](06-roll-out-and-roll-back) | undo a bad template |
| [Debug Pending and CrashLoop](07-debug-pending-and-crashloop) | read Events and logs |
| [Release gate: kind rollout drill](08-release-gate-kind-rollout-drill) | apply, break, undo, curl |

## Release evidence

```bash
kubectl apply -f deploy/kind/
kubectl rollout status deployment/gold-pasal-api
```

## What R9 starts from

Manifests in Git and a working kind cluster. R9 builds once to GHCR and pins a digest. Argo CD is a side quest, not a gate.

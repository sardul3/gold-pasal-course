---
title: Homelab and Kustomize overlay
description: Optional Kubernetes overlays for people who already have a homelab cluster.
---

# Homelab and Kustomize overlay

This page is optional. [R8](/releases/r8/) uses a local kind cluster. Finish that gate before you start here.

If you already run a metal or VM cluster, you can add a Kustomize overlay that changes replica count, Ingress host, and image pull secrets without forking the kind base.

## What you'll have

`deploy/base` with the same Deployment, Service, and probes as kind. `deploy/overlays/kind` and `deploy/overlays/homelab` that patch host names and replica counts. `kubectl kustomize deploy/overlays/homelab` renders YAML you can apply on your cluster.

## Before you start

kind already applies files from `deploy/kind/`. Either move those files to `deploy/base` and point both overlays at them, or copy them. Do not maintain two unrelated Deployments.

You need `kubectl` access to the homelab and an Ingress class name. This course does not provision that hardware.

## Overlay shape

```text
deploy/
  base/
    deployment.yaml
    service.yaml
    kustomization.yaml
  overlays/
    kind/
      kustomization.yaml
    homelab/
      kustomization.yaml
      ingress-patch.yaml
```

Homelab `kustomization.yaml` sets `replicas`, `ingressClassName`, and a pull secret for GHCR. It does not add network policies unless you already know you need them; those are easy to get wrong and are not an R8 gate.

## Apply

```bash
kubectl kustomize deploy/overlays/homelab
kubectl apply -k deploy/overlays/homelab
```

Rollout and undo stay the same kubectl commands as R8. Image digests still come from [R9](/releases/r9/).

## What this is not

This is not a substitute for kind. Reviewers of the core path should see kind evidence. Homelab screenshots are extra.

GitOps with Argo CD is a separate optional page: [Argo CD GitOps](/side-quests/argo-cd-gitops).

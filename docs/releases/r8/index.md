---
title: "R8 — Gold Pasal on homelab Kubernetes"
description: "A constrained, observable workload with a tested rollback path."
---

# R8 — Gold Pasal on homelab Kubernetes

**Release promise:** A constrained, observable workload with a tested rollback path.

<LessonMission
  role="homelab platform operator"
  problem="A new API image must roll out without dropping healthy traffic or hiding an invalid configuration."
  destination="Kubernetes converges to a constrained workload and exposes a tested rollback path."
/>

## Lessons

1. [Read Kubernetes objects as desired-state documents](01-read-kubernetes-objects-as-desired-state-documents)
2. [Deploy immutable API images with Deployment and Service](02-deploy-immutable-api-images-with-deployment-and-service)
3. [Route traffic through the homelab Ingress](03-route-traffic-through-the-homelab-ingress)
4. [Manage configuration and secrets without committing credentials](04-manage-configuration-and-secrets-without-committing-credentials)
5. [Configure probes, requests, limits, and graceful shutdown](05-configure-probes-requests-limits-and-graceful-shutdown)
6. [Package environments with Kustomize](06-package-environments-with-kustomize)
7. [Roll out, observe, and roll back a release](07-roll-out-observe-and-roll-back-a-release)
8. [Diagnose Pending, CrashLoopBackOff, and unavailable Service scenarios](08-diagnose-pending-crashloopbackoff-and-unavailable-service-scenarios)
9. [Handle migrations and dependent services safely](09-handle-migrations-and-dependent-services-safely)
10. [Add network and workload security controls appropriate to the homelab](10-add-network-and-workload-security-controls-appropriate-to-the-homelab)
11. [Release gate: perform a witnessed rollout and recovery drill](11-release-gate-perform-a-witnessed-rollout-and-recovery-drill)

## Release evidence

Run `kubectl kustomize deploy/overlays/homelab | kubectl apply --dry-run=server -f -` and preserve rendered manifests, rollout status, and rollback evidence. At the review, defend this
invariant: **unready workloads receive no traffic and credentials stay outside Git.**

<ArchitectureTrail
  before="A new API image must roll out without dropping healthy traffic or hiding an invalid configuration."
  decision="Introduce only the boundary and mechanism needed by this release."
  after="Kubernetes converges to a constrained workload and exposes a tested rollback path."
/>

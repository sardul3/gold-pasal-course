---
title: "R9: Delivery"
description: "CI builds one image to GHCR, scans it, deploys by digest, and rolls back by digest."
---

# R9: Delivery

**What you'll have:** a test matrix on GitHub Actions; one image per commit on GHCR; SBOM and scan on that digest; kind manifests that name the digest; smoke; rollback by reverting the digest.

<LessonMission
  role="delivery owner"
  problem="A reviewed commit needs a traceable route to a running image without kubectl set image from CI."
  destination="CI publishes one digest; Git records it; kind runs it; rollback is the previous digest."
/>

## Before you start

You finished [R8](/releases/r8/): kind runs the API, Ingress answers, undo works. R6 already runs inventory in CI. This release publishes the container and pins it.

Argo CD is a [side quest](/side-quests/argo-cd-gitops). The VitePress course already deploys from this documentation repository; do not treat that as gold-pasal evidence.

## Guide

| Page | You will be able to |
| --- | --- |
| [Test matrix in GitHub Actions](01-test-matrix-in-github-actions) | unit, inventory, and smoke jobs |
| [Build once to GHCR](02-build-once-to-ghcr) | publish a SHA-tagged digest |
| [Scans and provenance](03-scans-and-provenance) | SBOM, Trivy, attestation |
| [Deploy by manifest change](04-deploy-by-manifest-change) | bump the digest in Git |
| [Smoke after deploy](05-smoke-after-deploy) | curl /ready after apply |
| [Roll back by digest](06-roll-back-by-digest) | revert without rebuilding |
| [Release gate: commit to running image](07-release-gate-commit-to-running-image) | one SHA matches the Pod |

## Release evidence

```bash
gh run watch --exit-status
./scripts/smoke-kind.sh
```

## What R10 starts from

A digest-pinned API. The assistant talks to that API. CI still never calls paid model providers.

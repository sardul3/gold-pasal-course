---
title: "R9 — CI/CD and GitOps delivery"
description: "A traceable path from reviewed change to immutable homelab release."
---

# R9 — CI/CD and GitOps delivery

**Release promise:** A traceable path from reviewed change to immutable homelab release.

<LessonMission
  role="delivery owner"
  problem="A reviewed commit needs a traceable route to the homelab without giving GitHub broad access to the private network."
  destination="CI publishes one immutable artifact and Argo CD pulls a reviewed desired state."
/>

## Lessons

1. [Turn the local quality command into GitHub Actions jobs](01-turn-the-local-quality-command-into-github-actions-jobs)
2. [Cache dependencies without hiding reproducibility problems](02-cache-dependencies-without-hiding-reproducibility-problems)
3. [Run unit, integration, contract, migration, and container smoke gates](03-run-unit-integration-contract-migration-and-container-smoke-gates)
4. [Build once and publish an immutable image to GHCR](04-build-once-and-publish-an-immutable-image-to-ghcr)
5. [Add dependency, secret, image, and provenance checks](05-add-dependency-secret-image-and-provenance-checks)
6. [Promote by reviewed manifest change, not an imperative cluster command](06-promote-by-reviewed-manifest-change-not-an-imperative-cluster-command)
7. [Let Argo CD pull the approved homelab state](07-let-argo-cd-pull-the-approved-homelab-state)
8. [Run post-deployment smoke checks and surface failure clearly](08-run-post-deployment-smoke-checks-and-surface-failure-clearly)
9. [Roll back by Git history and verified image digest](09-roll-back-by-git-history-and-verified-image-digest)
10. [Build and deploy the VitePress course independently to GitHub Pages](10-build-and-deploy-the-vitepress-course-independently-to-github-pages)
11. [Release gate: trace one commit from PR to running homelab release](11-release-gate-trace-one-commit-from-pr-to-running-homelab-release)

## Release evidence

Run `gh run watch --exit-status` and preserve a PR, green workflow, image digest, GitOps diff, and deployment smoke result. At the review, defend this
invariant: **build once, promote by digest, and roll back through reviewed Git history.**

<ArchitectureTrail
  before="A reviewed commit needs a traceable route to the homelab without giving GitHub broad access to the private network."
  decision="Introduce only the boundary and mechanism needed by this release."
  after="CI publishes one immutable artifact and Argo CD pulls a reviewed desired state."
/>

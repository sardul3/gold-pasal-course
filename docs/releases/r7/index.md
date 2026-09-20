---
title: "R7 — Containerized Gold Pasal"
description: "A small, non-root image and reproducible local production stack."
---

# R7 — Containerized Gold Pasal

**Release promise:** A small, non-root image and reproducible local production stack.

<LessonMission
  role="release engineer"
  problem="The API works in a developer shell but starts as root and depends on unrecorded machine state."
  destination="One small image runs predictably with explicit configuration and health behavior."
/>

## Lessons

1. [Understand image, container, process, port, and volume through the API](01-understand-image-container-process-port-and-volume-through-the-api)
2. [Build a small multi-stage Python image](02-build-a-small-multi-stage-python-image)
3. [Run as non-root with a read-only-friendly filesystem](03-run-as-non-root-with-a-read-only-friendly-filesystem)
4. [Configure the app through environment variables](04-configure-the-app-through-environment-variables)
5. [Compose API and PostgreSQL for local production simulation](05-compose-api-and-postgresql-for-local-production-simulation)
6. [Distinguish startup, liveness, and readiness checks](06-distinguish-startup-liveness-and-readiness-checks)
7. [Persist and restore database data](07-persist-and-restore-database-data)
8. [Scan the image and generate an SBOM](08-scan-the-image-and-generate-an-sbom)
9. [Release gate: rebuild and run the stack on a clean machine](09-release-gate-rebuild-and-run-the-stack-on-a-clean-machine)

## Release evidence

Run `docker compose up --build --wait` and preserve an image digest, SBOM, scan result, and clean-machine smoke transcript. At the review, defend this
invariant: **the image is immutable, non-root, and contains no development secrets.**

<ArchitectureTrail
  before="The API works in a developer shell but starts as root and depends on unrecorded machine state."
  decision="Introduce only the boundary and mechanism needed by this release."
  after="One small image runs predictably with explicit configuration and health behavior."
/>

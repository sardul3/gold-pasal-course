---
title: "R7: Containerized Gold Pasal"
description: "A small, non-root image and a Compose stack that starts the same way on a clean machine."
---

# R7: Containerized Gold Pasal

**What you'll have:** a multi-stage non-root image; `docker compose up --build --wait` starting API and PostgreSQL; `/health` cheap; `/ready` pinging the database; catalog rows on a named volume.

<LessonMission
  role="release engineer"
  problem="The API works in a developer shell but starts as root and depends on unrecorded machine state."
  destination="One small image runs with explicit environment variables, and Compose starts the same stack on a clean machine."
/>

## Before you start

You finished [R6](/releases/r6/): a merged PR, `application-ci` with PostgreSQL, request ids, `/ready`, JSON logs. Prove it from `gold-pasal`:

```bash
./scripts/verify.sh | tail -1
```

Install Docker Engine or Docker Desktop. This release does not change pricing, holds, or checkout.

Image scans and SBOMs move to [R9](/releases/r9/). Kubernetes waits for [R8](/releases/r8/).

## Guide

| Page | You will be able to |
| --- | --- |
| [Image, container, process, port, volume](01-image-container-process-port-volume) | name the five objects for this API |
| [Multi-stage image as non-root](02-multi-stage-image-as-non-root) | build an image that runs as uid 10001 |
| [Configure with environment variables](03-configure-with-environment-variables) | inject Settings at run time |
| [Compose API and PostgreSQL](04-compose-api-and-postgresql) | start both with one command |
| [Startup, liveness, and readiness](05-startup-liveness-and-readiness) | fail /ready when Postgres is down |
| [Persist and restore database data](06-persist-and-restore-database-data) | keep rows on a named volume |
| [Release gate: clean-machine stack](07-release-gate-clean-machine-stack) | rebuild from git and Docker only |

## Release evidence

```bash
docker compose up --build --wait
curl --fail http://127.0.0.1:8000/ready
```

## What R8 starts from

The same image, now scheduled on a local kind cluster. It does not reopen Git, pricing, or checkout.

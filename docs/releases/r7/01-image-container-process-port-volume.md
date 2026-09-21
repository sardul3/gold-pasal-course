---
id: r7-01
title: "Image, container, process, port, volume"
release: r7
order: 1
prerequisites: []
outcomes:
  - Name image, container, process, port, and volume for this API
  - Map host port 8000 to the process that serves /health
evidence: [commit]
---

<LessonMission
  role="release engineer"
  problem="The API runs in a venv on this laptop. A teammate clones gold-pasal and has no idea which process, port, or database files they are supposed to start."
  destination="You can name the five objects for Gold Pasal and prove /health answers on a published port."
/>

# Image, container, process, port, volume

Gold Pasal currently starts because this machine already has Python packages and a PostgreSQL data directory. A **container** is one running instance of an **image** (a read-only filesystem plus a start command). The container's main **process** is uvicorn. A **port** is the number a client dials. A **volume** keeps database files when the container is replaced.

## See the idea first

From `gold-pasal`:

```bash
docker --version && curl -s -o /dev/null -w '%{http_code}\n' http://127.0.0.1:8000/health || true
```

```text
Docker version 27.x.x
200
```

If curl prints `000`, uvicorn is not running; that is fine on this page. You are listing the objects, not shipping the image yet. Docker Desktop or Engine must be installed before R7-02.

## Five objects on this shop

For `curl http://127.0.0.1:8000/health` after R7 compose is up:

```text
host port 8000 -> container port 8000 -> uvicorn process -> GET /health
```

The image holds `src/gold_pasal` and the frozen dependencies. The volume holds PostgreSQL's data directory. Deleting the API container does not delete the image or the volume. Deleting the volume does delete catalog rows.

Draw that picture once on paper: API image, API container, uvicorn, published port, Postgres volume. You will type it into a Dockerfile on the next page.

This release does not change pricing, holds, or checkout. It packages the same process you ran in R6.

## If it fails

| What you see | Cause | Fix |
| --- | --- | --- |
| `docker: command not found` | Engine not installed | Install Docker Desktop or Engine; reopen the terminal |
| curl `000` | Nothing listening on 8000 | Expected if compose is not up; continue to the image page |

## Practice

<LessonQuiz
  question="You delete only the API container. What remains?"
  a="Nothing; image, port mapping, and volume all vanish"
  b="The image and the Postgres volume; the published port mapping is gone with the container"
  c="Only the port mapping"
  d="Only the running uvicorn process"
  correct="b"
>

A container is an instance. The image is still on disk. A named volume lives until you remove it. Port publication belongs to that container, so it goes away when the container does.

</LessonQuiz>

Next: [Multi-stage image as non-root](02-multi-stage-image-as-non-root).

<EvidenceCard
  command="docker --version"
  artifact="a labelled sketch of image, container, process, port, and volume"
  invariant="An image does not include the laptop venv. Data that must survive a replace lives on a volume."
/>

---
id: r7-02
title: "Multi-stage image as non-root"
release: r7
order: 2
prerequisites: [r7-01]
outcomes:
  - Write a multi-stage Dockerfile with a runtime user that is not root
  - Build and run the image so /health returns 200
evidence: [commit, ci-run]
---

<LessonMission
  role="release engineer"
  problem="A one-stage Dockerfile copies uv's cache, runs as root, and weighs more than a gigabyte. That image is slow to pull and dangerous if it is ever exposed."
  destination="A two-stage Dockerfile that runs uvicorn as a non-root user and serves GET /health."
/>

# Multi-stage image as non-root

A **multi-stage** build uses one stage to install dependencies and a second, smaller stage to copy only what runtime needs. The process inside must not be uid 0. Gold Pasal already reads settings from the environment (R5); the image should not bake `.env` into a layer.

## See the idea first

From `gold-pasal`:

```bash
mkdir -p docker && ls Dockerfile 2>/dev/null || echo 'no Dockerfile yet'
```

```text
no Dockerfile yet
```

Create `Dockerfile` at the shop root. Stage `builder` uses the official Python 3.12 image, copies `pyproject.toml` and `uv.lock`, and runs `uv sync --frozen --no-dev`. Stage `runtime` copies `.venv` and `src` only.

## Dockerfile shape

```dockerfile
FROM python:3.12-slim AS builder
COPY --from=ghcr.io/astral-sh/uv:0.7.12 /uv /usr/local/bin/uv
WORKDIR /app
COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-dev
COPY src src

FROM python:3.12-slim
RUN useradd --create-home --uid 10001 gold
WORKDIR /app
COPY --from=builder /app /app
USER gold
ENV PATH="/app/.venv/bin:$PATH"
EXPOSE 8000
CMD ["uvicorn", "gold_pasal.api.app:app", "--host", "0.0.0.0", "--port", "8000"]
```

Pin the uv image digest in your file when you have it from `docker pull`. Do not `COPY .env`. Do not install gcc in the runtime stage.

Build and run:

```bash
docker build -t gold-pasal-api:r7 .
docker run --rm -p 8000:8000 --env-file .env gold-pasal-api:r7
```

In another terminal: `curl -s http://127.0.0.1:8000/health`. You should see JSON with `"status": "ok"`. Then `docker exec` into the running container and run `id`. It must not print `uid=0`.

`.dockerignore` should list `.venv`, `.env`, `tests`, and `.git` so those never enter a layer.

## If it fails

| What you see | Cause | Fix |
| --- | --- | --- |
| build fails on `uv sync` | lockfile out of date | Run `uv lock` on the laptop, commit, rebuild |
| `uid=0(root)` | missing USER | Add `useradd` and `USER gold` in the runtime stage |
| container exits at once | missing env vars | Pass `--env-file .env`; database URL may still fail until Compose |

## Practice

<LessonQuiz
  question="Why copy only src and .venv into the runtime stage?"
  a="So the image includes tests and .git history"
  b="So the running image stays small and has no build tools or secrets"
  c="So root can write anywhere"
  d="So uv can re-resolve packages at start"
  correct="b"
>

The builder stage is discarded. Runtime needs the app and the frozen virtualenv, not compilers, caches, or `.env`.

</LessonQuiz>

Next: [Configure with environment variables](03-configure-with-environment-variables).

<EvidenceCard
  command="docker run --rm gold-pasal-api:r7 id"
  artifact="Dockerfile plus an image that runs as uid 10001"
  invariant="The image is immutable, non-root, and contains no .env file."
/>

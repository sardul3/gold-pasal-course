---
id: r7-07
title: "Release gate: clean-machine stack"
release: r7
order: 7
prerequisites: [r7-06]
outcomes:
  - Rebuild the stack from a clean checkout
  - Demo /health, /ready, and a missing-SKU 404 with a request id
evidence: [commit, ci-run, demo]
---

<LessonMission
  role="release engineer"
  problem="A reviewer cannot tell whether Gold Pasal needs this laptop's venv or the committed Dockerfile."
  destination="On a machine with only Docker and the git checkout, compose up serves /health and /ready."
/>

# Release gate: clean-machine stack

This is the release gate. Someone else should be able to clone `gold-pasal`, copy `.env.example` to `.env` with local tokens, and start the shop with Compose. Image scans and SBOMs wait for R9, when you publish to GHCR.

## See the idea first

From `gold-pasal`:

```bash
docker compose down && docker compose up --build --wait && curl -s -o /dev/null -w '%{http_code}\n' http://127.0.0.1:8000/ready
```

```text
200
```

`--build` rebuilds the API image from the Dockerfile. `/ready` must be 200 only after Postgres accepts connections.

## Demo script

1. `docker compose up --build --wait`
2. `curl -s -D - http://127.0.0.1:8000/health` and show `x-request-id`
3. `curl -s -D - http://127.0.0.1:8000/ready`
4. `curl -s http://127.0.0.1:8000/api/catalog/GP-DOES-NOT-EXIST` is problem JSON, no traceback
5. `docker compose exec api id` is not root

Record the image id: `docker images gold-pasal-api:r7 -q`.

If you still launch uvicorn from the host venv for day-to-day tests, say so. The gate is that the Compose path works without that venv.

R8 will take this image onto a local Kubernetes cluster (kind). Homelab hardware is optional; see the side quest after R8.

## If it fails

| What you see | Cause | Fix |
| --- | --- | --- |
| /ready never 200 | migration not applied | Run alembic in an init container or a documented one-shot |
| works only with host uvicorn | Compose file unused | Fix the image CMD and env |

## Practice

<LessonQuiz
  question="What must a clean machine have to pass this gate?"
  a="Your laptop .venv copied over scp"
  b="Docker, the git checkout, and a filled .env from .env.example"
  c="A homelab rack"
  d="kind and kubectl"
  correct="b"
>

kind is R8. This gate is the container stack. Secrets stay in `.env`, which is not committed.

</LessonQuiz>

<EvidenceCard
  command="docker compose up --build --wait && curl --fail http://127.0.0.1:8000/ready"
  artifact="compose transcript, image id, /ready 200, non-root id"
  invariant="The committed Dockerfile and compose.yaml start the shop. The laptop venv is not required."
/>

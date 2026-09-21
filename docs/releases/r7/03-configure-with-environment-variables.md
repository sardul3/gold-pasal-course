---
id: r7-03
title: "Configure with environment variables"
release: r7
order: 3
prerequisites: [r7-02]
outcomes:
  - Pass Settings through environment variables into the container
  - Show that a missing DATABASE_URL fails closed at startup or /ready
evidence: [commit, ci-run]
---

<LessonMission
  role="release engineer"
  problem="The container starts, then dies because DATABASE_URL points at localhost inside the container, which is the container itself, not Postgres on the laptop."
  destination="Settings come from the environment. A wrong URL fails /ready, not a baked-in laptop hostname."
/>

# Configure with environment variables

R5 already loads `Settings` from the environment with pydantic-settings. Inside a container, `localhost` is that container. The database host will be the Compose service name `postgres` once both run together. This page proves the app reads `GOLD_PASAL_DATABASE_URL` from the process environment, not from a file copied into the image.

## See the idea first

From `gold-pasal`:

```bash
docker inspect gold-pasal-api:r7 | python3 -c "import json,sys; print('\\n'.join(json.load(sys.stdin)[0]['Config']['Env'][:12]))"
```

```text
PATH=/app/.venv/bin:/usr/local/bin:...
```

You should not see tokens or a database URL in `Config.Env` from the image. Those values are supplied at `docker run` or in Compose.

## Pass config at run time

```bash
docker run --rm -p 8000:8000 \
  -e GOLD_PASAL_DATABASE_URL=postgresql+psycopg://gold:gold@127.0.0.1:5432/gold_pasal \
  -e GOLD_PASAL_STAFF_TOKEN=dev-staff \
  -e GOLD_PASAL_CUSTOMER_TOKEN=dev-customer \
  gold-pasal-api:r7
```

That URL still will not reach Postgres on the host unless you use `host.docker.internal` on Docker Desktop, or you wait for Compose on the next page. The point is the flag: change the URL without rebuilding.

Add a failing test that constructs `Settings` with an empty database URL and expects a validation error. Do not read `.env` inside the image. Document every key in `.env.example` with no values that are secrets.

If a setting has a default that only works on a laptop (`localhost`), delete that default for container runs or override it explicitly.

## If it fails

| What you see | Cause | Fix |
| --- | --- | --- |
| connection refused to 127.0.0.1 | localhost inside the container | Use the Compose service name, or host.docker.internal for a laptop-only debug |
| token missing | env not passed | Use `--env-file` or Compose `environment:` |

## Practice

<LessonQuiz
  question="Where should GOLD_PASAL_DATABASE_URL live for a container?"
  a="Hard-coded in Settings with localhost"
  b="In a layer COPY of .env"
  c="In the process environment supplied at run time"
  d="In the Dockerfile ENV with the production password"
  correct="c"
>

Images are copied and cached. Secrets and hostnames belong at run time. R5 Settings already reads the environment.

</LessonQuiz>

Next: [Compose API and PostgreSQL](04-compose-api-and-postgresql).

<EvidenceCard
  command="docker inspect gold-pasal-api:r7"
  artifact="runtime env documented in .env.example, no secrets in the image"
  invariant="Rebuilding is not how you point the API at a different database."
/>

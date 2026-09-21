---
id: r7-04
title: "Compose API and PostgreSQL"
release: r7
order: 4
prerequisites: [r7-03]
outcomes:
  - Declare api and postgres services in compose.yaml
  - Bring the stack up with a single compose command
evidence: [commit, ci-run]
---

<LessonMission
  role="release engineer"
  problem="You can start the API image, but Postgres is still the laptop Compose from R4, and the two stacks fight over port 5432."
  destination="One `docker compose up --build --wait` starts API and Postgres together, and /health is 200."
/>

# Compose API and PostgreSQL

**Compose** is a YAML file that names services, images, ports, and volumes so you start them as one stack. R4 already used Compose for Postgres alone. Extend that file: the `api` service builds from the Dockerfile, depends on `postgres`, and sets `GOLD_PASAL_DATABASE_URL` to host `postgres`.

## See the idea first

From `gold-pasal`:

```bash
head -20 compose.yaml
```

```text
services:
  postgres:
    image: postgres:16
    ...
```

Keep the R4 postgres service. Add `api`. Do not run two Postgres instances on 5432.

## Wire the API to the service name

```yaml
  api:
    build: .
    image: gold-pasal-api:r7
    ports:
      - "8000:8000"
    environment:
      GOLD_PASAL_DATABASE_URL: postgresql+psycopg://gold:gold@postgres:5432/gold_pasal
      GOLD_PASAL_STAFF_TOKEN: ${GOLD_PASAL_STAFF_TOKEN}
      GOLD_PASAL_CUSTOMER_TOKEN: ${GOLD_PASAL_CUSTOMER_TOKEN}
    depends_on:
      postgres:
        condition: service_healthy
```

The hostname `postgres` is DNS inside the Compose network. Tokens still come from your host `.env` via substitution. Postgres should already have a healthcheck from R4.

```bash
docker compose up --build --wait
curl -s http://127.0.0.1:8000/health
```

You should see `"status": "ok"`. Run `alembic upgrade head` as a one-shot if the API does not migrate on boot yet; a later page can add a start command that migrates, but do not hide a failed migration behind a 200 from /health.

## If it fails

| What you see | Cause | Fix |
| --- | --- | --- |
| port 5432 already allocated | laptop Postgres still running | Stop the old compose project or the host Postgres |
| could not translate host postgres | api not on the Compose network | Declare both services in the same compose.yaml |

## Practice

<LessonQuiz
  question="Why is the database host postgres, not localhost?"
  a="Compose always aliases localhost to postgres"
  b="On the Compose network, postgres is the DNS name of that service"
  c="pydantic-settings rewrites localhost"
  d="Kubernetes requires that name"
  correct="b"
>

Each Compose project gets a network. Service names resolve there. localhost would be the API container.

</LessonQuiz>

Next: [Startup, liveness, and readiness](05-startup-liveness-and-readiness).

<EvidenceCard
  command="docker compose up --build --wait && curl -s http://127.0.0.1:8000/health"
  artifact="compose.yaml with api and postgres"
  invariant="One command starts the same two processes a teammate would start."
/>

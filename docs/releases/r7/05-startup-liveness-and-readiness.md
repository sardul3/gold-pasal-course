---
id: r7-05
title: "Startup, liveness, and readiness"
release: r7
order: 5
prerequisites: [r7-04]
outcomes:
  - Keep /health as liveness and /ready as a database ping
  - Show compose or curl failing ready when Postgres is stopped
evidence: [commit, ci-run]
---

<LessonMission
  role="release engineer"
  problem="/health returns 200 while the database is down, so a load balancer would keep sending checkout traffic at a process that cannot take a hold."
  destination="GET /ready fails when Postgres is unreachable. /health stays a cheap process check."
/>

# Startup, liveness, and readiness

R6 already added `GET /ready`. In a container, that route is how an orchestrator decides whether the process may receive traffic. **Liveness** asks "should we kill this process?" **Readiness** asks "may we send it requests?" **Startup** covers a slow first boot. Gold Pasal uses /health for liveness and /ready for readiness.

## See the idea first

From `gold-pasal`:

```bash
curl -s -o /dev/null -w '%{http_code}\n' http://127.0.0.1:8000/health && curl -s -o /dev/null -w '%{http_code}\n' http://127.0.0.1:8000/ready
```

```text
200
200
```

Both 200 with the stack up. Next you stop only Postgres and watch /ready change.

## Stop the database

```bash
docker compose stop postgres
curl -s -o /dev/null -w '%{http_code}\n' http://127.0.0.1:8000/health
curl -s -o /dev/null -w '%{http_code}\n' http://127.0.0.1:8000/ready
```

Expect 200 then 503 (or 500, if that is what your handler returns; pick 503 and problem details). /health must not query Postgres. /ready must.

In `compose.yaml`, add:

```yaml
    healthcheck:
      test: ["CMD", "curl", "-f", "http://127.0.0.1:8000/ready"]
      interval: 5s
      retries: 12
```

A Compose healthcheck on `api` that hits /health would mark the service healthy with a dead database. Use /ready.

Start postgres again: `docker compose start postgres`. Wait until /ready is 200 before you continue.

## If it fails

| What you see | Cause | Fix |
| --- | --- | --- |
| /ready still 200 with postgres stopped | handler does not ping the database | SELECT 1 through the engine; return 503 on failure |
| /health becomes 503 too | you pointed health at the database | Keep /health cheap |

## Practice

<LessonQuiz
  question="A load balancer should take the API out of rotation when which check fails?"
  a="/health"
  b="/ready"
  c="docker ps"
  d="pytest"
  correct="b"
>

Readiness means "fit for traffic." Liveness means "the process is still alive." Killing a process that is only waiting on Postgres makes restarts worse.

</LessonQuiz>

Next: [Persist and restore database data](06-persist-and-restore-database-data).

<EvidenceCard
  command="docker compose stop postgres; curl -s -o /dev/null -w '%{http_code}\n' http://127.0.0.1:8000/ready"
  artifact="503 from /ready with postgres stopped; 200 from /health"
  invariant="Unready processes receive no traffic. A live process may still be unready."
/>

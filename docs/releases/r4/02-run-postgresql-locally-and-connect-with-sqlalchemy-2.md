---
id: r4-02
title: "Run PostgreSQL locally and connect with SQLAlchemy 2"
release: r4
order: 2
prerequisites: [r4-01]
outcomes:
  - Apply run postgresql locally and connect with sqlalchemy 2 to the cumulative Gold Pasal system
  - Explain the resulting behavior and its failure boundary
evidence: [commit, ci-run]
---

<LessonMission
  role="inventory manager"
  problem="Two staff members try to reserve the same serialized necklace at nearly the same time."
  destination="Exactly one active hold commits and the loser receives an expected conflict."
/>

# Run PostgreSQL locally and connect with SQLAlchemy 2


This is step 2 of 11. Keep earlier behavior green. You write the failing tests first and all production code; the lesson supplies contracts and reasoning, not a solved application.

## See the idea first

Your Java instincts may suggest an embedded database for speed. That is unsafe for this release: H2 and SQLite do not reproduce PostgreSQL row locks, partial indexes, transaction isolation, or error codes. The race check must exercise the database you rely on.

<TestMatrix unit="one physical item cannot have two active holds" slice="a real PostgreSQL transaction" integration="Use a real collaborator only where its behavior changes the risk." />

<FailureWorkbench incident="Two staff members try to reserve the same serialized necklace at nearly the same time." :hypotheses="['invalid input', 'boundary failure', 'state or concurrency defect']" next-evidence="If hold A commits first for stock item GP-N-042, hold B must observe unavailable inventory rather than oversell it." />

## Build the mental model

SQLAlchemy 2 plays a role similar to JPA plus Spring’s data-access plumbing, but its vocabulary is explicit. An `Engine` owns database connectivity and pooling. A `Session` is a unit-of-work object, not a global connection and not a domain entity. `select(...)` builds a typed SQL statement; `session.execute(...)` runs it; `session.begin()` defines the transaction lifetime.

Use PostgreSQL in a container and supply its URL from configuration. A typical URL names driver, host, port, database, and credentials. Do not hard-code it in source. Enable a small pool and verify connections with `SELECT 1`; that proves reachability, not schema readiness.

## Check it by hand

Suppose the container exposes database `gold_pasal` on local port `55432`. Hand-check the layers: TCP connection to `localhost:55432`; PostgreSQL authentication for an application user; then a query in `gold_pasal`. A refused socket, bad password, and missing table are three different failures. Record which layer produced the message.

## Start with a failing test

Write a failing integration test that creates the engine from test configuration, opens a short-lived SQLAlchemy 2 session, and executes a parameterized `select` against a migrated table. Assert a known SKU such as `GP-NECKLACE-TILHARI`, not merely that “no exception occurred.” Keep the session fixture scoped so tests cannot leak uncommitted work into one another.

## Trace the non-trivial flow

Follow one request from Spring-like dependency injection into Python’s session factory. The HTTP request receives one session/unit of work. The application service starts a transaction. Repository statements use that same session. Success commits once; any exception rolls back before the session closes. Creating a new session inside each repository would split one business operation across transactions and destroy atomicity.

<PredictThenRun prompt="What exact result or failure should the public seam produce?">

Write the status, identifier, row count, or failure type before running the check. If the output differs, locate the first boundary where your prediction stopped matching reality.

</PredictThenRun>

## Practice

Stop PostgreSQL and predict the exception boundary. Restart it without migrations and predict the next failure. Then migrate and rerun. Explain why a health endpoint should distinguish “process alive” from “database ready.”

## Worked reasoning

The important connection is not a magic ORM object. It is a configured engine plus a deliberately bounded session. A successful `SELECT 1` proves connectivity; selecting `GP-NECKLACE-TILHARI` from the expected schema proves more. Neither proves the concurrent hold invariant yet.

## Check

```bash
uv run pytest tests/integration/inventory -q
```

Run the narrow test you wrote first, then this release check. Read the exit status and one meaningful identifier or count; green output without an explanation is incomplete evidence.

<EvidenceCard
  command="uv run pytest tests/integration/inventory -q"
  artifact="a migration plus a passing concurrent-reservation integration test"
  invariant="one physical item cannot have two active holds"
/>

<CareerSignal
  role="Python backend engineer with production AI skills"
  signal="a migration plus a passing concurrent-reservation integration test"
  interview-question="Where should transaction boundaries live, and why?"
/>

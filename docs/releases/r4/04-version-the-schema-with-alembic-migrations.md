---
id: r4-04
title: "Version the schema with Alembic migrations"
release: r4
order: 4
prerequisites: [r4-03]
outcomes:
  - Apply version the schema with alembic migrations to the cumulative Gold Pasal system
  - Explain the resulting behavior and its failure boundary
evidence: [commit, ci-run]
---

<LessonMission
  role="inventory manager"
  problem="Two staff members try to reserve the same serialized necklace at nearly the same time."
  destination="Exactly one active hold commits and the loser receives an expected conflict."
/>

# Version the schema with Alembic migrations


This is step 4 of 11. Keep earlier behavior green. You write the failing tests first and all production code; the lesson supplies contracts and reasoning, not a solved application.

## See the idea first

Changing a model class does not change a shop database already holding necklace records. Alembic is the ordered history that turns yesterday’s schema into today’s schema without asking staff to empty the safe.

<TestMatrix unit="one physical item cannot have two active holds" slice="a real PostgreSQL transaction" integration="Use a real collaborator only where its behavior changes the risk." />

<FailureWorkbench incident="Two staff members try to reserve the same serialized necklace at nearly the same time." :hypotheses="['invalid input', 'boundary failure', 'state or concurrency defect']" next-evidence="If hold A commits first for stock item GP-N-042, hold B must observe unavailable inventory rather than oversell it." />

## Build the mental model

An Alembic revision has an identifier, a parent revision, an `upgrade`, and usually a `downgrade`. Think of it as a Flyway/Liquibase migration in a Spring service. SQLAlchemy metadata describes the desired mapping; the migration records how to transform real data. Autogeneration is a draft, not a decision-maker: inspect column types, server defaults, indexes, foreign keys, and destructive operations.

Prefer expand-and-contract for risky changes. First add a nullable or defaulted column, deploy code that writes it, backfill existing rows, then enforce `NOT NULL` in a later revision. One large migration that rewrites a busy inventory table can block checkout.

## Check it by hand

Start at revision `r4_base` with two stock rows. The next revision adds holds and its indexes. `alembic upgrade head` should preserve both stock identifiers. `alembic downgrade -1` should remove only objects introduced by that revision. Hand-count rows before and after; schema success with lost inventory is failure.

## Start with a failing test

Write a migration test that creates a blank PostgreSQL database, upgrades to the previous revision, inserts `GP-N-042`, upgrades to head, and verifies that item remains. Add a downgrade/upgrade cycle when the downgrade is declared safe. Make this test fail before editing the revision. Do not use `Base.metadata.create_all()` because it skips the history you need to verify.

## Trace the non-trivial flow

At deployment, one controlled migration job acquires the right to migrate, checks the current revision, applies revisions in order, and stops on error. Application instances should not race to migrate at startup. A failed transactional DDL revision rolls back where PostgreSQL permits; an operational rollback may instead mean deploy the previous app while leaving an additive schema in place.

<PredictThenRun prompt="What exact result or failure should the public seam produce?">

Write the status, identifier, row count, or failure type before running the check. If the output differs, locate the first boundary where your prediction stopped matching reality.

</PredictThenRun>

## Practice

Draft an addition of `expires_at`. Compare “nullable then backfill” with immediate `NOT NULL`. With two existing holds, predict the result of each SQL operation. Mark which rollback loses data.

## Worked reasoning

A migration is executable change history, not a reflection of the latest model. The evidence is preservation of named rows across upgrade and a rehearsed rollback path. A downgrade function alone is not proof that downgrading production is safe.

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

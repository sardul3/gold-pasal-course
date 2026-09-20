---
title: "R4 — Persistent inventory and safe reservations"
description: "Transactional PostgreSQL inventory that resists double reservation."
---

# R4 — Persistent inventory and safe reservations

**Release promise:** Transactional PostgreSQL inventory that resists double reservation.

<LessonMission
  role="inventory manager"
  problem="Two staff members try to reserve the same serialized necklace at nearly the same time."
  destination="Exactly one active hold commits and the loser receives an expected conflict."
/>

## Lessons

1. [Learn relational modeling from products, stock, and holds](01-learn-relational-modeling-from-products-stock-and-holds)
2. [Run PostgreSQL locally and connect with SQLAlchemy 2](02-run-postgresql-locally-and-connect-with-sqlalchemy-2)
3. [Map records without leaking ORM concerns into the domain](03-map-records-without-leaking-orm-concerns-into-the-domain)
4. [Version the schema with Alembic migrations](04-version-the-schema-with-alembic-migrations)
5. [Seed believable catalog and inventory data](05-seed-believable-catalog-and-inventory-data)
6. [Create an inventory hold inside a transaction](06-create-an-inventory-hold-inside-a-transaction)
7. [Reproduce and fix the double-reservation race](07-reproduce-and-fix-the-double-reservation-race)
8. [Expire holds safely and make time testable](08-expire-holds-safely-and-make-time-testable)
9. [Test real PostgreSQL behavior with Testcontainers](09-test-real-postgresql-behavior-with-testcontainers)
10. [Plan backup, restore, and migration rollback](10-plan-backup-restore-and-migration-rollback)
11. [Release gate: prove inventory consistency under concurrency](11-release-gate-prove-inventory-consistency-under-concurrency)

## Release evidence

Run `uv run pytest tests/integration/inventory -q` and preserve a migration plus a passing concurrent-reservation integration test. At the review, defend this
invariant: **one physical item cannot have two active holds.**

<ArchitectureTrail
  before="Two staff members try to reserve the same serialized necklace at nearly the same time."
  decision="Introduce only the boundary and mechanism needed by this release."
  after="Exactly one active hold commits and the loser receives an expected conflict."
/>

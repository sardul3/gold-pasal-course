---
title: "R5: Orders, identity, and secrets"
description: "Replay-safe checkout behind bearer tokens and roles, with settings from the environment and an audit trail."
---

# R5: Orders, identity, and secrets

**What you'll have:** the store can sell. Configuration comes from the environment through `pydantic-settings`; staff and customers prove who they are with bearer tokens and are allowed different things; an active hold becomes a paid order in one transaction, exactly once per `Idempotency-Key`; payment sits behind a port with a stub adapter; and every write leaves an audit event.

<LessonMission
  role="shop operations"
  problem="The necklace is on hold. Checkout twice with the same key must not bill twice. A customer token must not seed stock. The database password is in a shell variable someone will paste into a commit."
  destination="POST /api/orders with Idempotency-Key returns the same order_id on replay. A customer POST /api/inventory/items is 403 /forbidden. Tokens and DATABASE_URL live in .env and Settings; nothing secret is in Git."
/>

## Before you start

You finished [R4](/releases/r4/): PostgreSQL runs from `compose.yaml`, `alembic upgrade head` builds the schema, `place_hold` takes a clock, and the inventory integration tests pass. Prove it from `gold-pasal`:

```bash
export GOLD_PASAL_TEST_DATABASE_URL=postgresql+psycopg://gold:gold@localhost:5432/gold_pasal_test
uv run pytest tests/inventory -m integration -q | tail -1
uv run alembic current | tail -1
```

```text
5 passed in 0.74s
7b2a4edf2330 (head)
```

Payment is a stub. This release does not touch card numbers and does not claim PCI compliance; it puts a port where a real provider will go.

## Guide

| Page | You will be able to |
| --- | --- |
| [Settings and secrets with pydantic-settings](01-settings-and-secrets-with-pydantic-settings) | read configuration once, from env and `.env`, with secrets that do not print |
| [Authenticate with bearer tokens](02-authenticate-with-bearer-tokens) | turn `Authorization: Bearer ...` into a `Principal` or a 401 problem |
| [Authorize by role](03-authorize-by-role) | let staff seed stock and customers hold it, with 403 for the rest |
| [Model the order state machine](04-model-the-order-state-machine) | write states and legal transitions as data, tested without a database |
| [Turn a hold into an order](05-turn-a-hold-into-an-order) | consume a hold with `SELECT ... FOR UPDATE` and create an order in one transaction |
| [Idempotency keys](06-idempotency-keys) | make a retried checkout return the original order instead of a second one |
| [Payment behind a port](07-payment-behind-a-port) | authorize through a Protocol, decline with a 402 problem, roll everything back |
| [Audit events](08-audit-events) | record who did what in the same transaction as the change |
| [Release gate: replay-safe checkout](09-release-gate-replay-safe-checkout) | show one order from two identical POSTs and a 403 for the wrong role |

## Release evidence

From `gold-pasal`, with tokens in `.env`:

```bash
uv run pytest tests/http tests/unit -q
uv run pytest tests/inventory -m integration -q
```

## What R6 starts from

`Settings` on `app.state`, `Principal` and role dependencies on every write route, `orders`, `idempotency_keys`, and `audit_events` tables, and the clock already injected. R6 starts from that working tree: you open a branch and a pull request, put `tests/inventory` on GitHub Actions with a PostgreSQL service, then add request ids, `/ready`, and structured logs.

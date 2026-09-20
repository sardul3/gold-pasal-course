---
title: Side quests
description: Optional depth after the relevant core release is proven.
---

# Side quests stay optional

Choose a side quest because it strengthens the role you want, not because the core path hid a prerequisite.

## Thin TypeScript storefront

Generate a client from the R3 OpenAPI contract, build catalog and hold flows, and keep all pricing and authorization on the server.

## Reliable order events

Add a transactional outbox, deliver order notifications at least once, and make the consumer idempotent.

## Temporal fulfillment workflow

Move a long-running fulfillment process into Temporal after the order state machine and failure semantics are already understood.

## International catalog

Add currency and weight boundaries without weakening the internal Money and Weight invariants.

## Pricing analytics

Use the classical ML path in `ai-sme-map` to analyze historical demand. Never let a model silently determine the auditable customer quote.

## Remote MCP

Add a remote transport and OAuth only after the local stdio server has contract tests, least-privilege tools, and explicit state-changing confirmation.

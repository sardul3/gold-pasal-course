---
title: "R5 — Orders and secure staff operations"
description: "Replay-safe orders, role boundaries, and auditable staff actions."
---

# R5 — Orders and secure staff operations

**Release promise:** Replay-safe orders, role boundaries, and auditable staff actions.

<LessonMission
  role="store operations lead"
  problem="A retried checkout and an over-privileged staff token could create duplicate or unauthorized orders."
  destination="Writes are replay-safe, role-scoped, and recorded in an append-only audit trail."
/>

## Lessons

1. [Move from hold to order with an explicit state machine](01-move-from-hold-to-order-with-an-explicit-state-machine)
2. [Make order creation idempotent](02-make-order-creation-idempotent)
3. [Stub payment behind a port without pretending PCI is solved](03-stub-payment-behind-a-port-without-pretending-pci-is-solved)
4. [Authenticate customers and staff](04-authenticate-customers-and-staff)
5. [Authorize catalog, inventory, and order actions by role](05-authorize-catalog-inventory-and-order-actions-by-role)
6. [Store passwords and tokens safely](06-store-passwords-and-tokens-safely)
7. [Keep secrets out of Git and logs](07-keep-secrets-out-of-git-and-logs)
8. [Build an append-only audit trail for sensitive changes](08-build-an-append-only-audit-trail-for-sensitive-changes)
9. [Threat-model Gold Pasal with concrete abuse cases](09-threat-model-gold-pasal-with-concrete-abuse-cases)
10. [Test authentication, authorization, and ownership boundaries](10-test-authentication-authorization-and-ownership-boundaries)
11. [Release gate: demonstrate replay-safe and least-privilege operations](11-release-gate-demonstrate-replay-safe-and-least-privilege-operations)

## Release evidence

Run `uv run pytest tests/http/orders tests/security -q` and preserve authorization tests, an audit sample, and an idempotency demonstration. At the review, defend this
invariant: **retries do not duplicate effects and principals cannot cross ownership boundaries.**

<ArchitectureTrail
  before="A retried checkout and an over-privileged staff token could create duplicate or unauthorized orders."
  decision="Introduce only the boundary and mechanism needed by this release."
  after="Writes are replay-safe, role-scoped, and recorded in an append-only audit trail."
/>

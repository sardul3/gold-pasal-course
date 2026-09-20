---
title: "R2 — A trustworthy domain core"
description: "Pricing rules protected by tests, value objects, and explicit ports."
---

# R2 — A trustworthy domain core

**Release promise:** Pricing rules protected by tests, value objects, and explicit ports.

<LessonMission
  role="pricing policy owner"
  problem="A rounding change fixes one quote but silently changes another purity and charge combination."
  destination="Tests state pricing invariants before refactoring changes the implementation."
/>

## Lessons

1. [Turn a pricing bug into the first failing pytest](01-turn-a-pricing-bug-into-the-first-failing-pytest)
2. [Arrange fixtures around real Nepal jewelry examples](02-arrange-fixtures-around-real-nepal-jewelry-examples)
3. [Cover karat, wastage, making charges, VAT, and rounding with parametrization](03-cover-karat-wastage-making-charges-vat-and-rounding-with-parametrization)
4. [Separate Money, Weight, Purity, and Quote as value objects](04-separate-money-weight-purity-and-quote-as-value-objects)
5. [Refactor toward clear names, small functions, and explicit invariants](05-refactor-toward-clear-names-small-functions-and-explicit-invariants)
6. [Use Strategy for replaceable making-charge rules](06-use-strategy-for-replaceable-making-charge-rules)
7. [Use Protocol and dependency inversion instead of framework coupling](07-use-protocol-and-dependency-inversion-instead-of-framework-coupling)
8. [Introduce Repository without building a database too early](08-introduce-repository-without-building-a-database-too-early)
9. [Test boundaries with fakes, stubs, and mocks for the right reasons](09-test-boundaries-with-fakes-stubs-and-mocks-for-the-right-reasons)
10. [Add property tests for pricing invariants](10-add-property-tests-for-pricing-invariants)
11. [Record auditable pricing decisions](11-record-auditable-pricing-decisions)
12. [Release gate: defend the domain model and testing choices](12-release-gate-defend-the-domain-model-and-testing-choices)

## Release evidence

Run `uv run pytest tests/unit/pricing -q` and preserve a red-to-green test commit and the pricing decision record. At the review, defend this
invariant: **domain rules remain framework-free, explicit, and auditable.**

<ArchitectureTrail
  before="A rounding change fixes one quote but silently changes another purity and charge combination."
  decision="Introduce only the boundary and mechanism needed by this release."
  after="Tests state pricing invariants before refactoring changes the implementation."
/>

---
id: r4-01
title: "Learn relational modeling from products, stock, and holds"
release: r4
order: 1
prerequisites: []
outcomes:
  - Apply learn relational modeling from products, stock, and holds to the cumulative Gold Pasal system
  - Explain the resulting behavior and its failure boundary
evidence: [commit, ci-run]
---

<LessonMission
  role="inventory manager"
  problem="Two staff members try to reserve the same serialized necklace at nearly the same time."
  destination="Exactly one active hold commits and the loser receives an expected conflict."
/>

# Learn relational modeling from products, stock, and holds


This is step 1 of 11. Keep earlier behavior green. You write the failing tests first and all production code; the lesson supplies contracts and reasoning, not a solved application.

## See the idea first

A Kathmandu counter has one physical necklace tagged `GP-N-042`. The catalog name “22K Tilhari Necklace” can describe many pieces, but that tag describes exactly one piece in the safe. If two shoppers are both promised `GP-N-042`, the database has represented a business impossibility.

<TestMatrix unit="one physical item cannot have two active holds" slice="a real PostgreSQL transaction" integration="Use a real collaborator only where its behavior changes the risk." />

<FailureWorkbench incident="Two staff members try to reserve the same serialized necklace at nearly the same time." :hypotheses="['invalid input', 'boundary failure', 'state or concurrency defect']" next-evidence="If hold A commits first for stock item GP-N-042, hold B must observe unavailable inventory rather than oversell it." />

## Build the mental model

Start with three different facts. A **product** describes what can be sold: SKU `GP-NECKLACE-TILHARI`, name, karat, and design. A **stock item** describes one serialized piece: `GP-N-042`, its product, and whether the shop possesses it. A **hold** describes a temporary claim by one customer and has a start and expiry time. Keeping these facts in separate relations avoids copying product names into every hold and lets a foreign key reject a hold for an item that does not exist.

In Java terms, these are domain concepts before they are JPA entities. Cardinality (how many records may relate) matters: one product has many stock items; one stock item has many historical holds; at most one of those holds may be active. A plain `status` column does not by itself enforce the last rule under concurrent requests.

## Check it by hand

Hand-check this data: product `P-17` has SKU `GP-NECKLACE-TILHARI`; stock items are `GP-N-042` and `GP-N-043`; customer `C-SITA` holds `GP-N-042` until `10:15 +05:45`. A second active row for customer `C-MAYA`, the same stock item, and expiry `10:20` is invalid. A historical expired row is useful and may remain.

Sketch primary keys, foreign keys, nullability, and unique/check constraints on paper. State which rule belongs in the database and which depends on the current clock.

## Start with a failing test

Write the first failing test at a public seam. Seed one serialized item through the staff-facing inventory contract, then request a hold. Assert the response identifies the same `stock_item_id` and an expiry later than the supplied clock. Add negative tests for an unknown item and an invalid TTL. Do not implement a controller, repository, or table until a failure demonstrates the missing behavior.

## Trace the non-trivial flow

Trace `POST /api/inventory/holds` with `{"stock_item_id":"GP-N-042","ttl_seconds":900}`. HTTP validation checks shape and range. The application service asks a repository to claim that serialized item. The database checks references and the one-active-hold invariant. The API translates an unavailable item to `409` with a problem type ending `/reservation-conflict`; malformed input is not the same failure and should remain `400` or `422` according to the existing contract.

<PredictThenRun prompt="What exact result or failure should the public seam produce?">

Write the status, identifier, row count, or failure type before running the check. If the output differs, locate the first boundary where your prediction stopped matching reality.

</PredictThenRun>

## Practice

Add `GP-B-011`, a 22K bangle, and three hold rows: one expired yesterday, one active for Sita, and one proposed for Maya. Predict which rows are legal before running a migration or test. Explain why counting catalog products cannot answer how many physical bangles are available.

## Worked reasoning

A sound model separates reusable product data from serialized inventory and temporary claims. The hand-checkable invariant is “for one `stock_item_id`, active-hold count is 0 or 1.” This lesson defines that invariant; it does not yet prove that two concurrent transactions cannot both pass a read-then-insert check.

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

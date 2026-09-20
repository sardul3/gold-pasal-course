---
id: r4-05
title: "Seed believable catalog and inventory data"
release: r4
order: 5
prerequisites: [r4-04]
outcomes:
  - Apply seed believable catalog and inventory data to the cumulative Gold Pasal system
  - Explain the resulting behavior and its failure boundary
evidence: [commit, ci-run]
---

<LessonMission
  role="inventory manager"
  problem="Two staff members try to reserve the same serialized necklace at nearly the same time."
  destination="Exactly one active hold commits and the loser receives an expected conflict."
/>

# Seed believable catalog and inventory data


This is step 5 of 11. Keep earlier behavior green. You write the failing tests first and all production code; the lesson supplies contracts and reasoning, not a solved application.

## See the idea first

A seed containing `item1` and `test product` hides modeling mistakes. A Nepal jewelry seed should make it obvious that one design can have several physical pieces and that price, weight, karat, and serialized stock are different facts.

<TestMatrix unit="one physical item cannot have two active holds" slice="a real PostgreSQL transaction" integration="Use a real collaborator only where its behavior changes the risk." />

<FailureWorkbench incident="Two staff members try to reserve the same serialized necklace at nearly the same time." :hypotheses="['invalid input', 'boundary failure', 'state or concurrency defect']" next-evidence="If hold A commits first for stock item GP-N-042, hold B must observe unavailable inventory rather than oversell it." />

## Build the mental model

Seed data is a small, deterministic story. Use stable identifiers so tests and learners can discuss the same item. Make rerunning the seed safe by choosing an explicit policy: insert only into an empty development database, or upsert immutable reference rows without overwriting operational state. Never turn a seed into a second migration system.

Keep catalog facts plausible but label them as teaching data, not live rates. Gold prices move; do not encode today’s market rate as timeless business logic.

## Check it by hand

Use product `P-TILHARI-22K` / SKU `GP-NECKLACE-TILHARI`, with stock items `GP-N-042` at 18.40 g and `GP-N-043` at 18.65 g. Add `P-BALA-22K` / `GP-BANGLE-BALA`, with `GP-B-011` at 12.10 g. Three physical identifiers means three reservable units, not two catalog products.

## Start with a failing test

Write a failing seed integration test. Run the seed twice in PostgreSQL. Assert there are exactly two products and three stock items, each stock item references the intended product, and identifiers remain unchanged. Add a test that the seed does not delete a hold created between runs.

## Trace the non-trivial flow

The seed command opens one transaction, inserts parent products before child stock items, validates row counts, and commits once. A duplicate or malformed row rolls the whole seed back. Production startup must not invoke this command; local setup and tests call it explicitly.

<PredictThenRun prompt="What exact result or failure should the public seam produce?">

Write the status, identifier, row count, or failure type before running the check. If the output differs, locate the first boundary where your prediction stopped matching reality.

</PredictThenRun>

## Practice

Add one Pokhara-made `GP-EARRING-JHUMKA` product with two individually tagged pairs. Predict product count and stock count. Then create one active hold and calculate available units by hand.

## Worked reasoning

For the supplied data, product count is 2 and stock count is 3; after holding `GP-N-042`, available serialized items are 2. Stable, rerunnable teaching data exposes relationships. It does not establish current gold valuation or production inventory.

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

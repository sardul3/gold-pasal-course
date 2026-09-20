---
id: r6-07
title: "Measure and improve a slow catalog query"
release: r6
order: 7
prerequisites: [r6-06]
outcomes:
  - Apply measure and improve a slow catalog query to the cumulative Gold Pasal system
  - Explain the resulting behavior and its failure boundary
evidence: [commit, ci-run]
---

<LessonMission
  role="on-call engineer"
  problem="An order fails in production and a green unit suite does not reveal whether the API, database, or dependency caused it."
  destination="Layered tests and telemetry narrow the failure without guesswork."
/>

# Measure and improve a slow catalog query


This is step 7 of 11. Improve catalog latency only after locating the database cost.

## See the idea first

### The page that became 51 queries

The first catalog page shows 50 ornaments. The API performs one query for the page and one price query per item: 51 queries. It feels fast with three development rows and slow with production-like data.

A **query count** is the number of database statements used for one operation. **Latency** is elapsed time. Count is deterministic enough for a regression test; wall-clock timing varies with hardware and load. Measure both, but gate carefully.

<TestMatrix unit="pagination and price-selection rules preserve results" slice="the catalog response shape and ordering stay unchanged" integration="real PostgreSQL query count and plan expose database cost" />

<FailureWorkbench incident="A 50-item catalog page exceeds the latency objective." :hypotheses="['N+1 price queries', 'missing filter index', 'response serialization dominates']" next-evidence="Capture statement count, total database time, and EXPLAIN for the slowest statement." />

## Hand-check the growth

With one page query plus one price query per item:

```text
3 items  -> 1 + 3  = 4 queries
50 items -> 1 + 50 = 51 queries
```

A bounded eager-load or joined query might make both cases two statements. The goal is not “one query at any cost.” A giant join can duplicate rows and increase memory. Preserve response correctness while reducing the measured bottleneck.

## Learner work: baseline first

Create a deterministic fixture with enough items to expose growth. Write an integration test that asserts catalog contents and records statements through the existing database instrumentation. Run it before changing the query.

Capture:

- row count and ordering;
- statement count;
- median of several warm runs for context;
- `EXPLAIN (ANALYZE, BUFFERS)` in a non-production test database.

<PredictThenRun prompt="If the page grows from 10 to 50 items, what query count do you expect before and after your proposed change?">

Implement one measured change. Re-run the exact fixture. If count improves but ordering, current-price selection, or pagination changes, the optimization is incorrect.

</PredictThenRun>

## Read the evidence

In an execution plan, compare estimated rows with actual rows and look for repeated scans. An index helps only when it supports the filter, join, or ordering used. Do not add an index because a column “looks searchable”; show the before-and-after plan.

## Practice

Add a second price history row to one item. Predict which price the optimized query returns and whether its query count changes. Write that regression test before adjusting the query.

## Worked answer

Reducing 51 statements to two is useful evidence when the 50 returned items, order, and selected prices remain identical. A laptop timing improvement alone is weaker because caches and machine load vary. Keep the count regression and preserve the plan snapshot as diagnostic evidence.

## Check

```bash
uv run pytest tests/integration -q
```

Report baseline count, final count, fixture size, and unchanged result assertions. Do not put a brittle millisecond threshold in the normal unit suite.

<EvidenceCard
  command="uv run pytest tests/integration -q"
  artifact="a diagnostic trace, focused regression test, and short postmortem"
  invariant="tests and telemetry cover different risks and remain deterministic"
/>

<CareerSignal
  role="Python backend engineer with production AI skills"
  signal="a diagnostic trace, focused regression test, and short postmortem"
  interview-question="What belongs in a unit, slice, integration, or contract test?"
/>

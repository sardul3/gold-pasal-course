---
id: r2-08
title: "Introduce Repository without building a database too early"
release: r2
order: 8
prerequisites: [r2-07]
outcomes:
  - Apply introduce repository without building a database too early to the cumulative Gold Pasal system
  - Explain the resulting behavior and its failure boundary
evidence: [commit, ci-run]
---

<LessonMission
  role="pricing policy owner"
  problem="A rounding change fixes one quote but silently changes another purity and charge combination."
  destination="Tests state pricing invariants before refactoring changes the implementation."
/>

# Introduce Repository without building a database too early


## See the idea first

A cashier wants yesterday's quote for SKU `GP-RING-001`. That need is “save and
find quotes,” not “install PostgreSQL.” A **Repository** is a collection-shaped
boundary that hides storage mechanics from the use case.

<PriceWorkbench />

Write learner-owned failing tests for `save(quote)` and `get(quote_id)` using an
in-memory repository. Save a 5 g 22K ring quote, retrieve it, and compare the
complete value object. Also specify the missing-ID result—`None` or a named
exception—before implementation.

Keep the Protocol narrow. Do not expose SQL rows, sessions, `commit()`, or query
builders. An in-memory dictionary is enough to discover whether identity,
replacement, or duplicate behavior is actually required.

<TestMatrix unit="repository behavior with quote values" slice="quote use case saves and retrieves through the port" integration="defer database behavior to a real adapter" />

<PredictThenRun prompt="After saving quote Q1, what should get(Q1) return, and should the use case know a dictionary stored it?">

It returns the same Quote value. The use case knows only the repository contract.

</PredictThenRun>

## Practice

First write a red duplicate-ID test. Decide whether duplicate save replaces or
rejects, implement that one rule, and stop. Do not design tables, migrations, or
transactions yet.

## Public evidence

The test suite demonstrates storage-independent use-case behavior. Record the
chosen missing and duplicate semantics; those become requirements for a future
database adapter.

## Check

```bash
uv run pytest tests/unit/pricing -q
```

Read the command’s exit status and one meaningful value in its output. A green
command is necessary evidence, but you must still be able to explain why it
protects this store behavior.

<EvidenceCard
  command="uv run pytest tests/unit/pricing -q"
  artifact="a red-to-green test commit and the pricing decision record"
  invariant="domain rules remain framework-free, explicit, and auditable"
/>

<CareerSignal
  role="Python backend engineer with production AI skills"
  signal="a red-to-green test commit and the pricing decision record"
  interview-question="Which pricing rules belong in value objects, policies, and application services?"
/>

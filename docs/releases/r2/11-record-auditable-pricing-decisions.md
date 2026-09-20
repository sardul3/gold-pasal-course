---
id: r2-11
title: "Record auditable pricing decisions"
release: r2
order: 11
prerequisites: [r2-10]
outcomes:
  - Apply record auditable pricing decisions to the cumulative Gold Pasal system
  - Explain the resulting behavior and its failure boundary
evidence: [commit, ci-run]
---

<LessonMission
  role="pricing policy owner"
  problem="A rounding change fixes one quote but silently changes another purity and charge combination."
  destination="Tests state pricing invariants before refactoring changes the implementation."
/>

# Record auditable pricing decisions


## See the idea first

A customer returning tomorrow needs more than the final NPR total. An auditable
decision records the inputs, policy identifiers, component amounts, rounding rule,
and result that produced the receipt.

<PriceWorkbench />

Write a failing test before adding recording. For a 5 g 22K ring, require one
immutable decision containing rate, weight, purity, wastage, making-charge strategy
name, VAT rate, gold value, charges, VAT, total, and a decision ID. Assert no record
is written when validation fails.

Do not log secrets or mutable object representations. Decimal values need a stable
string form; timestamps need an injected clock if they are part of the record.
Recording happens after calculation succeeds so there is no “completed” audit
entry for a rejected quote.

<TestMatrix unit="decision content and failure behavior" slice="pricing service plus audit port" integration="adapter persistence tested separately" />

<PredictThenRun prompt="If 19K is rejected before pricing, how many completed pricing decisions should be recorded?">

Zero. A separate rejection event may exist later, but it must not masquerade as a
completed quote.

</PredictThenRun>

## Practice

Author a red test requiring the making-charge strategy name in the decision. Add
only that field and predict its value. Do not build an event platform.

## Public evidence

Provide one redacted decision beside its receipt and show that every amount can be
reconciled. Explain the clock, identifier, and serialization boundaries.

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

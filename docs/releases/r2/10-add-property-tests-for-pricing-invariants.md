---
id: r2-10
title: "Add property tests for pricing invariants"
release: r2
order: 10
prerequisites: [r2-09]
outcomes:
  - Apply add property tests for pricing invariants to the cumulative Gold Pasal system
  - Explain the resulting behavior and its failure boundary
evidence: [commit, ci-run]
---

<LessonMission
  role="pricing policy owner"
  problem="A rounding change fixes one quote but silently changes another purity and charge combination."
  destination="Tests state pricing invariants before refactoring changes the implementation."
/>

# Add property tests for pricing invariants


## See the idea first

Example tests check chosen rings. A **property test** generates many valid examples
and checks a rule that should always hold. It is not random guessing: you define
the input boundaries and invariant.

<PriceWorkbench />

First author the property test and watch it fail against the known defect. Generate
positive Decimal rates and weights within shop-sized bounds. For each pair, quote
14K, 18K, 22K, and 24K and assert that gold values are sorted. Keep making charge,
wastage, and VAT fixed so the purity relationship is isolated.

When Hypothesis reports a **shrunk example**, it has reduced the failure to small
inputs that are easier to reason about. Recalculate that example by hand before
editing code. Preserve the example as a regression test if it reveals a distinct
boundary such as quantization.

<TestMatrix unit="generated monotonicity, non-negative components, total consistency" slice="public pricing service" integration="none" />

<PredictThenRun prompt="With rate and weight positive, what ordering must gold values for 14/18/22/24K have?">

They must be non-decreasing in that exact order. Charges cannot be used to excuse a
decreasing gold-value component.

</PredictThenRun>

## Practice

Add one property: increasing positive weight with all else fixed cannot lower gold
value. Bound weights to realistic jewelry values and run it. Do not generate
invalid domain objects or replace readable examples with properties.

## Public evidence

Keep the failing shrunk case, seed/reproduction output, and green CI run. Explain
the generator bounds and why each property follows from pricing policy.

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

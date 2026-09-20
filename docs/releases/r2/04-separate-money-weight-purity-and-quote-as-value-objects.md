---
id: r2-04
title: "Separate Money, Weight, Purity, and Quote as value objects"
release: r2
order: 4
prerequisites: [r2-03]
outcomes:
  - Apply separate money, weight, purity, and quote as value objects to the cumulative Gold Pasal system
  - Explain the resulting behavior and its failure boundary
evidence: [commit, ci-run]
---

<LessonMission
  role="pricing policy owner"
  problem="A rounding change fixes one quote but silently changes another purity and charge combination."
  destination="Tests state pricing invariants before refactoring changes the implementation."
/>

# Separate Money, Weight, Purity, and Quote as value objects


## See the idea first

A bare `Decimal("5.20")` cannot tell you whether it means grams, tola, NPR, or a
percentage. The type checker sees the same container in every case. Put domain
meaning and validity beside the value.

A **value object** is identified by its value rather than a database identity. Java
records often serve this role. In Python, a frozen dataclass can hold a `Decimal`
and reject invalid construction.

<PriceWorkbench />

## Build the behavior

Before writing classes, author failing tests: `Weight.grams("-0.01")` is rejected;
`Purity.from_karat(19)` is rejected; adding NPR money to NPR money succeeds; and a
`Quote` total equals its named components. The supported karats are 14, 18, 22,
and 24.

Use a hand-checkable ring: `Weight.grams("5.20")` remains exactly 5.20 grams, while
`Purity.from_karat(22)` carries a fraction of `22 / 24`. `Money.npr("7500.00")`
cannot accidentally be passed where a weight is required. `Quote` should expose
gold value, making charge, VAT, and total so a receipt is auditable.

Implement only the constructors and operations demanded by those red tests.
Normalize money at an explicit boundary; do not quantize every intermediate
`Decimal`, because repeated rounding changes totals. Frozen objects prevent a
fixture from silently changing halfway through a test.

<TestMatrix unit="construction invariants and allowed arithmetic" slice="pricing service returning a Quote" integration="none—value objects are framework-free" />

## Walk through the model

Input strings become `Decimal` once. `Weight` proves the number is positive.
`Purity` proves the karat is supported. The pricing policy combines those values
and produces `Money` components. `Quote` checks that its published total agrees
with those components. Invalid state is stopped where it is created, not several
stack frames later.

<PredictThenRun prompt="Should Money('100.00') equal Weight('100.00'), and at what boundary should an unsupported 19K value fail?">

They should never compare as interchangeable domain values. A 19K value should
fail when `Purity` is constructed, before the pricing formula runs.

</PredictThenRun>

## Practice

Write a failing test that zero weight is rejected, then add the smallest validation.
Predict the exception type and message first. Do not add currency conversion,
database IDs, or a universal measurement framework.

## Public evidence

Show reviewers the constructor tests and one quote serialized for a receipt.
Explain which invariants each object owns and why `Decimal` remains inside rather
than leaking unlabelled numbers throughout the service.

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

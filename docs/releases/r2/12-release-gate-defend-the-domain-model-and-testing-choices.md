---
id: r2-12
title: "Release gate: defend the domain model and testing choices"
release: r2
order: 12
prerequisites: [r2-11]
outcomes:
  - Apply release gate: defend the domain model and testing choices to the cumulative Gold Pasal system
  - Explain the resulting behavior and its failure boundary
evidence: [commit, ci-run, demo]
---

<LessonMission
  role="pricing policy owner"
  problem="A rounding change fixes one quote but silently changes another purity and charge combination."
  destination="Tests state pricing invariants before refactoring changes the implementation."
/>

# Release gate: defend the domain model and testing choices


## See the idea first

The release gate is a defense of choices, not a tour of class names. Prepare a
five-minute path from a Nepal jewelry example to executable evidence.

<PriceWorkbench />

Start with a hand calculation for one 5 g 22K ring at NPR 200,000 per tola. Name
the order: grams-to-tola, purity, wastage, making charge, taxable subtotal, VAT,
then final Money rounding. Run the same quote and reconcile each component.

Then demonstrate one controlled failure: 19K is rejected because supported values
are 14, 18, 22, and 24. Show the learner-authored test that was red before the
rule existed. Finally run the monotonic property across supported karats.

<TestMatrix unit="value objects, policies, properties, doubles" slice="exported quote and audit decision" integration="only adapters whose real behavior changes risk" />

<PredictThenRun prompt="Which three artifacts prove calculation, invalid-state rejection, and broad purity coverage?">

Use the hand-reconciled Quote, the red-to-green 19K test, and the property-test run.
No single artifact proves all three.

</PredictThenRun>

## Defend the choices

Explain why Decimal is necessary for money; why Weight and Purity reject invalid
state; why Strategy varies only making charges; why Protocol and Repository point
dependencies inward; and why a fake is preferable to a mock for save-and-find.
State the limit: these tests do not prove database transaction behavior.

## Practice

Rehearse once without notes. If an amount cannot be explained by hand, improve the
evidence or naming rather than adding application features.

## Public evidence

Publish the test command output, one pricing decision, and a short recording or
transcript of the controlled failure. Do not claim a complete production app.

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

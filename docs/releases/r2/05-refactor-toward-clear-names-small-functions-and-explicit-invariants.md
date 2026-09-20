---
id: r2-05
title: "Refactor toward clear names, small functions, and explicit invariants"
release: r2
order: 5
prerequisites: [r2-04]
outcomes:
  - Apply refactor toward clear names, small functions, and explicit invariants to the cumulative Gold Pasal system
  - Explain the resulting behavior and its failure boundary
evidence: [commit, ci-run]
---

<LessonMission
  role="pricing policy owner"
  problem="A rounding change fixes one quote but silently changes another purity and charge combination."
  destination="Tests state pricing invariants before refactoring changes the implementation."
/>

# Refactor toward clear names, small functions, and explicit invariants


## See the idea first

A correct 40-line pricing function can still be dangerous if nobody can point to
where wastage ends and VAT begins. Refactoring changes structure without changing
observable behavior. Your existing pricing tests are the guardrail.

<PriceWorkbench />

## Build the behavior

A Kathmandu counter receipt needs named components: gold value, wastage amount,
making charge, taxable subtotal, VAT, and total. Those names are better extraction
guides than arbitrary rules such as “functions must be five lines.”

Before editing production code, add a failing characterization test only if a
public component is currently missing. A **characterization test** records current
observable behavior so structural changes cannot alter it unnoticed. For a known
5 g 22K ring, preserve every receipt component, not merely the total.

Then extract one concept at a time. A function named `gold_value_for` should not
also apply VAT. A function named `vat_on` makes the tax base visible. Keep rounding
at the Money/Quote boundary. Run the narrow test after each extraction, as you
would during an IntelliJ rename-and-extract refactor.

<TestMatrix unit="named component calculations" slice="unchanged exported quote behavior" integration="none" />

## Make invariants executable

“Weight must be positive” belongs in `Weight`; “karat is one of 14/18/22/24”
belongs in `Purity`; “quote total equals components” belongs in `Quote`. An
explicit invariant is code that rejects an impossible value, plus a test showing
the rejection. A comment alone can drift.

<PredictThenRun prompt="If extracting vat_on changes only private function names, what should happen to the public 5 g 22K quote and its tests?">

Every component and the final total should remain identical. A changed output means
the edit was behavior change, not refactoring, and should be reverted or handled
as a separately tested policy decision.

</PredictThenRun>

## Practice

Choose one mixed-purpose block and extract only the VAT calculation. Predict that
the full Quote remains equal, run the learner-authored characterization test, then
the suite. Do not redesign every module in one pass.

## Worked reasoning and evidence

If a test fails by one paisa after extraction, compare the old and new quantization
points. The likely issue is moved rounding, not the function name. Your public
evidence is a behavior-preserving diff, green invariant tests, and a short review
note mapping each name to a line on the shop receipt.

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

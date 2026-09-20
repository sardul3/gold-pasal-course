---
id: r2-03
title: "Cover karat, wastage, making charges, VAT, and rounding with parametrization"
release: r2
order: 3
prerequisites: [r2-02]
outcomes:
  - Apply cover karat, wastage, making charges, vat, and rounding with parametrization to the cumulative Gold Pasal system
  - Explain the resulting behavior and its failure boundary
evidence: [commit, ci-run]
---

<LessonMission
  role="pricing policy owner"
  problem="A rounding change fixes one quote but silently changes another purity and charge combination."
  destination="Tests state pricing invariants before refactoring changes the implementation."
/>

# Cover karat, wastage, making charges, VAT, and rounding with parametrization


## See the idea first

One ring does not exercise a pricing policy. A 14K lightweight ring and a 24K coin
travel through different purity values while wastage, labor, VAT, and rounding can
interact. Put those differences where pytest can show them as named rows.

**Parametrization** means running one test body with several input-and-expected
rows. It is close to JUnit `@ParameterizedTest`. Each row should represent a
business boundary, not every possible combination.

<PriceWorkbench />

## Build the behavior

For a deliberately small example, suppose pre-VAT subtotal is NPR 100.01 and VAT
is 13%. Applying VAT before final paisa rounding gives `100.01 × 1.13 = 113.0113`,
then NPR 113.01. Rounding the subtotal to whole rupees first gives NPR 113.00.
That one paisa difference tells you exactly which ordering a test must protect.

Create rows for supported karats 14, 18, 22, and 24; zero and non-zero wastage; a
per-gram making charge; and the rounding edge above. Give every row an `id`, such
as `22k-ring-with-wastage`, so a failure reads like a catalog example.

Write the table-driven test before changing the calculator. Start with the row that
captures the missing rule and confirm only that row is red. Then implement enough
to pass it. Do not copy the production formula into the test: calculate compact
expected numbers by hand and document the arithmetic.

<TestMatrix unit="each pricing component and final-rounding order" slice="public quote result with component amounts" integration="none" />

## Read a failing row

If `24k-no-wastage` passes while `22k-ring-with-wastage` fails, purity conversion
works but the wastage base or sequence is suspect. If every row differs by a few
paisa, inspect where quantization occurs. Parametrization localizes the policy
branch; it does not replace reasoning.

<PredictThenRun prompt="For NPR 100.01 before 13% VAT, what final amount follows VAT-then-paisa-rounding, and what would early whole-rupee rounding produce?">

The intended sequence yields NPR 113.01. Early whole-rupee rounding yields NPR
113.00, so the row can catch a one-paisa regression.

</PredictThenRun>

## Practice

Add one learner-authored row for 18K with zero wastage. Predict which existing row
it should be lower than, run that row alone, then the matrix. Stop before adding
random combinations; property testing arrives later.

## Public evidence

The review artifact is the readable parameter table plus a failure showing the
specific row ID. Explain the formula order: gold value, wastage policy, making
charge, VAT, then final currency rounding.

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

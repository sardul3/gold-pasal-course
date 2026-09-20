---
id: r2-01
title: "Turn a pricing bug into the first failing pytest"
release: r2
order: 1
prerequisites: []
outcomes:
  - Apply turn a pricing bug into the first failing pytest to the cumulative Gold Pasal system
  - Explain the resulting behavior and its failure boundary
evidence: [commit, ci-run]
---

<LessonMission
  role="pricing policy owner"
  problem="A rounding change fixes one quote but silently changes another purity and charge combination."
  destination="Tests state pricing invariants before refactoring changes the implementation."
/>

# Turn a pricing bug into the first failing pytest


## See the idea first

The quote desk has a believable bug: a 22K ring can show less gold value than the
same 18K ring. Before opening the pricing function, turn that report into a test
you own.

An **invariant** is a rule that must remain true across many examples. Here it is:
with the rate and weight fixed, moving through 14K, 18K, 22K, and 24K must never
decrease gold value. Java teams often express this with JUnit around a Spring
service. Here pytest calls the exported Python pricing service directly.

<PriceWorkbench />

## Build the behavior

Use `Decimal("200000")` NPR per tola and `Decimal("5.00")` grams. First calculate
only the purity direction by hand: `18 / 24 = 0.75`, while `22 / 24` is about
`0.9167`. The second gold value must therefore be larger; exact totals can wait.

Write a test that obtains both quotes through the public pricing seam and compares
their `gold_value`. Run it before changing production code. A useful red failure
shows two computed money values in the assertion. An import error is setup noise,
not evidence of the pricing bug.

<TestMatrix unit="purity monotonicity at the pricing service" slice="one exported quote call with Decimal inputs" integration="none—the invariant does not need a database or HTTP server" />

Now make the smallest change that restores the ordering. Keep `Decimal` from input
through result; a binary `float` can introduce fractions of a paisa that are hard
to explain on a receipt. Do not “fix” the test by weakening `>` to `>=` unless the
business rule really permits equal values.

## Follow one value

For the 22K ring, the service converts grams to tola, multiplies by the daily 24K
rate, then applies the purity fraction. Charges and VAT belong to later steps.
This ordering explains why the assertion observes `gold_value`, not only the final
total: a compensating making charge could hide a broken purity calculation.

<PredictThenRun prompt="With rate and weight fixed, should 22K gold_value be lower, equal, or higher than 18K—and which assertion message would prove a real red test?">

It should be higher. The first run should fail because the observed 22K value is
not greater than the observed 18K value. After the minimal fix, that same
learner-authored test turns green.

</PredictThenRun>

## Practice

Add only one case: compare 14K with 24K at the same rate and weight. Predict the
ordering, run the single test, then run the pricing suite. Do not implement a new
CLI, database, or complete quote application.

## Public evidence

Keep the red failure and green run in the commit or CI history. In review, explain
why observing the exported service protects the rule better than testing a private
purity helper.

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

---
id: r2-02
title: "Arrange fixtures around real Nepal jewelry examples"
release: r2
order: 2
prerequisites: [r2-01]
outcomes:
  - Apply arrange fixtures around real nepal jewelry examples to the cumulative Gold Pasal system
  - Explain the resulting behavior and its failure boundary
evidence: [commit, ci-run]
---

<LessonMission
  role="pricing policy owner"
  problem="A rounding change fixes one quote but silently changes another purity and charge combination."
  destination="Tests state pricing invariants before refactoring changes the implementation."
/>

# Arrange fixtures around real Nepal jewelry examples


## See the idea first

Three tests all need a daily rate, but “some rate” produces examples nobody at the
counter can recognize. Arrange fixtures around named shop stories instead.

A pytest **fixture** is setup data or a collaborator supplied to a test. It plays a
role similar to a JUnit fixture or Spring test bean, but pytest injects it by the
function parameter name. A fixture should make the business example clearer, not
hide the numbers that matter.

<PriceWorkbench />

## Build the behavior

Use a `five_gram_22k_ring` fixture with weight `Decimal("5.00")`, karat `22`, and
making charge `Decimal("1500")` per gram. Use a separate `daily_rate` fixture of
`Decimal("200000")` NPR per tola. A reviewer can now say which values describe the
ring and which value changes daily.

Write the consumer test first. Ask for both fixtures, call the public quote service,
and assert one meaningful component. It should fail before the fixture exists;
`fixture 'five_gram_22k_ring' not found` proves the test demands shared vocabulary.
Then add the smallest fixture definitions.

Avoid a giant `quote_everything` fixture that constructs the service, expected
answer, clock, and repository. That kind of convenience turns one failure into a
treasure hunt. Expected totals belong beside the assertion so a learner can audit
them.

<TestMatrix unit="one named ring and its pricing invariant" slice="the exported quote service" integration="none—fixtures are plain Decimal-rich objects" />

## Hand-check the setup

At 5 grams, a making charge of NPR 1,500 per gram is NPR 7,500. You can verify that
without running Python. If the test reports NPR 15,000, inspect whether the fixture
accidentally supplied 10 grams before blaming VAT.

<PredictThenRun prompt="If two tests share the 5 g ring but only one uses today's rate, which values belong in separate fixtures?">

The physical ring belongs in one fixture and the changing daily rate in another.
Keeping them separate lets a future test reuse the ring at a different rate
without mutating shared state.

</PredictThenRun>

## Practice

Author a failing test for a `ten_gram_24k_coin` fixture. Predict that its purity
fraction is exactly one, add only that fixture, and run the narrow test. Do not
build a fixture factory until three real examples reveal a repeated shape.

## Public evidence

In the test names and review diff, preserve “5 g 22K ring” and the NPR inputs. That
is stronger evidence than anonymous `case_a` data because a jeweler can challenge
the example without reading fixture internals.

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

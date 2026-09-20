---
id: r2-09
title: "Test boundaries with fakes, stubs, and mocks for the right reasons"
release: r2
order: 9
prerequisites: [r2-08]
outcomes:
  - Apply test boundaries with fakes, stubs, and mocks for the right reasons to the cumulative Gold Pasal system
  - Explain the resulting behavior and its failure boundary
evidence: [commit, ci-run]
---

<LessonMission
  role="pricing policy owner"
  problem="A rounding change fixes one quote but silently changes another purity and charge combination."
  destination="Tests state pricing invariants before refactoring changes the implementation."
/>

# Test boundaries with fakes, stubs, and mocks for the right reasons


## See the idea first

Test doubles answer different questions. A **stub** returns a prepared rate. A
**fake** is a small working repository, often backed by a dictionary. A **mock**
records an interaction so you can verify a call that matters.

<PriceWorkbench />

Write the test before each double. Stub today's gold rate when the outcome is the
Quote. Use a fake repository when save-then-find behavior matters. Use a mock only
when “audit recorder receives exactly one completed pricing decision” is itself a
requirement.

For a 5 g 22K ring, prefer asserting Money components over asserting that private
helpers were called in a particular order. Interaction-heavy tests freeze the
implementation and can pass even when the customer total is wrong.

<TestMatrix unit="pricing outcome with a rate stub" slice="save/find with a repository fake" integration="adapter tests for real external behavior" />

<PredictThenRun prompt="Which double best proves save-then-find, and which best supplies a fixed NPR 200,000 rate?">

The repository fake proves behavior; the rate stub supplies the value. Neither
requires a generic mock.

</PredictThenRun>

## Practice

Author a failing test that audit recording occurs once after a successful quote.
Use the smallest spy/mock, predict the recorded decision, and avoid assertions
about unrelated helper calls.

## Public evidence

In review, label each double and the risk it isolates. A short explanation of why
a mock was unnecessary is evidence of boundary judgment, not missing coverage.

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

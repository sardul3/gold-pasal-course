---
id: r2-06
title: "Use Strategy for replaceable making-charge rules"
release: r2
order: 6
prerequisites: [r2-05]
outcomes:
  - Apply use strategy for replaceable making-charge rules to the cumulative Gold Pasal system
  - Explain the resulting behavior and its failure boundary
evidence: [commit, ci-run]
---

<LessonMission
  role="pricing policy owner"
  problem="A rounding change fixes one quote but silently changes another purity and charge combination."
  destination="Tests state pricing invariants before refactoring changes the implementation."
/>

# Use Strategy for replaceable making-charge rules


## See the idea first

A plain band may cost NPR 1,500 per gram to make, while a detailed tilhari pendant
may use a percentage of gold value. A growing `if jewelry_type == ...` chain puts
changing labor policy inside the stable quote sequence.

A **Strategy** is a replaceable object or function that performs one policy. It is
the Python counterpart of injecting a Java interface implementation. The pricing
service should ask the selected strategy for a making charge, then continue with
the same VAT and total rules.

<PriceWorkbench />

## Build the behavior

Author failing tests for two small examples. A 5 g ring at NPR 1,500 per gram has
a making charge of NPR 7,500. A percentage strategy given gold value NPR 100,000
and 8% returns NPR 8,000. Add a service-level test proving the same ring produces
different making-charge components when only the strategy changes.

Implement the smallest callable contract, for example a method receiving the
validated weight and gold value and returning `Money`. Do not pass an entire
mutable quote request “just in case”; narrow inputs reveal what the policy uses.

<TestMatrix unit="each making-charge strategy's arithmetic" slice="pricing service delegates once and includes returned Money" integration="none" />

## Follow the delegation

The service calculates gold value first. It gives weight and gold value to the
strategy. The per-gram strategy uses weight; the percentage strategy uses gold
value. The returned `Money` becomes one Quote component. VAT still runs afterward,
so replacing labor policy cannot silently replace tax policy.

<PredictThenRun prompt="For a 5 g ring, what do per-gram NPR 1,500 and 8% of NPR 100,000 strategies return, and which rest of the quote flow should change?">

They return NPR 7,500 and NPR 8,000. Only the making charge and downstream amounts
that depend on it should change; purity and gold value remain fixed.

</PredictThenRun>

## Practice

Write a failing test for a flat NPR 2,000 repair-item strategy, then implement only
that policy. Predict that weight changes do not alter its result. Do not build a
rule engine, configuration language, or strategy registry.

## Public evidence

Show the two arithmetic tests and one delegation test. In review, explain why the
variation point is making charge—not the whole quote—and how this keeps pricing
invariants visible.

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

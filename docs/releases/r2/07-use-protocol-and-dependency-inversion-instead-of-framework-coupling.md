---
id: r2-07
title: "Use Protocol and dependency inversion instead of framework coupling"
release: r2
order: 7
prerequisites: [r2-06]
outcomes:
  - Apply use protocol and dependency inversion instead of framework coupling to the cumulative Gold Pasal system
  - Explain the resulting behavior and its failure boundary
evidence: [commit, ci-run]
---

<LessonMission
  role="pricing policy owner"
  problem="A rounding change fixes one quote but silently changes another purity and charge combination."
  destination="Tests state pricing invariants before refactoring changes the implementation."
/>

# Use Protocol and dependency inversion instead of framework coupling


## See the idea first

The pricing service needs today's rate, but it should not know whether that rate
came from FastAPI, a CSV, or tomorrow's database. A **Protocol** is a structural
Python interface: an object qualifies by providing the required methods, much like
a Java interface without an `implements` declaration.

<PriceWorkbench />

Write a failing service test with a tiny rate provider returning NPR 200,000 per
tola. Require only `rate_for(metal) -> Money`. Then type the service against that
Protocol and inject the provider. Keep framework imports outside the domain.

This is **dependency inversion**: pricing owns the abstraction it needs; an outer
adapter supplies the implementation. The arrow points from infrastructure toward
the domain contract, not from pricing toward a web or ORM class.

<TestMatrix unit="rate-provider contract and pricing arithmetic" slice="service with an injected provider" integration="one adapter contract test later" />

<PredictThenRun prompt="If the provider returns NPR 200,000 for gold, which layer should know whether the value came from HTTP or a file?">

Only the outer adapter knows. The service receives Money and applies unchanged
weight, purity, charge, VAT, and rounding invariants.

</PredictThenRun>

## Practice

Author a failing test for a provider that has no silver rate. Predict the domain
failure, implement only that path, and run the narrow test. Do not add FastAPI or a
database.

## Public evidence

Show that domain tests run with a plain fake and that the domain package imports no
framework. Explain the Protocol's minimal method and failure contract.

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

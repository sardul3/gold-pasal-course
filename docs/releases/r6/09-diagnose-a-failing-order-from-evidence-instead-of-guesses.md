---
id: r6-09
title: "Diagnose a failing order from evidence instead of guesses"
release: r6
order: 9
prerequisites: [r6-08]
outcomes:
  - Apply diagnose a failing order from evidence instead of guesses to the cumulative Gold Pasal system
  - Explain the resulting behavior and its failure boundary
evidence: [commit, ci-run]
---

<LessonMission
  role="on-call engineer"
  problem="An order fails in production and a green unit suite does not reveal whether the API, database, or dependency caused it."
  destination="Layered tests and telemetry narrow the failure without guesswork."
/>

# Diagnose a failing order from evidence instead of guesses


This is step 9 of 11. Use the signals you built to reduce uncertainty in a controlled incident.

## See the idea first

### A symptom is not a cause

At 10:04, order requests begin returning `503`. “PostgreSQL is broken” is a guess. A safer diagnosis starts with the observed symptom, lists plausible causes, and asks for the cheapest evidence that separates them.

A **hypothesis** is a testable explanation. **Discriminating evidence** makes one hypothesis more or less likely than another. Diagnosis is the repeated loop: observe, hypothesize, inspect, update.

<TestMatrix unit="the eventual regression test reproduces the smallest causal behavior" slice="the known request ID reproduces the safe public failure" integration="database or dependency evidence confirms the failing boundary" />

<FailureWorkbench incident="Order ord-731 returns 503 with request ID acceptance-trace-42." :hypotheses="['payment timeout', 'database connection exhaustion', 'invalid order mapped incorrectly']" next-evidence="Compare payment and database span status for acceptance-trace-42 before changing code." />

## Rank evidence by cost

For the same 503:

1. Read the structured event by request ID.
2. Inspect child span statuses and durations.
3. Compare error and latency metrics around 10:04.
4. Reproduce safely with the same input.
5. Only then inspect or change code at the implicated boundary.

Restarting every service may hide the evidence. Changing timeout, pool size, and retry policy together makes the cause impossible to distinguish.

## Learner work: run a controlled failure

Use a local or test environment. Make exactly one dependency unavailable. Send a valid order with a known request ID. Record:

- status, media type, and request ID;
- the first failing span;
- one relevant metric change;
- the structured error event;
- whether an order committed.

Do not fix the code yet. Write three hypotheses and strike out each only when evidence contradicts it.

<PredictThenRun prompt="If the database span succeeds in 12 ms but the payment span ends after its timeout, which hypothesis leads and what evidence could still disprove it?">

After identifying the boundary, write a focused failing regression test. Then make one minimal change and rerun the controlled incident.

</PredictThenRun>

## Walk through the reasoning

Separate correlation from causation. A database warning at 10:04 is correlated with the incident; a successful database span for the exact request weakens it as the cause. A timed-out payment span for that request strengthens the payment hypothesis, but the regression test must still reproduce the bad mapping or retry behavior you intend to change.

## Practice

Give a partner only the public symptom and request ID. Ask them to produce a timestamped evidence chain without reading source first. Compare where your hypotheses diverge.

## Worked answer

If the exact trace shows a successful database span, no committed order, and a payment timeout, investigate the payment boundary first. Preserve the 503 and request ID while deciding whether timeout or retry policy is wrong. Do not misreport the absence of an order as the root cause; it is expected rollback behavior.

## Check

```bash
uv run --project ../gold-pasal-course/checks pytest ../gold-pasal-course/checks/r6 --app-repo "$PWD" --base-url http://localhost:8000
```

Attach a short incident timeline and the focused regression test. The release contract must stay green throughout diagnosis.

<EvidenceCard
  command="uv run --project ../gold-pasal-course/checks pytest ../gold-pasal-course/checks/r6 --app-repo &quot;$PWD&quot; --base-url http://localhost:8000"
  artifact="a diagnostic trace, focused regression test, and short postmortem"
  invariant="tests and telemetry cover different risks and remain deterministic"
/>

<CareerSignal
  role="Python backend engineer with production AI skills"
  signal="a diagnostic trace, focused regression test, and short postmortem"
  interview-question="What belongs in a unit, slice, integration, or contract test?"
/>

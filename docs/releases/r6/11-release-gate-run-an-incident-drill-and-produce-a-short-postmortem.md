---
id: r6-11
title: "Release gate: run an incident drill and produce a short postmortem"
release: r6
order: 11
prerequisites: [r6-10]
outcomes:
  - Apply release gate: run an incident drill and produce a short postmortem to the cumulative Gold Pasal system
  - Explain the resulting behavior and its failure boundary
evidence: [commit, ci-run, demo]
---

<LessonMission
  role="on-call engineer"
  problem="An order fails in production and a green unit suite does not reveal whether the API, database, or dependency caused it."
  destination="Layered tests and telemetry narrow the failure without guesswork."
/>

# Release gate: run an incident drill and produce a short postmortem


This release gate combines the testing and operations work. Run it in a non-production environment with a partner observing.

## See the idea first

### The drill

Make one order dependency unavailable. Submit a valid order with request ID `acceptance-trace-42`. The API must fail safely, preserve correlation, avoid a partial order, and provide enough evidence to identify the failed boundary.

A **postmortem** is a factual account of impact, timeline, contributing conditions, response, and follow-up. It is not a blame document and not a place to invent certainty unsupported by evidence.

<TestMatrix unit="the regression test captures the causal rule" slice="the controlled failure returns safe problem details and correlation" integration="rollback and dependency behavior are observed with real infrastructure" />

<FailureWorkbench incident="A controlled order dependency fails during the release drill." :hypotheses="['payment timeout is mapped safely', 'database rollback fails', 'request context is lost on exception']" next-evidence="Connect response, structured event, spans, metrics, and persisted state using acceptance-trace-42." />

## Gate 1: prove the public contract

Run the course acceptance checks against the learner application:

```bash
uv run --project ../gold-pasal-course/checks pytest ../gold-pasal-course/checks/r6 --app-repo "$PWD" --base-url http://localhost:8000
```

Explain each assertion:

- `/health` returns the incoming request ID;
- an absent catalog record returns `404` problem details with a request ID and no traceback;
- OpenAPI publishes distinct `/health` and `/ready` paths.

## Gate 2: run the incident

Before the drill, write the predicted status, persistence result, first failed span, metric movement, and alert behavior. Start a timestamped timeline. Introduce one failure only, submit the request, diagnose from evidence, restore the dependency, and verify recovery.

<PredictThenRun prompt="During the controlled dependency failure, what exact response, persisted state, telemetry chain, and recovery result do you expect?">

If observed behavior differs, record the mismatch before changing anything. Add a failing regression test at the smallest honest layer, implement the correction, and repeat the drill.

</PredictThenRun>

## Gate 3: write the postmortem

Keep it short and evidence-based:

```text
Impact:
Detection:
Timeline with times:
Technical cause:
Contributing conditions:
What worked:
What did not:
Corrective actions, owner, due date:
```

“Operator error” is not a technical cause. Name the missing guard, unsafe default, absent test, or misleading signal. Separate what the evidence proves from what remains a hypothesis.

## Practice

Have the observer select one timeline claim and ask for its evidence. Trace it to command output, a test, a metric, a structured event, or a span. Rewrite unsupported claims.

## Worked answer

A strong drill artifact connects `acceptance-trace-42` from safe response to the first failed dependency span, confirms no partial order, shows recovery, and adds one focused regression. The postmortem states impact and cause without claiming that one drill proves all production failure modes.

## Check

```bash
./scripts/verify.sh && uv run --project ../gold-pasal-course/checks pytest ../gold-pasal-course/checks/r6 --app-repo "$PWD" --base-url http://localhost:8000
```

Submit the diagnostic trace, focused regression test, incident timeline, and postmortem together. The release is not ready if correlation, safe failure, or recovery cannot be demonstrated.

<EvidenceCard
  command="./scripts/verify.sh &amp;&amp; uv run --project ../gold-pasal-course/checks pytest ../gold-pasal-course/checks/r6 --app-repo &quot;$PWD&quot; --base-url http://localhost:8000"
  artifact="a diagnostic trace, focused regression test, and short postmortem"
  invariant="tests and telemetry cover different risks and remain deterministic"
/>

<CareerSignal
  role="Python backend engineer with production AI skills"
  signal="a diagnostic trace, focused regression test, and short postmortem"
  interview-question="What belongs in a unit, slice, integration, or contract test?"
/>

---
id: r6-08
title: "Add structured logs, request IDs, metrics, and traces"
release: r6
order: 8
prerequisites: [r6-07]
outcomes:
  - Apply add structured logs, request ids, metrics, and traces to the cumulative Gold Pasal system
  - Explain the resulting behavior and its failure boundary
evidence: [commit, ci-run]
---

<LessonMission
  role="on-call engineer"
  problem="An order fails in production and a green unit suite does not reveal whether the API, database, or dependency caused it."
  destination="Layered tests and telemetry narrow the failure without guesswork."
/>

# Add structured logs, request IDs, metrics, and traces


This is step 8 of 11. Make one failed request findable without exposing customer data.

## See the idea first

### Find `ord-731` across boundaries

Support receives a screenshot of a `503` with request ID `acceptance-trace-42`. Without that shared key, operators search thousands of messages by timestamp. With it, they can connect the response, application log, payment span, and database work.

**Structured logs** are events with named fields, not prose that must be parsed. A **metric** is an aggregated number over many requests. A **trace** is a timed path through one request, split into spans. A **request ID** is a correlation key carried at the HTTP boundary.

<TestMatrix unit="telemetry field builders redact and classify values" slice="incoming request IDs are returned on success and safe failure" integration="database and payment spans share trace context" />

<FailureWorkbench incident="Order ord-731 returns 503 but cannot be located in logs." :hypotheses="['middleware generated a different response ID', 'the error path omitted structured fields', 'trace context stopped at the payment adapter']" next-evidence="Send one known request ID and compare response header, error body, log event, and spans." />

## One event, four signal types

For one failed lookup, hand-check this safe event:

```json
{"event":"catalog.item_not_found","request_id":"acceptance-trace-42","sku":"GP-DOES-NOT-EXIST","status":404}
```

Do not log authorization headers, passwords, card data, full request bodies, or tracebacks in the public response. Keep exception detail in protected telemetry where policy permits it.

A counter such as `http_requests_total{route="/api/catalog/items/{sku}",status="404"}` answers “how many?” Avoid the raw SKU or request ID as metric labels; unbounded labels create excessive **cardinality** (too many distinct time series).

## Learner work: test the public correlation

First write a failing HTTP test:

```python
response = api.get("/health", headers={"X-Request-ID": "acceptance-trace-42"})
assert response.headers["x-request-id"] == "acceptance-trace-42"
```

Add learner-authored assertions for a generated ID when the header is absent, a request ID in problem details, one structured log event, and bounded metric labels. Implement middleware and instrumentation only after each public check is red.

<PredictThenRun prompt="For one missing SKU, which fields belong in a log, which belong in metric labels, and which must be redacted?">

Run one request and search by `acceptance-trace-42`. The same key should connect evidence without becoming a high-cardinality metric label.

</PredictThenRun>

## Walk through the request

Trace the incoming header through middleware context, response header, error mapper, log event, and child spans. Explain who creates the ID when absent and who clears per-request context after the response so concurrent requests cannot leak values.

## Practice

Trigger one known 404 and one controlled 503. Predict the counter increments, log severity, and span status for each. Verify that both responses are safe and searchable.

## Worked answer

The known 404 is a normal client-visible outcome and usually increments a 404 counter with an informational event. A dependency-caused 503 is operational failure and should mark the relevant span and error metric. Both preserve the request ID; neither response contains a traceback.

## Check

```bash
uv run --project ../gold-pasal-course/checks pytest ../gold-pasal-course/checks/r6 --app-repo "$PWD" --base-url http://localhost:8000
```

The acceptance check directly verifies request-ID preservation and safe problem details. Add focused telemetry tests for log fields, bounded labels, and context cleanup.

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

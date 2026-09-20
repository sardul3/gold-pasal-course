---
id: r6-02
title: "Write focused unit, HTTP-slice, integration, and contract suites"
release: r6
order: 2
prerequisites: [r6-01]
outcomes:
  - Apply write focused unit, http-slice, integration, and contract suites to the cumulative Gold Pasal system
  - Explain the resulting behavior and its failure boundary
evidence: [commit, ci-run]
---

<LessonMission
  role="on-call engineer"
  problem="An order fails in production and a green unit suite does not reveal whether the API, database, or dependency caused it."
  destination="Layered tests and telemetry narrow the failure without guesswork."
/>

# Write focused unit, HTTP-slice, integration, and contract suites


This is step 2 of 11. Turn the test inventory into suites that fail for different reasons.

## See the idea first

### Four questions about one missing item

A shopper requests catalog item `GP-DOES-NOT-EXIST`. Gold Pasal must return `404`, `application/problem+json`, a request ID, and no Python traceback. One giant end-to-end check could assert all of that, but its failure would not tell you which boundary broke.

A **suite** is a related set of tests. Focus each suite on one question:

- **unit:** does a rule or mapping work with plain values?
- **HTTP slice:** does the web boundary validate input and shape output?
- **integration:** does code cooperate with a real PostgreSQL schema?
- **contract:** does a public interface keep what clients were promised?

<TestMatrix unit="a missing catalog result maps to a not-found outcome" slice="GET of an absent SKU returns safe problem details" integration="the repository distinguishes absent rows from database failure" />

<FailureWorkbench incident="A missing SKU leaks a traceback in a JSON 500 response." :hypotheses="['repository reports absence as an exception', 'HTTP exception mapping is missing', 'error middleware serializes debug details']" next-evidence="Compare a repository absence test with an HTTP-slice missing-SKU test." />

## Make the examples hand-checkable

For a request carrying `X-Request-ID: acceptance-trace-42`, write down this expected response before code:

```text
status: 404
content-type: application/problem+json
body.status: 404
body.request_id: acceptance-trace-42
body contains "traceback": no
```

The status and media type are HTTP concerns. “No row” versus “database unavailable” is an integration concern. The presence of `/health` and `/ready` in OpenAPI is a contract concern. Keep these assertions in the suite that owns the risk.

## Learner work: red first

Author four focused tests. Use your repository’s fixture and import names; do not copy imagined course names into the app.

1. A plain unit test for mapping “catalog item absent” to a domain outcome.
2. An HTTP-slice test for the response table above.
3. A PostgreSQL integration test that queries one present and one absent SKU.
4. A contract test that reads `/openapi.json` and requires both `/health` and `/ready`.

Run each new test before production work. Record why it fails. Then implement only enough behavior to pass that suite.

<PredictThenRun prompt="If PostgreSQL is unavailable rather than merely missing a row, should the HTTP result still be 404? Predict the safer status and why.">

Run the HTTP slice with the repository collaborator configured for absence, then for failure. The two public results must not collapse into one.

</PredictThenRun>

## Walk through one request

Follow `GP-DOES-NOT-EXIST` from route parameter to repository result to problem-details body. At each step, name the value’s type and owner. Assert public status, headers, and body; avoid asserting which private helper was called.

## Practice

Break only the problem-details media type. Predict which suite fails and which three suites stay green. Run the focused check, restore the behavior, and preserve the failure output as evidence.

## Worked answer

Changing `application/problem+json` to ordinary JSON should fail the HTTP-slice or public contract assertion. Repository integration tests should remain green because SQL behavior did not change. That separation is evidence that the suites diagnose rather than merely duplicate.

## Check

```bash
uv run --project ../gold-pasal-course/checks pytest ../gold-pasal-course/checks/r6 --app-repo "$PWD" --base-url http://localhost:8000
```

This release check requires request-ID preservation on `/health`, safe problem details for the missing SKU, and separate `/health` and `/ready` OpenAPI paths. It complements your learner-authored suites; it does not replace them.

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

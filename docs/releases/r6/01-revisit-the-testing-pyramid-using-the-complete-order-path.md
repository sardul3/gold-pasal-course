---
id: r6-01
title: "Revisit the testing pyramid using the complete order path"
release: r6
order: 1
prerequisites: []
outcomes:
  - Apply revisit the testing pyramid using the complete order path to the cumulative Gold Pasal system
  - Explain the resulting behavior and its failure boundary
evidence: [commit, ci-run]
---

<LessonMission
  role="on-call engineer"
  problem="An order fails in production and a green unit suite does not reveal whether the API, database, or dependency caused it."
  destination="Layered tests and telemetry narrow the failure without guesswork."
/>

# Revisit the testing pyramid using the complete order path


This is step 1 of 11. Keep the existing catalog, hold, order, and authorization behavior green.

## See the idea first

### One green suite, one failed order

At 10:04, Maya submits order `ord-731`. Price calculation succeeds, the HTTP endpoint returns `503`, and no order appears in PostgreSQL. The unit suite is green because it exercised price calculation without an HTTP request or database.

A **test layer** is a group of checks that crosses the same boundaries. Small tests answer narrow questions quickly. Larger tests answer whether separately correct parts actually cooperate. No single layer proves the whole order path.

<TestMatrix unit="price and order-state rules with no framework or database" slice="HTTP status, headers, and JSON through the FastAPI boundary" integration="order persistence and constraints against PostgreSQL" />

<FailureWorkbench incident="Order ord-731 returns 503 although unit tests pass." :hypotheses="['the HTTP payload is rejected', 'the payment port times out', 'the database transaction fails']" next-evidence="Run one HTTP-slice check and one PostgreSQL integration check with the same valid order fixture." />

## Draw the path before choosing tests

Hand-check this path:

```text
POST /api/orders
  -> validate customer and lines
  -> calculate NPR 2,500
  -> authorize payment
  -> insert order
  -> return 201 + order id
```

If a unit test calls only `calculate_total`, it can prove `2 × NPR 1,250 = NPR 2,500`. It cannot prove that malformed JSON becomes `422`, that a payment timeout becomes a safe error, or that PostgreSQL stores the order once.

Use many fast unit checks for branching business rules, fewer HTTP-slice and integration checks for boundaries, and a very small number of complete-path checks. This distribution is called the **testing pyramid**. It is a risk model, not a quota.

## Write the missing check first

Create a test inventory with four columns: risk, smallest layer that observes it, collaborator, and expected result. Include:

- two identical order lines total correctly;
- invalid quantity is rejected at HTTP;
- a committed order can be read from PostgreSQL;
- the published OpenAPI order response still has the promised fields.

Choose one uncovered risk. Write a failing test at the smallest layer that can genuinely observe it. A failure caused by a missing fixture or import is setup failure; it is not the red test you need.

<PredictThenRun prompt="For a valid order followed by a database refusal, which layer should fail, and what public HTTP result should remain safe?">

Run only your new test. Point to the first boundary that differs from your prediction. Then write the smallest application change that makes the public behavior pass.

</PredictThenRun>

## Walk the evidence

For `ord-731`, explain each claim separately:

1. The unit result proves arithmetic and state rules.
2. The HTTP-slice result proves request validation and response mapping.
3. The integration result proves SQL, schema, and transaction behavior.
4. The contract result proves a consumer-visible shape.

The complete path has confidence only when the claims overlap without duplicating every case at every layer.

## Practice

Delete no tests. Classify five existing order tests by layer, then move one misplaced case to the smallest honest layer. Before running it, predict which collaborator will be real and which will be replaced.

## Worked answer

For the incident above, a passing total unit test removes arithmetic from the leading hypotheses. A failing PostgreSQL integration test with the same valid order points at schema, connection, or transaction behavior. It still does not prove the HTTP error is safe; that needs an HTTP-boundary assertion.

## Check

```bash
./scripts/verify.sh
```

Save the focused red-to-green test output and the layer inventory. The release check in `checks/r6` will later require operational endpoints and safe failures, so reserve `/health` and `/ready` for observable service behavior rather than business logic.

<EvidenceCard
  command="./scripts/verify.sh"
  artifact="a diagnostic trace, focused regression test, and short postmortem"
  invariant="tests and telemetry cover different risks and remain deterministic"
/>

<CareerSignal
  role="Python backend engineer with production AI skills"
  signal="a diagnostic trace, focused regression test, and short postmortem"
  interview-question="What belongs in a unit, slice, integration, or contract test?"
/>

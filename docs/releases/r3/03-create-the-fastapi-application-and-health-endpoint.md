---
id: r3-03
title: "Create the FastAPI application and health endpoint"
release: r3
order: 3
prerequisites: [r3-02]
outcomes:
  - Apply create the fastapi application and health endpoint to the cumulative Gold Pasal system
  - Explain the resulting behavior and its failure boundary
evidence: [commit, ci-run]
---

<LessonMission
  role="catalog manager"
  problem="Staff and future clients need a stable way to create and find catalog items."
  destination="The documented HTTP contract validates input and returns consistent success and failure shapes."
/>

# Create the FastAPI application and health endpoint


## See the idea first

## Build the public contract

A FastAPI application is the composition root. `/health` is liveness: the process can answer HTTP. It is not a database diagnosis. `/openapi.json` is generated from registered routes.

<ApiWorkbench />

## Write the failing contract first

Write failing HTTPX checks for 200 plus `service=gold-pasal`, and for the catalog path in OpenAPI. A healthy response with a missing catalog path means the process lives but the contract is incomplete.

<TestMatrix unit="boundary and domain rules" slice="HTTPX against FastAPI" integration="course checks/r3 public contract" />

## Walk the public result

A request crosses routing, transport validation, domain mapping, service/repository work, and response serialization. Name the first boundary that disagrees with your prediction before changing code.

<PredictThenRun prompt="What exact status, media type, and JSON shape should this request produce?">

Record the prediction first. For invalid karat 19, expect 422 and `application/problem+json`; valid values are 14, 18, 22, and 24.

</PredictThenRun>

## Practice

Change one input or contract assertion, predict the observable result, and run the narrow HTTPX check. Do not add authentication, a database, or a solved application.

## Worked reasoning and public evidence

Keep the red failure, green HTTPX output, relevant `/openapi.json` excerpt, and one curl transcript. Explain what they prove and what remains outside R3.

## Check

```bash
uv run pytest tests/http -q
```

Read the command’s exit status and one meaningful value in its output. A green
command is necessary evidence, but you must still be able to explain why it
protects this store behavior.

<EvidenceCard
  command="uv run pytest tests/http -q"
  artifact="an OpenAPI diff, HTTP tests, and a curl transcript"
  invariant="transport validation cannot bypass domain invariants or leak stack traces"
/>

<CareerSignal
  role="Python backend engineer with production AI skills"
  signal="an OpenAPI diff, HTTP tests, and a curl transcript"
  interview-question="Why keep Pydantic request models separate from domain objects?"
/>

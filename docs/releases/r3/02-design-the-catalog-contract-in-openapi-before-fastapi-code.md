---
id: r3-02
title: "Design the catalog contract in OpenAPI before FastAPI code"
release: r3
order: 2
prerequisites: [r3-01]
outcomes:
  - Apply design the catalog contract in openapi before fastapi code to the cumulative Gold Pasal system
  - Explain the resulting behavior and its failure boundary
evidence: [commit, ci-run]
---

<LessonMission
  role="catalog manager"
  problem="Staff and future clients need a stable way to create and find catalog items."
  destination="The documented HTTP contract validates input and returns consistent success and failure shapes."
/>

# Design the catalog contract in OpenAPI before FastAPI code


## See the idea first

## Build the public contract

OpenAPI is a machine-readable catalog of paths, inputs, responses, and schemas—the springdoc role for a Spring engineer. Require `/health`, `/openapi.json`, and GET/POST `/api/catalog/items`; karats 14/18/22/24; filters, pagination, and Problem Details.

<ApiWorkbench />

## Write the failing contract first

First fetch `/openapi.json` in a failing test and assert those promises. A Python field absent from OpenAPI is not public; an OpenAPI field rejected at runtime is a broken promise.

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

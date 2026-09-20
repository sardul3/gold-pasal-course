---
id: r3-10
title: "Test routes in-process with HTTPX"
release: r3
order: 10
prerequisites: [r3-09]
outcomes:
  - Apply test routes in-process with httpx to the cumulative Gold Pasal system
  - Explain the resulting behavior and its failure boundary
evidence: [commit, ci-run]
---

<LessonMission
  role="catalog manager"
  problem="Staff and future clients need a stable way to create and find catalog items."
  destination="The documented HTTP contract validates input and returns consistent success and failure shapes."
/>

# Test routes in-process with HTTPX


## See the idea first

## Build the public contract

HTTPX can call the ASGI app without a listening port while exercising routing, validation, serialization, and exception mapping. This is an HTTP slice test, not a handler unit test.

<ApiWorkbench />

## Write the failing contract first

Author failing tests for `/health`, valid 22K creation, filtered listing, and 19K Problem Details. Assert public status, media type, and JSON—not private calls.

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

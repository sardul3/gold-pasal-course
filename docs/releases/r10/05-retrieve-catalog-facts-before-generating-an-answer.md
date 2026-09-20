---
id: r10-05
title: "Retrieve catalog facts before generating an answer"
release: r10
order: 5
prerequisites: [r10-04]
outcomes:
  - Apply retrieve catalog facts before generating an answer to the cumulative Gold Pasal system
  - Explain the resulting behavior and its failure boundary
evidence: [commit, ci-run]
---

<LessonMission
  role="online shopper"
  problem="A shopper asks whether a listed ring is 22K, but the model must not invent stock or policy details."
  destination="A local assistant retrieves catalog facts, returns structured output, and admits missing evidence."
/>

# Retrieve catalog facts before generating an answer


This is step 5 of 12. You will add one observable behavior at a time without replacing the learner-owned application with a solved sample.

## See the idea first

The model should answer from Gold Pasal’s catalog, not from facts compressed into model weights months ago. Retrieval gives it the current records for this question.

The release invariant is **probabilistic text cannot override deterministic catalog truth**. Keep that sentence testable at `POST /api/assistant/answers`.

<FailureWorkbench incident="A shopper asks whether a listed ring is 22K, but the model must not invent stock or policy details." :hypotheses="['invalid input', 'boundary failure', 'state or concurrency defect']" next-evidence="For “Is GP-RING-001 22K?”, retrieval must include that SKU; answer scoring cannot rescue a missing source." />

## Build a mental model

**Retrieval-augmented generation** first searches an authoritative source, then places selected facts into the generation context. Retrieval answers “which records are relevant?” Generation answers “how should these records be explained?”

Represent retrieved evidence as small frozen dataclasses or Pydantic models: stable record ID, approved fields, and revision or timestamp. Do not paste entire database rows. Prices, internal notes, and deleted fields should enter context only when the question requires and policy permits them.

No evidence is a normal result. Skip generation or constrain it to an uncertainty response. The API still returns HTTP 200 because the request was handled; `grounded=false` explains that Gold Pasal cannot verify the claim.

### Check the idea by hand

- Question contains exact `GP-RING-001`: retrieve that record before any semantic search.
- Context includes `record_id=GP-RING-001`, `karat=22`, and the approved display name.
- Question names `GP-NOT-REAL`: return no evidence and do not ask the model to improvise a catalog row.

## Write the failing test

Start with a small Python 3.12 test. Use Pydantic v2 for data crossing an HTTP or model boundary, `Protocol`/`dataclass` for internal seams when useful, and pytest fakes or HTTPX transports instead of live network calls.

Write the unknown-product integration test first. Then add an application-function pytest proving the generator is not called when retrieval is empty. For the known SKU, capture the generation request and assert the evidence contains the exact record ID.

Name the test from the shopper or operator outcome. Run it and confirm it fails for the missing behavior, not because the FastAPI app failed to start or the fixture is malformed. Use `pytest`; use HTTPX `AsyncClient` when the behavior crosses the FastAPI boundary. A private helper test is not enough.

## Write the production code

Add a `Retriever` Protocol and a frozen evidence dataclass. Build a context formatter with clear data delimiters. Let one typed async application function orchestrate retrieve, decide, generate, and validate.

Keep provider payloads inside adapters, domain decisions in Python, and FastAPI route functions thin. Use Pydantic v2 at untrusted boundaries; use `Protocol` and `dataclass` for internal contracts and state where they make the design clearer. Implement only enough to make the new test pass, then refactor while all earlier release behavior stays green. The lesson gives you contracts and constraints, not a finished application to copy.

## Walk one value through the system

Trace `GP-RING-001` through extraction and retrieval. Check that the public `sources` array is built from evidence objects, not copied from model text.

At every boundary, write down the Python type, whether Pydantic or domain code validates it, and how failure becomes an observable status or response. This is where “the model probably behaves” becomes an engineering claim.

<PredictThenRun prompt="What exact result or failure should the public seam produce?">

Compare your prediction with the command output. If they differ, explain the first
boundary where your mental model diverged before changing code.

</PredictThenRun>

## Practice

Remove the ring from the fake repository. Predict the generator call count and all three public fields: `grounded`, `sources`, and `answer`. Run the narrow pytest test first, then the release check.

## Worked reasoning

Retrieval narrows the evidence available to generation. It does not guarantee a correct answer; validation and evaluation still have separate jobs. Compare that reasoning with your implementation; do not copy it as a substitute for the failing test.

## Check

Start the learner-owned Gold Pasal application and run the course-owned black-box check from the course repository:

```bash
uv run --project checks pytest checks/r10/test_assistant_eval.py -q
```

For R10, inspect `grounded`, `sources`, `prompt_version`, and `model`. For R11, inspect `status`, `steps`, `pending_action`, and whether any forbidden tool executed. A green exit code is evidence only when you can explain which product boundary each assertion protects.

<EvidenceCard
  command="uv run pytest tests/evals/assistant -q"
  artifact="versioned prompts, recorded fixtures, metrics, and one failure analysis"
  invariant="probabilistic text cannot override deterministic catalog truth"
/>

<CareerSignal
  role="Python backend engineer with production AI skills"
  signal="versioned prompts, recorded fixtures, metrics, and one failure analysis"
  interview-question="How do you evaluate retrieval separately from generation?"
/>

---
id: r10-03
title: "Ask for structured output and reject invalid responses"
release: r10
order: 3
prerequisites: [r10-02]
outcomes:
  - Apply ask for structured output and reject invalid responses to the cumulative Gold Pasal system
  - Explain the resulting behavior and its failure boundary
evidence: [commit, ci-run]
---

<LessonMission
  role="online shopper"
  problem="A shopper asks whether a listed ring is 22K, but the model must not invent stock or policy details."
  destination="A local assistant retrieves catalog facts, returns structured output, and admits missing evidence."
/>

# Ask for structured output and reject invalid responses


This is step 3 of 12. You will add one observable behavior at a time without replacing the learner-owned application with a solved sample.

## See the idea first

A model can return valid-looking prose that your FastAPI route cannot safely expose. Gold Pasal needs fields it can validate before a shopper sees them.

The release invariant is **probabilistic text cannot override deterministic catalog truth**. Keep that sentence testable at `POST /api/assistant/answers`.

<FailureWorkbench incident="A shopper asks whether a listed ring is 22K, but the model must not invent stock or policy details." :hypotheses="['invalid input', 'boundary failure', 'state or concurrency defect']" next-evidence="For “Is GP-RING-001 22K?”, retrieval must include that SKU; answer scoring cannot rescue a missing source." />

## Build a mental model

**Structured output** means the model is asked for data with named fields, not an unconstrained paragraph. A candidate answer might contain `answer`, `grounded`, and `sourceIds`. JSON syntax alone is insufficient: `{"grounded":"probably"}` is valid JSON but violates the type contract.

**Schema validation** checks required fields, types, limits, and unknown fields. Parse with a dedicated Pydantic v2 candidate model configured with `extra="forbid"`, then apply domain checks: source IDs must come from retrieved evidence and `grounded=true` requires at least one source.

Treat model output as untrusted input. A parse failure is not an empty successful answer. It becomes a typed invalid-output result that policy may retry once or convert into an honest fallback.

### Check the idea by hand

- Valid candidate: `grounded=true` with source `GP-RING-001`, when that record was retrieved.
- Syntactically invalid: a prose prefix before `{...}`.
- Semantically invalid: `grounded=true` with `GP-NOT-REAL`, which was not in retrieved evidence.

## Write the failing test

Start with a small Python 3.12 test. Use Pydantic v2 for data crossing an HTTP or model boundary, `Protocol`/`dataclass` for internal seams when useful, and pytest fakes or HTTPX transports instead of live network calls.

Write `pytest.mark.parametrize` tests for malformed JSON, a missing `answer`, the wrong boolean type, an unknown source ID, and grounded-with-no-sources. Each must fail closed. Keep one valid fixture to prove the validator is not rejecting everything.

Name the test from the shopper or operator outcome. Run it and confirm it fails for the missing behavior, not because the FastAPI app failed to start or the fixture is malformed. Use `pytest`; use HTTPX `AsyncClient` when the behavior crosses the FastAPI boundary. A private helper test is not enough.

## Write the production code

Define a strict Pydantic v2 model for model output and a separate Pydantic response model for FastAPI. Call `model_validate_json`, then run a domain validator that receives the candidate and retrieved source IDs.

Keep provider payloads inside adapters, domain decisions in Python, and FastAPI route functions thin. Use Pydantic v2 at untrusted boundaries; use `Protocol` and `dataclass` for internal contracts and state where they make the design clearer. Implement only enough to make the new test pass, then refactor while all earlier release behavior stays green. The lesson gives you contracts and constraints, not a finished application to copy.

## Walk one value through the system

Walk through bytes → parsed candidate → domain validation → public response. Name the exception or result at both rejection points.

At every boundary, write down the Python type, whether Pydantic or domain code validates it, and how failure becomes an observable status or response. This is where “the model probably behaves” becomes an engineering claim.

<PredictThenRun prompt="What exact result or failure should the public seam produce?">

Compare your prediction with the command output. If they differ, explain the first
boundary where your mental model diverged before changing code.

</PredictThenRun>

## Practice

Feed `grounded=true` and `sourceIds=[]`. Predict whether parsing or domain validation catches it, then encode that distinction in the test name. Run the narrow pytest test first, then the release check.

## Worked reasoning

Parsing proves shape; domain validation proves consistency with evidence. You need both because a model can produce perfectly valid JSON containing an unsupported claim. Compare that reasoning with your implementation; do not copy it as a substitute for the failing test.

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

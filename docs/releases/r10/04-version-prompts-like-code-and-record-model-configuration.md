---
id: r10-04
title: "Version prompts like code and record model configuration"
release: r10
order: 4
prerequisites: [r10-03]
outcomes:
  - Apply version prompts like code and record model configuration to the cumulative Gold Pasal system
  - Explain the resulting behavior and its failure boundary
evidence: [commit, ci-run]
---

<LessonMission
  role="online shopper"
  problem="A shopper asks whether a listed ring is 22K, but the model must not invent stock or policy details."
  destination="A local assistant retrieves catalog facts, returns structured output, and admits missing evidence."
/>

# Version prompts like code and record model configuration


This is step 4 of 12. You will add one observable behavior at a time without replacing the learner-owned application with a solved sample.

## See the idea first

Changing one sentence in a prompt can alter answers as much as changing Python code. Without an identifier, you cannot explain why yesterday’s golden cases passed and today’s fail.

The release invariant is **probabilistic text cannot override deterministic catalog truth**. Keep that sentence testable at `POST /api/assistant/answers`.

<FailureWorkbench incident="A shopper asks whether a listed ring is 22K, but the model must not invent stock or policy details." :hypotheses="['invalid input', 'boundary failure', 'state or concurrency defect']" next-evidence="For “Is GP-RING-001 22K?”, retrieval must include that SKU; answer scoring cannot rescue a missing source." />

## Build a mental model

A **prompt version** is a stable identifier for reviewed instructions and their template. Store prompt text as a versioned resource, for example `assistant-answer-v1`, rather than an anonymous string assembled in a FastAPI route.

The **model configuration** includes model ID, temperature, token limit, format, and relevant runtime version. Record it with the response or evaluation result. The external R10 check requires non-empty `prompt_version` and `model` fields for this reason.

Version the whole policy input. A prompt change with the same label destroys reproducibility. Prefer a new immutable version and keep the previous version selectable for rollback.

### Check the idea by hand

- Run A: prompt `assistant-answer-v1`, model `llama3.2:3b`, temperature `0`.
- Run B changes one instruction: publish `assistant-answer-v2`; do not silently overwrite v1.
- An incident report can now group failures by prompt and model instead of guessing from deployment time.

## Write the failing test

Start with a small Python 3.12 test. Use Pydantic v2 for data crossing an HTTP or model boundary, `Protocol`/`dataclass` for internal seams when useful, and pytest fakes or HTTPX transports instead of live network calls.

Write a test that loads the configured prompt and asserts its nonblank version. At the HTTP seam, assert every answer returns both `prompt_version` and `model`, including uncertainty responses.

Name the test from the shopper or operator outcome. Run it and confirm it fails for the missing behavior, not because the FastAPI app failed to start or the fixture is malformed. Use `pytest`; use HTTPX `AsyncClient` when the behavior crosses the FastAPI boundary. A private helper test is not enough.

## Write the production code

Create a prompt catalog that returns immutable text plus version. Add model settings to the generation request and carry both identifiers into the public answer and evaluation record.

Keep provider payloads inside adapters, domain decisions in Python, and FastAPI route functions thin. Use Pydantic v2 at untrusted boundaries; use `Protocol` and `dataclass` for internal contracts and state where they make the design clearer. Implement only enough to make the new test pass, then refactor while all earlier release behavior stays green. The lesson gives you contracts and constraints, not a finished application to copy.

## Walk one value through the system

Trace where the prompt version is selected, where it is sent, and where it appears in the response. Verify there is no second hidden prompt in the adapter.

At every boundary, write down the Python type, whether Pydantic or domain code validates it, and how failure becomes an observable status or response. This is where “the model probably behaves” becomes an engineering claim.

<PredictThenRun prompt="What exact result or failure should the public seam produce?">

Compare your prediction with the command output. If they differ, explain the first
boundary where your mental model diverged before changing code.

</PredictThenRun>

## Practice

Add a v2 resource that changes only uncertainty wording. Run the same fixture under v1 and v2 while keeping the model ID fixed. Run the narrow pytest test first, then the release check.

## Worked reasoning

The version is provenance, not decoration. It lets you compare and roll back behavior, but only if the label is immutable and configuration is recorded with it. Compare that reasoning with your implementation; do not copy it as a substitute for the failing test.

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

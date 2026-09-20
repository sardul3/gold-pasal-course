---
id: r10-02
title: "Run Ollama and hide provider details behind an adapter"
release: r10
order: 2
prerequisites: [r10-01]
outcomes:
  - Apply run ollama and hide provider details behind an adapter to the cumulative Gold Pasal system
  - Explain the resulting behavior and its failure boundary
evidence: [commit, ci-run]
---

<LessonMission
  role="online shopper"
  problem="A shopper asks whether a listed ring is 22K, but the model must not invent stock or policy details."
  destination="A local assistant retrieves catalog facts, returns structured output, and admits missing evidence."
/>

# Run Ollama and hide provider details behind an adapter


This is step 2 of 12. You will add one observable behavior at a time without replacing the learner-owned application with a solved sample.

## See the idea first

Ollama runs the model on your machine, but its HTTP payload is not Gold Pasal’s domain model. If FastAPI route code knows Ollama field names, changing the model server will spread edits through the application.

The release invariant is **probabilistic text cannot override deterministic catalog truth**. Keep that sentence testable at `POST /api/assistant/answers`.

<FailureWorkbench incident="A shopper asks whether a listed ring is 22K, but the model must not invent stock or policy details." :hypotheses="['invalid input', 'boundary failure', 'state or concurrency defect']" next-evidence="For “Is GP-RING-001 22K?”, retrieval must include that SKU; answer scoring cannot rescue a missing source." />

## Build a mental model

An **adapter** translates one contract into another. Define a small typing `Protocol`, such as `TextGenerator.generate(request: GenerationRequest) -> GenerationResult`, in the application layer. An Ollama adapter turns that request into `/api/chat` JSON and turns the reply back into your type.

Keep `model`, base URL, timeout, and generation options in a Pydantic Settings model loaded from environment configuration. A local default is useful for development, but configuration is still validated: blank model names and malformed URLs should fail startup clearly.

Local does not mean infallible. Ollama can be stopped, loading a model can exceed the deadline, and its response can be malformed. Translate transport failures into typed application failures rather than leaking `httpx.HTTPError` to the FastAPI exception handler.

### Check the idea by hand

- Application request: prompt text, maximum output tokens, required JSON schema.
- Ollama request: provider-specific `messages`, `format`, and `options` fields.
- Application result: raw content plus model identity and latency; no Ollama response model escapes the adapter module.

## Write the failing test

Start with a small Python 3.12 test. Use Pydantic v2 for data crossing an HTTP or model boundary, `Protocol`/`dataclass` for internal seams when useful, and pytest fakes or HTTPX transports instead of live network calls.

First write an adapter test with a stub HTTP server. Verify the URL and request body, then return a small fixture and assert the application result. Add tests for connection refusal and a response missing its content field.

Name the test from the shopper or operator outcome. Run it and confirm it fails for the missing behavior, not because the FastAPI app failed to start or the fixture is malformed. Use `pytest`; use HTTPX `AsyncClient` when the behavior crosses the FastAPI boundary. A private helper test is not enough.

## Write the production code

Create the provider-neutral `Protocol` and frozen dataclasses, load `GOLD_PASAL_OLLAMA_*` settings with Pydantic Settings, and implement the adapter with HTTPX `AsyncClient`. Do not call a real model from the unit test.

Keep provider payloads inside adapters, domain decisions in Python, and FastAPI route functions thin. Use Pydantic v2 at untrusted boundaries; use `Protocol` and `dataclass` for internal contracts and state where they make the design clearer. Implement only enough to make the new test pass, then refactor while all earlier release behavior stays green. The lesson gives you contracts and constraints, not a finished application to copy.

## Walk one value through the system

Trace one call from the application function into the `Protocol`, across HTTP, and back. Point to the single adapter module that knows the Ollama JSON shape.

At every boundary, write down the Python type, whether Pydantic or domain code validates it, and how failure becomes an observable status or response. This is where “the model probably behaves” becomes an engineering claim.

<PredictThenRun prompt="What exact result or failure should the public seam produce?">

Compare your prediction with the command output. If they differ, explain the first
boundary where your mental model diverged before changing code.

</PredictThenRun>

## Practice

Change the fake Ollama response from valid content to a missing message. Predict the exact typed failure before running the adapter test. Run the narrow pytest test first, then the release check.

## Worked reasoning

The adapter succeeds when provider vocabulary stops at one boundary. This makes later fixtures and fallbacks possible; it does not prove answer quality. Compare that reasoning with your implementation; do not copy it as a substitute for the failing test.

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

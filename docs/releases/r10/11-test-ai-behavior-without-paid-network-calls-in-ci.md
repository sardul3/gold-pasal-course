---
id: r10-11
title: "Test AI behavior without paid network calls in CI"
release: r10
order: 11
prerequisites: [r10-10]
outcomes:
  - Apply test ai behavior without paid network calls in ci to the cumulative Gold Pasal system
  - Explain the resulting behavior and its failure boundary
evidence: [commit, ci-run]
---

<LessonMission
  role="online shopper"
  problem="A shopper asks whether a listed ring is 22K, but the model must not invent stock or policy details."
  destination="A local assistant retrieves catalog facts, returns structured output, and admits missing evidence."
/>

# Test AI behavior without paid network calls in CI


This is step 11 of 12. You will add one observable behavior at a time without replacing the learner-owned application with a solved sample.

## See the idea first

CI needs the same verdict on every run. Calling a live local or paid model makes results depend on network, model availability, and sampling.

The release invariant is **probabilistic text cannot override deterministic catalog truth**. Keep that sentence testable at `POST /api/assistant/answers`.

<FailureWorkbench incident="A shopper asks whether a listed ring is 22K, but the model must not invent stock or policy details." :hypotheses="['invalid input', 'boundary failure', 'state or concurrency defect']" next-evidence="For “Is GP-RING-001 22K?”, retrieval must include that SKU; answer scoring cannot rescue a missing source." />

## Build a mental model

A **test double** implements the generator port with controlled behavior. A stub returns a fixed candidate; a fake can script several outcomes and record requests. Use it for application-function and FastAPI route tests.

A **recorded fixture** captures a reviewed provider response for adapter parsing and replay. Remove secrets and personal data, store the model and schema version, and fail when the fixture no longer matches the contract.

Deterministic CI pins inputs, clocks, random seeds where applicable, and expected properties. It does not retry until green. Live-model evals belong in a separate scheduled or manual lane and must not be the only release evidence.

### Check the idea by hand

- Known-SKU fake returns a valid candidate; validation adds only retrieved sources.
- Unknown-SKU path never invokes the fake model.
- Malformed fixture always triggers the same invalid-output path without an Ollama process.

## Write the failing test

Start with a small Python 3.12 test. Use Pydantic v2 for data crossing an HTTP or model boundary, `Protocol`/`dataclass` for internal seams when useful, and pytest fakes or HTTPX transports instead of live network calls.

Write the two black-box behaviors in `checks/r10/test_assistant_eval.py` as local pytest + HTTPX tests too. Add an assertion that the fake generator call count is stable and tests make no outbound network connection.

Name the test from the shopper or operator outcome. Run it and confirm it fails for the missing behavior, not because the FastAPI app failed to start or the fixture is malformed. Use `pytest`; use HTTPX `AsyncClient` when the behavior crosses the FastAPI boundary. A private helper test is not enough.

## Write the production code

Override the generator dependency through FastAPI dependency injection, inject a clock callable for deadline tests, and use sanitized HTTPX `MockTransport` fixtures for adapter tests. Keep production wiring unchanged.

Keep provider payloads inside adapters, domain decisions in Python, and FastAPI route functions thin. Use Pydantic v2 at untrusted boundaries; use `Protocol` and `dataclass` for internal contracts and state where they make the design clearer. Implement only enough to make the new test pass, then refactor while all earlier release behavior stays green. The lesson gives you contracts and constraints, not a finished application to copy.

## Walk one value through the system

For one CI case, list every nondeterministic input and show the replacement: model → fake, clock → fixed clock, network → stub server.

At every boundary, write down the Python type, whether Pydantic or domain code validates it, and how failure becomes an observable status or response. This is where “the model probably behaves” becomes an engineering claim.

<PredictThenRun prompt="What exact result or failure should the public seam produce?">

Compare your prediction with the command output. If they differ, explain the first
boundary where your mental model diverged before changing code.

</PredictThenRun>

## Practice

Run the same test repeatedly after changing the fake to alternate outputs. It should expose the fake’s nondeterminism; then replace alternation with an explicit script per test. Run the narrow pytest test first, then the release check.

## Worked reasoning

CI proves your orchestration, validation, and contracts without claiming a live model is deterministic. Live behavior still needs a separate evaluated lane. Compare that reasoning with your implementation; do not copy it as a substitute for the failing test.

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

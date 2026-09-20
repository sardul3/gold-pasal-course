---
id: r10-12
title: "Release gate: show an evaluated assistant that admits uncertainty"
release: r10
order: 12
prerequisites: [r10-11]
outcomes:
  - Apply release gate: show an evaluated assistant that admits uncertainty to the cumulative Gold Pasal system
  - Explain the resulting behavior and its failure boundary
evidence: [commit, ci-run, demo]
---

<LessonMission
  role="online shopper"
  problem="A shopper asks whether a listed ring is 22K, but the model must not invent stock or policy details."
  destination="A local assistant retrieves catalog facts, returns structured output, and admits missing evidence."
/>

# Release gate: show an evaluated assistant that admits uncertainty


This is the release gate. You will add one observable behavior at a time without replacing the learner-owned application with a solved sample.

## See the idea first

The release is ready only when the assistant can prove a supported claim and decline an unsupported one. The failure demonstration matters as much as the happy path.

The release invariant is **probabilistic text cannot override deterministic catalog truth**. Keep that sentence testable at `POST /api/assistant/answers`.

<FailureWorkbench incident="A shopper asks whether a listed ring is 22K, but the model must not invent stock or policy details." :hypotheses="['invalid input', 'boundary failure', 'state or concurrency defect']" next-evidence="For “Is GP-RING-001 22K?”, retrieval must include that SKU; answer scoring cannot rescue a missing source." />

## Build a mental model

A **release gate** is evidence that must pass before promotion. Here it combines black-box API behavior, golden evaluation metrics, version provenance, operational bounds, and one explained failure.

**Uncertainty** is an explicit product state, not vague wording. No evidence means `grounded=false` and `sources=[]`; timeout or invalid output also fails honestly, while internal telemetry keeps the reason distinct.

A release decision compares the candidate policy with the previous one on frozen cases and slices. Keep the old prompt/model policy deployable so rollback does not require inventing a fix during an incident.

### Check the idea by hand

- Known question returns HTTP 200, a non-empty source containing `GP-RING-001`, prompt version, model, and grounded true.
- Unknown question returns HTTP 200, no sources, grounded false, and “cannot verify” meaning.
- Controlled model timeout returns an honest fallback within the deadline and records the failure category.

## Write the failing test

Start with a small Python 3.12 test. Use Pydantic v2 for data crossing an HTTP or model boundary, `Protocol`/`dataclass` for internal seams when useful, and pytest fakes or HTTPX transports instead of live network calls.

Run the external R10 checks against the started learner app. Add your larger golden set and compare slice metrics with the previous prompt version. Do not loosen the known/unknown assertions to improve the score.

Name the test from the shopper or operator outcome. Run it and confirm it fails for the missing behavior, not because the FastAPI app failed to start or the fixture is malformed. Use `pytest`; use HTTPX `AsyncClient` when the behavior crosses the FastAPI boundary. A private helper test is not enough.

## Write the production code

Wire the selected prompt, model adapter, retriever, validation, policy bounds, and telemetry behind the public endpoint. Prepare configuration rollback to the previous policy version.

Keep provider payloads inside adapters, domain decisions in Python, and FastAPI route functions thin. Use Pydantic v2 at untrusted boundaries; use `Protocol` and `dataclass` for internal contracts and state where they make the design clearer. Implement only enough to make the new test pass, then refactor while all earlier release behavior stays green. The lesson gives you contracts and constraints, not a finished application to copy.

## Walk one value through the system

Present one request from HTTP input through retrieval and validation to response, then present the no-evidence and timeout paths. Show the recorded prompt/model identifiers.

At every boundary, write down the Python type, whether Pydantic or domain code validates it, and how failure becomes an observable status or response. This is where “the model probably behaves” becomes an engineering claim.

<PredictThenRun prompt="What exact result or failure should the public seam produce?">

Compare your prediction with the command output. If they differ, explain the first
boundary where your mental model diverged before changing code.

</PredictThenRun>

## Practice

Temporarily remove `GP-RING-001` from the retrieval fixture. Predict the black-box failure and the retrieval metric before running the gate. Run the narrow pytest test first, then the release check.

## Worked reasoning

The gate defends a precise promise: supported claims cite catalog evidence; unsupported claims admit uncertainty. It does not certify every future question, so monitoring and frozen eval growth continue after release. Compare that reasoning with your implementation; do not copy it as a substitute for the failing test.

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

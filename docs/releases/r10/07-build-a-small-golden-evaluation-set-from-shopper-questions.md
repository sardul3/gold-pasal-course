---
id: r10-07
title: "Build a small golden evaluation set from shopper questions"
release: r10
order: 7
prerequisites: [r10-06]
outcomes:
  - Apply build a small golden evaluation set from shopper questions to the cumulative Gold Pasal system
  - Explain the resulting behavior and its failure boundary
evidence: [commit, ci-run]
---

<LessonMission
  role="online shopper"
  problem="A shopper asks whether a listed ring is 22K, but the model must not invent stock or policy details."
  destination="A local assistant retrieves catalog facts, returns structured output, and admits missing evidence."
/>

# Build a small golden evaluation set from shopper questions


This is step 7 of 12. You will add one observable behavior at a time without replacing the learner-owned application with a solved sample.

## See the idea first

A prompt that sounds good in one demo can fail on spelling, missing products, or unsupported stock questions. A golden set turns those product expectations into repeatable cases.

The release invariant is **probabilistic text cannot override deterministic catalog truth**. Keep that sentence testable at `POST /api/assistant/answers`.

<FailureWorkbench incident="A shopper asks whether a listed ring is 22K, but the model must not invent stock or policy details." :hypotheses="['invalid input', 'boundary failure', 'state or concurrency defect']" next-evidence="For “Is GP-RING-001 22K?”, retrieval must include that SKU; answer scoring cannot rescue a missing source." />

## Build a mental model

A **golden evaluation set** is a small, reviewed collection of inputs and expected properties. “Golden” means curated, not perfect forever. Each case should explain why it exists and which behavior would be harmful if it regressed.

Prefer properties over exact prose. Require the source ID, grounding decision, or uncertainty class; do not fail because “cannot verify” changed to “I cannot confirm.” Exact string checks are useful only where wording itself is the contract.

Cover slices: known versus unknown SKU, exact versus descriptive query, answerable versus unanswerable question, and adversarial catalog text. Keep a frozen holdout so prompt tuning does not optimize every case you use to judge release quality.

### Check the idea by hand

- Known: “Is GP-RING-001 22K?” expects source `GP-RING-001` and grounded true.
- Unknown: “Is GP-NOT-REAL available?” expects no source and uncertainty.
- Unsupported: a return-policy question expects no catalog-grounded claim unless policy evidence is retrieved.

## Write the failing test

Start with a small Python 3.12 test. Use Pydantic v2 for data crossing an HTTP or model boundary, `Protocol`/`dataclass` for internal seams when useful, and pytest fakes or HTTPX transports instead of live network calls.

Define the evaluation case schema and write a parameterized harness before adding many cases. Start with the two behaviors enforced by `checks/r10/test_assistant_eval.py`, then add slices without weakening those assertions.

Name the test from the shopper or operator outcome. Run it and confirm it fails for the missing behavior, not because the FastAPI app failed to start or the fixture is malformed. Use `pytest`; use HTTPX `AsyncClient` when the behavior crosses the FastAPI boundary. A private helper test is not enough.

## Write the production code

Build an evaluator that invokes the public or application seam and records case ID, prompt version, model, retrieved IDs, result, and latency. Keep cases as reviewed data, not Python literals scattered across test modules.

Keep provider payloads inside adapters, domain decisions in Python, and FastAPI route functions thin. Use Pydantic v2 at untrusted boundaries; use `Protocol` and `dataclass` for internal contracts and state where they make the design clearer. Implement only enough to make the new test pass, then refactor while all earlier release behavior stays green. The lesson gives you contracts and constraints, not a finished application to copy.

## Walk one value through the system

Choose one failed case and distinguish fixture error, retrieval miss, invalid model output, and unsupported answer. Record only one primary failure reason.

At every boundary, write down the Python type, whether Pydantic or domain code validates it, and how failure becomes an observable status or response. This is where “the model probably behaves” becomes an engineering claim.

<PredictThenRun prompt="What exact result or failure should the public seam produce?">

Compare your prediction with the command output. If they differ, explain the first
boundary where your mental model diverged before changing code.

</PredictThenRun>

## Practice

Add a typo case for `GP-RING-001`. Decide whether the expected behavior is correction, uncertainty, or a search result, and write the rationale before running it. Run the narrow pytest test first, then the release check.

## Worked reasoning

A useful golden set encodes product decisions and representative risks. It is small enough to review and split so that tuning data does not masquerade as independent evidence. Compare that reasoning with your implementation; do not copy it as a substitute for the failing test.

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

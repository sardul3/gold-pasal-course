---
id: r10-01
title: "Separate deterministic product logic from probabilistic model behavior"
release: r10
order: 1
prerequisites: []
outcomes:
  - Apply separate deterministic product logic from probabilistic model behavior to the cumulative Gold Pasal system
  - Explain the resulting behavior and its failure boundary
evidence: [commit, ci-run]
---

<LessonMission
  role="online shopper"
  problem="A shopper asks whether a listed ring is 22K, but the model must not invent stock or policy details."
  destination="A local assistant retrieves catalog facts, returns structured output, and admits missing evidence."
/>

# Separate deterministic product logic from probabilistic model behavior


This is step 1 of 12. You will add one observable behavior at a time without replacing the learner-owned application with a solved sample.

## See the idea first

A shopper asks, “Is GP-RING-001 22K?” The catalog row can answer that question exactly. A language model can only produce a likely sequence of words. If those two sources disagree, the catalog must win.

The release invariant is **probabilistic text cannot override deterministic catalog truth**. Keep that sentence testable at `POST /api/assistant/answers`.

<FailureWorkbench incident="A shopper asks whether a listed ring is 22K, but the model must not invent stock or policy details." :hypotheses="['invalid input', 'boundary failure', 'state or concurrency defect']" next-evidence="For “Is GP-RING-001 22K?”, retrieval must include that SKU; answer scoring cannot rescue a missing source." />

## Build a mental model

A **deterministic** operation gives the same result from the same stored facts: reading `karat = 22` and comparing it with `22` always returns `true`. A **probabilistic** operation chooses likely text; even with temperature zero, model versions and runtimes can change the wording or the claim.

Put a boundary between them. Python code retrieves and validates catalog facts, then the model may phrase those facts. Python code decides whether evidence exists and which source IDs may be returned. The model never decides stock, price, karat, or whether an answer is grounded.

For `GP-NOT-REAL`, the important result is not fluent prose. It is `grounded=false`, an empty `sources` list, and honest uncertainty. This is a product rule expressed as code.

### Check the idea by hand

- Catalog lookup returns `GP-RING-001, karat=22`: generation may say “Yes,” but the response must cite `GP-RING-001`.
- Catalog lookup returns no row: generation must not turn prior knowledge into a catalog claim.
- The model says “18K” while the row says `22`: validation rejects or replaces the claim; it never edits the row.

## Write the failing test

Start with a small Python 3.12 test. Use Pydantic v2 for data crossing an HTTP or model boundary, `Protocol`/`dataclass` for internal seams when useful, and pytest fakes or HTTPX transports instead of live network calls.

Write a pytest integration test with HTTPX `AsyncClient` that posts the known-SKU question. Assert HTTP 200, `grounded == true`, and a source whose `record_id` is `GP-RING-001`. Add the unknown-SKU test before production code: assert `grounded == false`, no sources, and wording such as “cannot verify.”

Name the test from the shopper or operator outcome. Run it and confirm it fails for the missing behavior, not because the FastAPI app failed to start or the fixture is malformed. Use `pytest`; use HTTPX `AsyncClient` when the behavior crosses the FastAPI boundary. A private helper test is not enough.

## Write the production code

Introduce separate ports for catalog retrieval and text generation. Make the typed application function compute grounding from retrieved records, not from a model-provided boolean. Keep domain comparisons in ordinary typed Python functions.

Keep provider payloads inside adapters, domain decisions in Python, and FastAPI route functions thin. Use Pydantic v2 at untrusted boundaries; use `Protocol` and `dataclass` for internal contracts and state where they make the design clearer. Implement only enough to make the new test pass, then refactor while all earlier release behavior stays green. The lesson gives you contracts and constraints, not a finished application to copy.

## Walk one value through the system

Trace `question → extracted SKU → catalog record(s) → evidence decision → model draft → validated API response`. Mark which arrows are deterministic and where probabilistic text is allowed.

At every boundary, write down the Python type, whether Pydantic or domain code validates it, and how failure becomes an observable status or response. This is where “the model probably behaves” becomes an engineering claim.

<PredictThenRun prompt="What exact result or failure should the public seam produce?">

Compare your prediction with the command output. If they differ, explain the first
boundary where your mental model diverged before changing code.

</PredictThenRun>

## Practice

Make a fake model confidently claim that `GP-NOT-REAL` is in stock. Your test should still observe empty sources and an uncertainty answer. Run the narrow pytest test first, then the release check.

## Worked reasoning

The key design choice is authority: catalog code owns facts; the model owns phrasing. A passing test proves the HTTP boundary enforces this case, not that every future question is safe. Compare that reasoning with your implementation; do not copy it as a substitute for the failing test.

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

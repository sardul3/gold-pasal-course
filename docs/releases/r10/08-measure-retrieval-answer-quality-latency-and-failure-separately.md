---
id: r10-08
title: "Measure retrieval, answer quality, latency, and failure separately"
release: r10
order: 8
prerequisites: [r10-07]
outcomes:
  - Apply measure retrieval, answer quality, latency, and failure separately to the cumulative Gold Pasal system
  - Explain the resulting behavior and its failure boundary
evidence: [commit, ci-run]
---

<LessonMission
  role="online shopper"
  problem="A shopper asks whether a listed ring is 22K, but the model must not invent stock or policy details."
  destination="A local assistant retrieves catalog facts, returns structured output, and admits missing evidence."
/>

# Measure retrieval, answer quality, latency, and failure separately


This is step 8 of 12. You will add one observable behavior at a time without replacing the learner-owned application with a solved sample.

## See the idea first

“The assistant scored 90%” hides where the other 10% failed. A shopper sees different harm from no retrieval, a fabricated answer, and a ten-second timeout.

The release invariant is **probabilistic text cannot override deterministic catalog truth**. Keep that sentence testable at `POST /api/assistant/answers`.

<FailureWorkbench incident="A shopper asks whether a listed ring is 22K, but the model must not invent stock or policy details." :hypotheses="['invalid input', 'boundary failure', 'state or concurrency defect']" next-evidence="For “Is GP-RING-001 22K?”, retrieval must include that SKU; answer scoring cannot rescue a missing source." />

## Build a mental model

**Retrieval quality** asks whether the needed record appears in the top results. Recall-at-k is the fraction of answerable cases where the expected record appears among the first k.

**Answer quality** asks whether claims are supported and uncertainty is honest. Measure grounded precision, unsupported-claim count, and required-source presence separately from style.

**Operational metrics** include latency and failure rate. Record retrieval time, model time, total time, parse failures, timeouts, and fallbacks. Use percentiles for latency because one average can hide slow tail requests.

Split results by case type: known/unknown, exact/descriptive, and normal/adversarial. A global score can improve while unknown-product honesty gets worse.

### Check the idea by hand

- Expected ID absent: retrieval failure; do not blame generation.
- Expected ID present but answer claims a different karat: answer/validation failure.
- Correct answer after 12 seconds: quality pass, latency failure.
- Honest fallback after timeout: availability degraded, safety preserved.

## Write the failing test

Start with a small Python 3.12 test. Use Pydantic v2 for data crossing an HTTP or model boundary, `Protocol`/`dataclass` for internal seams when useful, and pytest fakes or HTTPX transports instead of live network calls.

Write pytest metric-aggregation tests using hand-checkable cases: two retrieval hits out of three gives recall `2/3`; one unsupported grounded answer out of four affects grounded precision. Test zero denominators explicitly.

Name the test from the shopper or operator outcome. Run it and confirm it fails for the missing behavior, not because the FastAPI app failed to start or the fixture is malformed. Use `pytest`; use HTTPX `AsyncClient` when the behavior crosses the FastAPI boundary. A private helper test is not enough.

## Write the production code

Emit a typed result per case, then aggregate retrieval, answer, latency, and failure fields independently. Produce slice results before any single release summary.

Keep provider payloads inside adapters, domain decisions in Python, and FastAPI route functions thin. Use Pydantic v2 at untrusted boundaries; use `Protocol` and `dataclass` for internal contracts and state where they make the design clearer. Implement only enough to make the new test pass, then refactor while all earlier release behavior stays green. The lesson gives you contracts and constraints, not a finished application to copy.

## Walk one value through the system

Take one golden case and show its retrieval result, validation result, timings, and terminal status. Do not collapse it to pass/fail until the end.

At every boundary, write down the Python type, whether Pydantic or domain code validates it, and how failure becomes an observable status or response. This is where “the model probably behaves” becomes an engineering claim.

<PredictThenRun prompt="What exact result or failure should the public seam produce?">

Compare your prediction with the command output. If they differ, explain the first
boundary where your mental model diverged before changing code.

</PredictThenRun>

## Practice

Change one case from a retrieval miss to an honest no-evidence answer. Predict which metrics change and which stay fixed. Run the narrow pytest test first, then the release check.

## Worked reasoning

Separate metrics make the next engineering action visible. They also prevent a fluent answer score from hiding a broken retriever or an unsafe unknown-product slice. Compare that reasoning with your implementation; do not copy it as a substitute for the failing test.

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

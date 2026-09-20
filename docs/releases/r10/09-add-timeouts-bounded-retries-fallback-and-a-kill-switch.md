---
id: r10-09
title: "Add timeouts, bounded retries, fallback, and a kill switch"
release: r10
order: 9
prerequisites: [r10-08]
outcomes:
  - Apply add timeouts, bounded retries, fallback, and a kill switch to the cumulative Gold Pasal system
  - Explain the resulting behavior and its failure boundary
evidence: [commit, ci-run]
---

<LessonMission
  role="online shopper"
  problem="A shopper asks whether a listed ring is 22K, but the model must not invent stock or policy details."
  destination="A local assistant retrieves catalog facts, returns structured output, and admits missing evidence."
/>

# Add timeouts, bounded retries, fallback, and a kill switch


This is step 9 of 12. You will add one observable behavior at a time without replacing the learner-owned application with a solved sample.

## See the idea first

If Ollama hangs, a web request must not wait forever. If it fails twice, a third identical call rarely helps the shopper. Operations policy belongs in code.

The release invariant is **probabilistic text cannot override deterministic catalog truth**. Keep that sentence testable at `POST /api/assistant/answers`.

<FailureWorkbench incident="A shopper asks whether a listed ring is 22K, but the model must not invent stock or policy details." :hypotheses="['invalid input', 'boundary failure', 'state or concurrency defect']" next-evidence="For “Is GP-RING-001 22K?”, retrieval must include that SKU; answer scoring cannot rescue a missing source." />

## Build a mental model

A **timeout** is the maximum time allowed for one operation. Set connect and response deadlines below the API request budget so there is time to produce a fallback.

A **bounded retry** has an explicit attempt limit and retries only transient failures such as a timeout or 503. Invalid JSON and 4xx requests usually need correction, not repetition. Backoff consumes the same total deadline.

A **fallback** is a known degraded response, such as “I cannot verify this right now,” never invented catalog data. A **kill switch** disables model generation immediately through validated configuration while leaving deterministic catalog behavior available.

### Check the idea by hand

- Attempt 1 times out; attempt 2 succeeds within the total deadline: return the validated answer and record two attempts.
- Both attempts time out: return grounded false with no fabricated source.
- Kill switch off: do not call Ollama even if it is healthy.

## Write the failing test

Start with a small Python 3.12 test. Use Pydantic v2 for data crossing an HTTP or model boundary, `Protocol`/`dataclass` for internal seams when useful, and pytest fakes or HTTPX transports instead of live network calls.

Use a fake generator with scripted outcomes. Assert exact call counts for success, retryable timeout, non-retryable invalid output, exhausted retries, and disabled generation. Use a fake clock if backoff is tested.

Name the test from the shopper or operator outcome. Run it and confirm it fails for the missing behavior, not because the FastAPI app failed to start or the fixture is malformed. Use `pytest`; use HTTPX `AsyncClient` when the behavior crosses the FastAPI boundary. A private helper test is not enough.

## Write the production code

Wrap generation in a policy component with a total deadline and max attempts. Classify failures explicitly. Read the kill switch at the application boundary and attach the fallback reason to internal metrics.

Keep provider payloads inside adapters, domain decisions in Python, and FastAPI route functions thin. Use Pydantic v2 at untrusted boundaries; use `Protocol` and `dataclass` for internal contracts and state where they make the design clearer. Implement only enough to make the new test pass, then refactor while all earlier release behavior stays green. The lesson gives you contracts and constraints, not a finished application to copy.

## Walk one value through the system

Trace the remaining deadline before each attempt. Show why the loop cannot exceed attempts or wall-clock budget.

At every boundary, write down the Python type, whether Pydantic or domain code validates it, and how failure becomes an observable status or response. This is where “the model probably behaves” becomes an engineering claim.

<PredictThenRun prompt="What exact result or failure should the public seam produce?">

Compare your prediction with the command output. If they differ, explain the first
boundary where your mental model diverged before changing code.

</PredictThenRun>

## Practice

Script timeout, timeout, success with `maxAttempts=2`. Predict the call count and public response; the third result must remain unused. Run the narrow pytest test first, then the release check.

## Worked reasoning

Bounds turn an unreliable dependency into predictable API behavior. Retries protect availability only when limited and classified; fallback protects honesty; the switch protects operators. Compare that reasoning with your implementation; do not copy it as a substitute for the failing test.

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

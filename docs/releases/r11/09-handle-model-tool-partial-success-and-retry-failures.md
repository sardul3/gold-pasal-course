---
id: r11-09
title: "Handle model, tool, partial-success, and retry failures"
release: r11
order: 9
prerequisites: [r11-08]
outcomes:
  - Apply handle model, tool, partial-success, and retry failures to the cumulative Gold Pasal system
  - Explain the resulting behavior and its failure boundary
evidence: [commit, ci-run]
---

<LessonMission
  role="staff assistant operator"
  problem="A model can search and propose a hold, but it must stop before an unapproved inventory change."
  destination="Typed tools, budgets, approvals, and durable state make every run bounded and inspectable."
/>

# Handle model, tool, partial-success, and retry failures


This is step 9 of 11. You will add one observable behavior at a time without replacing the learner-owned application with a solved sample.

## See the idea first

A model timeout, an API 429, and “hold created but response lost” are different failures. One generic retry rule can duplicate side effects.

The release invariant is **stop conditions and approval states are enforced by code outside the model**. Keep that sentence testable at `POST /api/agent/runs`.

<FailureWorkbench incident="A model can search and propose a hold, but it must stop before an unapproved inventory change." :hypotheses="['invalid input', 'boundary failure', 'state or concurrency defect']" next-evidence="A request to hold GP-N-042 may search once and propose one create-hold call, then enter awaiting-approval instead of looping." />

## Build a mental model

Classify failures by stage and certainty: model failure before a proposal, tool failure before execution, known API rejection, and **ambiguous success** where a mutation may have completed but its response was lost.

Retry only when the operation is retryable and budget remains. Read operations are usually safer to retry. Mutations require an idempotency key and reconciliation. Never ask the model to guess whether a hold exists.

A **partial success** records completed steps and a safe terminal or resumable state. Preserve the original failure and attempt count. Do not fabricate a successful tool result to keep the conversation smooth.

### Check the idea by hand

- Model timeout before action: bounded model retry or failed_safely.
- Search API 503: retry within deadline.
- Hold API 409: known business conflict; do not repeat as transient.
- Connection drops after POST hold: query/replay by idempotency key before deciding.

## Write the failing test

Start with a small Python 3.12 test. Use Pydantic v2 for data crossing an HTTP or model boundary, `Protocol`/`dataclass` for internal seams when useful, and pytest fakes or HTTPX transports instead of live network calls.

Script each failure at a fake model/API. Assert attempts, terminal status, durable step records, and external call count. Include timeout after mutation acceptance and prove no second hold.

Name the test from the shopper or operator outcome. Run it and confirm it fails for the missing behavior, not because the FastAPI app failed to start or the fixture is malformed. Use `pytest`; use HTTPX `AsyncClient` when the behavior crosses the FastAPI boundary. A private helper test is not enough.

## Write the production code

Create Python enums for failure kinds and a retry policy keyed by operation semantics. Persist attempt start and idempotency key before mutation, then reconcile ambiguous outcomes.

Keep provider payloads inside adapters, domain decisions in Python, and FastAPI route functions thin. Use Pydantic v2 at untrusted boundaries; use `Protocol` and `dataclass` for internal contracts and state where they make the design clearer. Implement only enough to make the new test pass, then refactor while all earlier release behavior stays green. The lesson gives you contracts and constraints, not a finished application to copy.

## Walk one value through the system

For each retry, show the evidence that the prior attempt had no effect or can be deduplicated. If that evidence is missing, stop safely.

At every boundary, write down the Python type, whether Pydantic or domain code validates it, and how failure becomes an observable status or response. This is where “the model probably behaves” becomes an engineering claim.

<PredictThenRun prompt="What exact result or failure should the public seam produce?">

Compare your prediction with the command output. If they differ, explain the first
boundary where your mental model diverged before changing code.

</PredictThenRun>

## Practice

Return 429 for search and 409 for hold. Predict which retries and why, using the same remaining deadline. Run the narrow pytest test first, then the release check.

## Worked reasoning

Safe failure handling preserves truth about side effects. Bounded retries help transient reads; idempotency and reconciliation protect mutations; uncertainty stops guessing. Compare that reasoning with your implementation; do not copy it as a substitute for the failing test.

## Check

Start the learner-owned Gold Pasal application and run the course-owned black-box check from the course repository:

```bash
uv run --project checks pytest checks/r11/test_bounded_agent.py -q
```

For R10, inspect `grounded`, `sources`, `prompt_version`, and `model`. For R11, inspect `status`, `steps`, `pending_action`, and whether any forbidden tool executed. A green exit code is evidence only when you can explain which product boundary each assertion protects.

<EvidenceCard
  command="uv run pytest tests/evals/agent -q"
  artifact="golden trajectories, traces, and a denied-action demonstration"
  invariant="stop conditions and approval states are enforced by code outside the model"
/>

<CareerSignal
  role="Python backend engineer with production AI skills"
  signal="golden trajectories, traces, and a denied-action demonstration"
  interview-question="When is a deterministic workflow better than an agent?"
/>

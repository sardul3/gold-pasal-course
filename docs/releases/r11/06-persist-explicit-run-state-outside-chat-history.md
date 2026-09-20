---
id: r11-06
title: "Persist explicit run state outside chat history"
release: r11
order: 6
prerequisites: [r11-05]
outcomes:
  - Apply persist explicit run state outside chat history to the cumulative Gold Pasal system
  - Explain the resulting behavior and its failure boundary
evidence: [commit, ci-run]
---

<LessonMission
  role="staff assistant operator"
  problem="A model can search and propose a hold, but it must stop before an unapproved inventory change."
  destination="Typed tools, budgets, approvals, and durable state make every run bounded and inspectable."
/>

# Persist explicit run state outside chat history


This is step 6 of 11. You will add one observable behavior at a time without replacing the learner-owned application with a solved sample.

## See the idea first

A process restart after asking for approval must not forget what was proposed or execute it twice. Chat history is not a transaction log.

The release invariant is **stop conditions and approval states are enforced by code outside the model**. Keep that sentence testable at `POST /api/agent/runs`.

<FailureWorkbench incident="A model can search and propose a hold, but it must stop before an unapproved inventory change." :hypotheses="['invalid input', 'boundary failure', 'state or concurrency defect']" next-evidence="A request to hold GP-N-042 may search once and propose one create-hold call, then enter awaiting-approval instead of looping." />

## Build a mental model

**Durable run state** lives in a database and survives process or model restarts. Store run ID, status, step index, budgets, policy version, pending action, tool result references, and timestamps.

Treat statuses as a state machine: for example `RUNNING → AWAITING_APPROVAL → SUCCEEDED`, with explicit denied, failed, expired, and cancelled terminals. Reject impossible transitions such as `SUCCEEDED → RUNNING`.

Use optimistic locking or another concurrency control so two workers cannot advance the same run version. Store idempotency keys and result IDs before retrying uncertain mutations.

### Check the idea by hand

- Restart while awaiting approval: GET run still shows the same unexecuted pending hold.
- Two approval requests race: one transition wins; the other observes the new version and returns the recorded result.
- Restart after API success but before response: reconcile via idempotency key rather than issuing a new hold.

## Write the failing test

Start with a small Python 3.12 test. Use Pydantic v2 for data crossing an HTTP or model boundary, `Protocol`/`dataclass` for internal seams when useful, and pytest fakes or HTTPX transports instead of live network calls.

Write repository/state-machine tests for allowed and forbidden transitions, then an integration test that reloads an awaiting run from persistence. Add a concurrent duplicate-approval case.

Name the test from the shopper or operator outcome. Run it and confirm it fails for the missing behavior, not because the FastAPI app failed to start or the fixture is malformed. Use `pytest`; use HTTPX `AsyncClient` when the behavior crosses the FastAPI boundary. A private helper test is not enough.

## Write the production code

Define run state as a dataclass or persistence model separately from prompt messages. Save after every observed action/result boundary. Resume from status and version, not by asking the model what happened.

Keep provider payloads inside adapters, domain decisions in Python, and FastAPI route functions thin. Use Pydantic v2 at untrusted boundaries; use `Protocol` and `dataclass` for internal contracts and state where they make the design clearer. Implement only enough to make the new test pass, then refactor while all earlier release behavior stays green. The lesson gives you contracts and constraints, not a finished application to copy.

## Walk one value through the system

Trace a restart at each side of a hold call. Explain which persisted field prevents loss or duplicate execution.

At every boundary, write down the Python type, whether Pydantic or domain code validates it, and how failure becomes an observable status or response. This is where “the model probably behaves” becomes an engineering claim.

<PredictThenRun prompt="What exact result or failure should the public seam produce?">

Compare your prediction with the command output. If they differ, explain the first
boundary where your mental model diverged before changing code.

</PredictThenRun>

## Practice

Simulate a crash after storing the pending action but before returning HTTP 202. Predict what a retry of run creation should do if it carries an idempotency key. Run the narrow pytest test first, then the release check.

## Worked reasoning

Durability makes approval and retries trustworthy. The database state, not generated text, is the authority on what happened and what may happen next. Compare that reasoning with your implementation; do not copy it as a substitute for the failing test.

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

---
id: r11-05
title: "Require confirmation before inventory-changing actions"
release: r11
order: 5
prerequisites: [r11-04]
outcomes:
  - Apply require confirmation before inventory-changing actions to the cumulative Gold Pasal system
  - Explain the resulting behavior and its failure boundary
evidence: [commit, ci-run]
---

<LessonMission
  role="staff assistant operator"
  problem="A model can search and propose a hold, but it must stop before an unapproved inventory change."
  destination="Typed tools, budgets, approvals, and durable state make every run bounded and inspectable."
/>

# Require confirmation before inventory-changing actions


This is step 5 of 11. You will add one observable behavior at a time without replacing the learner-owned application with a solved sample.

## See the idea first

Preparing a hold is reversible; executing it changes scarce inventory. The run must become `awaiting_approval` before the hold API is called.

The release invariant is **stop conditions and approval states are enforced by code outside the model**. Keep that sentence testable at `POST /api/agent/runs`.

<FailureWorkbench incident="A model can search and propose a hold, but it must stop before an unapproved inventory change." :hypotheses="['invalid input', 'boundary failure', 'state or concurrency defect']" next-evidence="A request to hold GP-N-042 may search once and propose one create-hold call, then enter awaiting-approval instead of looping." />

## Build a mental model

An **approval state** is durable control state, not a sentence saying “shall I proceed?” The pending action stores the exact tool, validated arguments, policy version, and an expiry.

Approval applies to that immutable action. If the SKU, customer, or quantity changes, create a new pending action and request approval again. Prevent stale approvals with a digest or version.

After approval, execute once with an idempotency key. A repeated approve request should return the same outcome, not create a second hold. Rejection and expiry are terminal or require a fresh proposal.

### Check the idea by hand

- Search finds `GP-N-042`; harness records a proposed `create_hold` and returns HTTP 202 with `executed=false`.
- Staff approves pending action `pa-17`; the harness verifies actor and digest, then calls the API.
- Model claims “approved by user” in text: ignored because no approval record exists.

## Write the failing test

Start with a small Python 3.12 test. Use Pydantic v2 for data crossing an HTTP or model boundary, `Protocol`/`dataclass` for internal seams when useful, and pytest fakes or HTTPX transports instead of live network calls.

First encode the external contract: status awaiting approval, pending tool create_hold, executed false. Add tests for approve, reject, expired approval, changed arguments, duplicate approval, and unauthorized approver.

Name the test from the shopper or operator outcome. Run it and confirm it fails for the missing behavior, not because the FastAPI app failed to start or the fixture is malformed. Use `pytest`; use HTTPX `AsyncClient` when the behavior crosses the FastAPI boundary. A private helper test is not enough.

## Write the production code

Model pending actions with strict Pydantic models and approval transitions with an explicit `RunStatus` enum. Commit the awaiting state before returning it. Put the API call only in the approved transition handler, never in the model step.

Keep provider payloads inside adapters, domain decisions in Python, and FastAPI route functions thin. Use Pydantic v2 at untrusted boundaries; use `Protocol` and `dataclass` for internal contracts and state where they make the design clearer. Implement only enough to make the new test pass, then refactor while all earlier release behavior stays green. The lesson gives you contracts and constraints, not a finished application to copy.

## Walk one value through the system

Show the database write that precedes the HTTP 202 response and the separate command that executes the action. Confirm no tool call occurs between them.

At every boundary, write down the Python type, whether Pydantic or domain code validates it, and how failure becomes an observable status or response. This is where “the model probably behaves” becomes an engineering claim.

<PredictThenRun prompt="What exact result or failure should the public seam produce?">

Compare your prediction with the command output. If they differ, explain the first
boundary where your mental model diverged before changing code.

</PredictThenRun>

## Practice

Approve quantity one, then alter the pending JSON to quantity two. Predict the digest check and inventory effect. Run the narrow pytest test first, then the release check.

## Worked reasoning

Approval is safe when code binds a human decision to one immutable action and executes it idempotently. Conversational confirmation is not approval. Compare that reasoning with your implementation; do not copy it as a substitute for the failing test.

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

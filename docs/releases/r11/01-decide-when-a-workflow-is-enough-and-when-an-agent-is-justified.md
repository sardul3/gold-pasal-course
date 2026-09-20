---
id: r11-01
title: "Decide when a workflow is enough and when an agent is justified"
release: r11
order: 1
prerequisites: []
outcomes:
  - Apply decide when a workflow is enough and when an agent is justified to the cumulative Gold Pasal system
  - Explain the resulting behavior and its failure boundary
evidence: [commit, ci-run]
---

<LessonMission
  role="staff assistant operator"
  problem="A model can search and propose a hold, but it must stop before an unapproved inventory change."
  destination="Typed tools, budgets, approvals, and durable state make every run bounded and inspectable."
/>

# Decide when a workflow is enough and when an agent is justified


This is step 1 of 11. You will add one observable behavior at a time without replacing the learner-owned application with a solved sample.

## See the idea first

A staff member asks, “Find GP-N-042 and place a hold for customer-1.” Searching and then waiting for approval is predictable. Letting a model repeatedly choose actions may add risk without adding value.

The release invariant is **stop conditions and approval states are enforced by code outside the model**. Keep that sentence testable at `POST /api/agent/runs`.

<FailureWorkbench incident="A model can search and propose a hold, but it must stop before an unapproved inventory change." :hypotheses="['invalid input', 'boundary failure', 'state or concurrency defect']" next-evidence="A request to hold GP-N-042 may search once and propose one create-hold call, then enter awaiting-approval instead of looping." />

## Build a mental model

A **workflow** has known states and transitions written in code. For this request: search, propose a hold, wait for approval, then execute or cancel. Use it when the path is known and correctness matters more than flexible planning.

An **agent** uses a model to choose the next action after observing results. It is justified when the next useful step genuinely depends on ambiguous evidence—for example, deciding whether to search by SKU or ask staff for a missing identifier.

Even an agent runs inside a deterministic harness. The harness owns tools, approval, budgets, state transitions, and stop conditions. The model proposes; Python policy code authorizes and persists.

### Check the idea by hand

- “Show order GP-100” is one API call: use a workflow or ordinary application function.
- “Find the necklace the customer described, then prepare a hold” may need model-guided search refinement.
- “Create the hold” is never model discretion; it is a typed action gated by approval.

## Write the failing test

Start with a small Python 3.12 test. Use Pydantic v2 for data crossing an HTTP or model boundary, `Protocol`/`dataclass` for internal seams when useful, and pytest fakes or HTTPX transports instead of live network calls.

Write a black-box test for the release goal before the loop. Post a run with `max_steps=4`; assert status `awaiting_approval`, no more than four steps, pending tool `create_hold`, and `executed=false`.

Name the test from the shopper or operator outcome. Run it and confirm it fails for the missing behavior, not because the FastAPI app failed to start or the fixture is malformed. Use `pytest`; use HTTPX `AsyncClient` when the behavior crosses the FastAPI boundary. A private helper test is not enough.

## Write the production code

Write the workflow state diagram first. Introduce a model decision only at a branch that cannot be expressed from typed input. Keep state transitions and approval in a typed async application function outside the FastAPI route.

Keep provider payloads inside adapters, domain decisions in Python, and FastAPI route functions thin. Use Pydantic v2 at untrusted boundaries; use `Protocol` and `dataclass` for internal contracts and state where they make the design clearer. Implement only enough to make the new test pass, then refactor while all earlier release behavior stays green. The lesson gives you contracts and constraints, not a finished application to copy.

## Walk one value through the system

Classify each transition as fixed workflow or model-selected proposal. If every next step is known, remove the agent loop.

At every boundary, write down the Python type, whether Pydantic or domain code validates it, and how failure becomes an observable status or response. This is where “the model probably behaves” becomes an engineering claim.

<PredictThenRun prompt="What exact result or failure should the public seam produce?">

Compare your prediction with the command output. If they differ, explain the first
boundary where your mental model diverged before changing code.

</PredictThenRun>

## Practice

Rewrite the hold request as a four-state workflow. Identify one concrete requirement that would justify adding agent choice; “AI experience” does not count. Run the narrow pytest test first, then the release check.

## Worked reasoning

Choose an agent for uncertain action selection, not for a known sequence. The release still uses workflow states around that choice so inventory cannot change by conversation alone. Compare that reasoning with your implementation; do not copy it as a substitute for the failing test.

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

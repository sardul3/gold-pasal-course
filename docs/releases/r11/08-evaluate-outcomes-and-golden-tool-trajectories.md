---
id: r11-08
title: "Evaluate outcomes and golden tool trajectories"
release: r11
order: 8
prerequisites: [r11-07]
outcomes:
  - Apply evaluate outcomes and golden tool trajectories to the cumulative Gold Pasal system
  - Explain the resulting behavior and its failure boundary
evidence: [commit, ci-run]
---

<LessonMission
  role="staff assistant operator"
  problem="A model can search and propose a hold, but it must stop before an unapproved inventory change."
  destination="Typed tools, budgets, approvals, and durable state make every run bounded and inspectable."
/>

# Evaluate outcomes and golden tool trajectories


This is step 8 of 11. You will add one observable behavior at a time without replacing the learner-owned application with a solved sample.

## See the idea first

A final answer can look correct even if the agent called the wrong tool three times. Agent evaluation must judge both what happened and how it happened.

The release invariant is **stop conditions and approval states are enforced by code outside the model**. Keep that sentence testable at `POST /api/agent/runs`.

<FailureWorkbench incident="A model can search and propose a hold, but it must stop before an unapproved inventory change." :hypotheses="['invalid input', 'boundary failure', 'state or concurrency defect']" next-evidence="A request to hold GP-N-042 may search once and propose one create-hold call, then enter awaiting-approval instead of looping." />

## Build a mental model

An **outcome evaluation** checks terminal state and external effect: the run waits for approval, the order status is correct, or no hold was created.

A **trajectory** is the ordered sequence of observations, proposed tools, policy decisions, and results. A golden trajectory describes required and forbidden properties rather than one brittle exact chain when several safe paths are valid.

Measure task success, unsafe calls, unnecessary steps, latency, and cost separately. Prefer programmatic checks for tool names and API effects; use a frozen rubric judge only for genuinely qualitative text.

### Check the idea by hand

- Outcome pass: pending hold exists and is unexecuted.
- Trajectory fail: model attempted `shell` before reaching that safe outcome.
- Efficient pass: search then pending hold in at most four steps.
- Safe denial: hostile goal ends denied/failed_safely and no step tool equals shell.

## Write the failing test

Start with a small Python 3.12 test. Use Pydantic v2 for data crossing an HTTP or model boundary, `Protocol`/`dataclass` for internal seams when useful, and pytest fakes or HTTPX transports instead of live network calls.

Encode both external R11 checks as golden cases. Assert terminal status and pending action, plus trajectory predicates: maximum steps, allowed tool set, no side effect before approval.

Name the test from the shopper or operator outcome. Run it and confirm it fails for the missing behavior, not because the FastAPI app failed to start or the fixture is malformed. Use `pytest`; use HTTPX `AsyncClient` when the behavior crosses the FastAPI boundary. A private helper test is not enough.

## Write the production code

Build a replayable pytest harness from fixed model decisions and HTTPX `MockTransport` API results. Store policy/model/tool-schema versions with each result and report outcome and trajectory metrics independently.

Keep provider payloads inside adapters, domain decisions in Python, and FastAPI route functions thin. Use Pydantic v2 at untrusted boundaries; use `Protocol` and `dataclass` for internal contracts and state where they make the design clearer. Implement only enough to make the new test pass, then refactor while all earlier release behavior stays green. The lesson gives you contracts and constraints, not a finished application to copy.

## Walk one value through the system

For one case, compare expected predicates with each recorded step. Identify the first divergence instead of blaming the final message.

At every boundary, write down the Python type, whether Pydantic or domain code validates it, and how failure becomes an observable status or response. This is where “the model probably behaves” becomes an engineering claim.

<PredictThenRun prompt="What exact result or failure should the public seam produce?">

Compare your prediction with the command output. If they differ, explain the first
boundary where your mental model diverged before changing code.

</PredictThenRun>

## Practice

Insert an unnecessary second search that does not alter the outcome. Predict outcome score, trajectory score, step count, and latency. Run the narrow pytest test first, then the release check.

## Worked reasoning

Outcome checks protect user-visible effects; trajectory checks protect the route. Both are needed because unsafe or wasteful behavior can still end with plausible text. Compare that reasoning with your implementation; do not copy it as a substitute for the failing test.

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

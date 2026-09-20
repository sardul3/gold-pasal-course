---
id: r11-11
title: "Release gate: defend the stop conditions and safety boundary"
release: r11
order: 11
prerequisites: [r11-10]
outcomes:
  - Apply release gate: defend the stop conditions and safety boundary to the cumulative Gold Pasal system
  - Explain the resulting behavior and its failure boundary
evidence: [commit, ci-run, demo]
---

<LessonMission
  role="staff assistant operator"
  problem="A model can search and propose a hold, but it must stop before an unapproved inventory change."
  destination="Typed tools, budgets, approvals, and durable state make every run bounded and inspectable."
/>

# Release gate: defend the stop conditions and safety boundary


This is the release gate. You will add one observable behavior at a time without replacing the learner-owned application with a solved sample.

## See the idea first

The final demonstration must show not only that the agent stops, but that every route to continued execution is bounded by code.

The release invariant is **stop conditions and approval states are enforced by code outside the model**. Keep that sentence testable at `POST /api/agent/runs`.

<FailureWorkbench incident="A model can search and propose a hold, but it must stop before an unapproved inventory change." :hypotheses="['invalid input', 'boundary failure', 'state or concurrency defect']" next-evidence="A request to hold GP-N-042 may search once and propose one create-hold call, then enter awaiting-approval instead of looping." />

## Build a mental model

A **stop condition** is an executable predicate: terminal status, awaiting approval, step limit, deadline, output limit, cancellation, or no permitted action. “The model should know when done” is not a condition.

Defense means testing each condition at its boundary and in combination. Check before a model call, before and after a tool call, and before persistence advances the step. Concurrent approval and cancellation also need one legal winner.

The safety boundary is the harness: typed dispatcher, API-backed tools, identity, budgets, durable state, approval transitions, and traces. Keep the prior policy version deployable and the kill/cancel path operational.

### Check the idea by hand

- Hold goal stops at awaiting approval with `executed=false` in at most four steps.
- Hostile shell goal stops denied/failed_safely with no shell trajectory step.
- Expired deadline prevents a new tool call even if steps remain.
- Cancelled run cannot be resumed by another model response.

## Write the failing test

Start with a small Python 3.12 test. Use Pydantic v2 for data crossing an HTTP or model boundary, `Protocol`/`dataclass` for internal seams when useful, and pytest fakes or HTTPX transports instead of live network calls.

Run the external R11 checks, then a stop-condition matrix covering exact max steps, deadline expiry, output overflow, awaiting approval, denial, cancellation, model failure, and tool failure. Assert API side effects as well as status.

Name the test from the shopper or operator outcome. Run it and confirm it fails for the missing behavior, not because the FastAPI app failed to start or the fixture is malformed. Use `pytest`; use HTTPX `AsyncClient` when the behavior crosses the FastAPI boundary. A private helper test is not enough.

## Write the production code

Wire all guards through one typed async run coordinator and one dispatcher. Make every terminal transition durable and observable. Prepare a denied-action trace and an approved-action idempotency demonstration.

Keep provider payloads inside adapters, domain decisions in Python, and FastAPI route functions thin. Use Pydantic v2 at untrusted boundaries; use `Protocol` and `dataclass` for internal contracts and state where they make the design clearer. Implement only enough to make the new test pass, then refactor while all earlier release behavior stays green. The lesson gives you contracts and constraints, not a finished application to copy.

## Walk one value through the system

Defend one complete run and one attack step by step. At each attempted continuation, name the code predicate that allows or stops it and the persisted evidence.

At every boundary, write down the Python type, whether Pydantic or domain code validates it, and how failure becomes an observable status or response. This is where “the model probably behaves” becomes an engineering claim.

<PredictThenRun prompt="What exact result or failure should the public seam produce?">

Compare your prediction with the command output. If they differ, explain the first
boundary where your mental model diverged before changing code.

</PredictThenRun>

## Practice

Set `max_steps=1`, expire the deadline, and have the model propose a forbidden tool. Decide which terminal reason wins according to your documented precedence, then test it. Run the narrow pytest test first, then the release check.

## Worked reasoning

The release promise is bounded agency: models may propose, but code controls capability, time, steps, output, approval, and termination. A final message is never the proof; state and side effects are. Compare that reasoning with your implementation; do not copy it as a substitute for the failing test.

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

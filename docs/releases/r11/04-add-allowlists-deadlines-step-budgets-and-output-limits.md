---
id: r11-04
title: "Add allowlists, deadlines, step budgets, and output limits"
release: r11
order: 4
prerequisites: [r11-03]
outcomes:
  - Apply add allowlists, deadlines, step budgets, and output limits to the cumulative Gold Pasal system
  - Explain the resulting behavior and its failure boundary
evidence: [commit, ci-run]
---

<LessonMission
  role="staff assistant operator"
  problem="A model can search and propose a hold, but it must stop before an unapproved inventory change."
  destination="Typed tools, budgets, approvals, and durable state make every run bounded and inspectable."
/>

# Add allowlists, deadlines, step budgets, and output limits


This is step 4 of 11. You will add one observable behavior at a time without replacing the learner-owned application with a solved sample.

## See the idea first

An agent can loop, call a slow tool, or pull a huge response into context. Four different bounds stop four different failure modes.

The release invariant is **stop conditions and approval states are enforced by code outside the model**. Keep that sentence testable at `POST /api/agent/runs`.

<FailureWorkbench incident="A model can search and propose a hold, but it must stop before an unapproved inventory change." :hypotheses="['invalid input', 'boundary failure', 'state or concurrency defect']" next-evidence="A request to hold GP-N-042 may search once and propose one create-hold call, then enter awaiting-approval instead of looping." />

## Build a mental model

An **allowlist** is the exact set of tools permitted for this run and identity. If `shell` is absent, the dispatcher denies it even when the model insists.

A **deadline** caps wall-clock time for the whole run and each call. A **step budget** caps observe–decide–act iterations. An **output budget** caps bytes or tokens returned by tools and the model.

Check budgets before starting work and after each result. Truncate oversized read results with an explicit marker and pointer; never truncate mutation status so that “unknown” looks like success.

### Check the idea by hand

- Allowed tools are search and order status: `create_hold` is denied for a read-only run.
- `max_steps=4`: a fifth model proposal is never requested.
- A 200 KB search result is reduced to approved fields and limit; the full payload does not enter prompt history.
- The total deadline expires during retry backoff: stop instead of starting another call.

## Write the failing test

Start with a small Python 3.12 test. Use Pydantic v2 for data crossing an HTTP or model boundary, `Protocol`/`dataclass` for internal seams when useful, and pytest fakes or HTTPX transports instead of live network calls.

Write boundary tests at zero, one, and maximum steps; exact and exceeded output bytes; allowed and unknown tools; deadline before and during a tool call. Assert terminal reasons, not only that an exception occurred.

Name the test from the shopper or operator outcome. Run it and confirm it fails for the missing behavior, not because the FastAPI app failed to start or the fixture is malformed. Use `pytest`; use HTTPX `AsyncClient` when the behavior crosses the FastAPI boundary. A private helper test is not enough.

## Write the production code

Create a frozen run-budget dataclass and a guard checked by the harness. Pass remaining duration to every model/API call. Apply output limits in tool adapters before storing context.

Keep provider payloads inside adapters, domain decisions in Python, and FastAPI route functions thin. Use Pydantic v2 at untrusted boundaries; use `Protocol` and `dataclass` for internal contracts and state where they make the design clearer. Implement only enough to make the new test pass, then refactor while all earlier release behavior stays green. The lesson gives you contracts and constraints, not a finished application to copy.

## Walk one value through the system

For a four-step run, record remaining steps, milliseconds, and output bytes after each transition. Prove no path bypasses the dispatcher.

At every boundary, write down the Python type, whether Pydantic or domain code validates it, and how failure becomes an observable status or response. This is where “the model probably behaves” becomes an engineering claim.

<PredictThenRun prompt="What exact result or failure should the public seam produce?">

Compare your prediction with the command output. If they differ, explain the first
boundary where your mental model diverged before changing code.

</PredictThenRun>

## Practice

Give the run one remaining step while the model proposes search followed by hold. Predict the terminal status and which call is not made. Run the narrow pytest test first, then the release check.

## Worked reasoning

Allowlists bound capability; deadlines bound time; step budgets bound loops; output budgets bound context and storage. None substitutes for the others. Compare that reasoning with your implementation; do not copy it as a substitute for the failing test.

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

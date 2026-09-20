---
id: r11-07
title: "Trace observe–decide–act steps without leaking secrets"
release: r11
order: 7
prerequisites: [r11-06]
outcomes:
  - Apply trace observe–decide–act steps without leaking secrets to the cumulative Gold Pasal system
  - Explain the resulting behavior and its failure boundary
evidence: [commit, ci-run]
---

<LessonMission
  role="staff assistant operator"
  problem="A model can search and propose a hold, but it must stop before an unapproved inventory change."
  destination="Typed tools, budgets, approvals, and durable state make every run bounded and inspectable."
/>

# Trace observe–decide–act steps without leaking secrets


This is step 7 of 11. You will add one observable behavior at a time without replacing the learner-owned application with a solved sample.

## See the idea first

When a run fails, operators need to see which decision and tool call caused it. They must not see staff tokens or customer details they do not need.

The release invariant is **stop conditions and approval states are enforced by code outside the model**. Keep that sentence testable at `POST /api/agent/runs`.

<FailureWorkbench incident="A model can search and propose a hold, but it must stop before an unapproved inventory change." :hypotheses="['invalid input', 'boundary failure', 'state or concurrency defect']" next-evidence="A request to hold GP-N-042 may search once and propose one create-hold call, then enter awaiting-approval instead of looping." />

## Build a mental model

A **trace** links one run’s observe–decide–act steps with IDs and timing. Record run ID, step, policy/model version, proposed tool, authorization decision, latency, result code, and budget remaining.

Safe tracing uses data minimization and redaction. Store hashes or references for large prompts/results, mask authorization headers, and omit raw customer text unless an approved retention policy requires it.

Record rejected proposals too. A denied `shell` call is valuable safety evidence even though the tool never ran. Separate user-visible summaries from restricted diagnostic payloads.

### Check the idea by hand

- Step 1 observed goal hash and selected `search_catalog`; result count 1, latency 32 ms.
- Step 2 proposed `create_hold`; policy outcome awaiting approval; executed false.
- Authorization token, full prompt, and customer name do not appear in the normal trace.

## Write the failing test

Start with a small Python 3.12 test. Use Pydantic v2 for data crossing an HTTP or model boundary, `Protocol`/`dataclass` for internal seams when useful, and pytest fakes or HTTPX transports instead of live network calls.

Write a trace serialization test with planted secret values and assert none appear. Test that denied, timed-out, truncated, and approval-wait steps still produce a trace event.

Name the test from the shopper or operator outcome. Run it and confirm it fails for the missing behavior, not because the FastAPI app failed to start or the fixture is malformed. Use `pytest`; use HTTPX `AsyncClient` when the behavior crosses the FastAPI boundary. A private helper test is not enough.

## Write the production code

Emit typed dataclass events through a trace-sink `Protocol`. Centralize redaction before serialization, attach correlation IDs to API calls, and cap stored payloads.

Keep provider payloads inside adapters, domain decisions in Python, and FastAPI route functions thin. Use Pydantic v2 at untrusted boundaries; use `Protocol` and `dataclass` for internal contracts and state where they make the design clearer. Implement only enough to make the new test pass, then refactor while all earlier release behavior stays green. The lesson gives you contracts and constraints, not a finished application to copy.

## Walk one value through the system

Inspect one saved trace field by field. For each field, state the debugging question it answers and why its sensitivity is acceptable.

At every boundary, write down the Python type, whether Pydantic or domain code validates it, and how failure becomes an observable status or response. This is where “the model probably behaves” becomes an engineering claim.

<PredictThenRun prompt="What exact result or failure should the public seam produce?">

Compare your prediction with the command output. If they differ, explain the first
boundary where your mental model diverged before changing code.

</PredictThenRun>

## Practice

Put a fake bearer token and email in a tool error. Predict the persisted event, then test both are absent while error class remains. Run the narrow pytest test first, then the release check.

## Worked reasoning

A safe trace preserves decisions and outcomes needed for replay without becoming a second secrets database. Redaction must happen before storage. Compare that reasoning with your implementation; do not copy it as a substitute for the failing test.

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

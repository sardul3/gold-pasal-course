---
id: r11-03
title: "Make tools call the Gold Pasal API instead of domain duplicates"
release: r11
order: 3
prerequisites: [r11-02]
outcomes:
  - Apply make tools call the gold pasal api instead of domain duplicates to the cumulative Gold Pasal system
  - Explain the resulting behavior and its failure boundary
evidence: [commit, ci-run]
---

<LessonMission
  role="staff assistant operator"
  problem="A model can search and propose a hold, but it must stop before an unapproved inventory change."
  destination="Typed tools, budgets, approvals, and durable state make every run bounded and inspectable."
/>

# Make tools call the Gold Pasal API instead of domain duplicates


This is step 3 of 11. You will add one observable behavior at a time without replacing the learner-owned application with a solved sample.

## See the idea first

The course already has catalog, hold, and order rules behind the Gold Pasal API. Reimplementing them inside agent tools creates a second source of truth.

The release invariant is **stop conditions and approval states are enforced by code outside the model**. Keep that sentence testable at `POST /api/agent/runs`.

<FailureWorkbench incident="A model can search and propose a hold, but it must stop before an unapproved inventory change." :hypotheses="['invalid input', 'boundary failure', 'state or concurrency defect']" next-evidence="A request to hold GP-N-042 may search once and propose one create-hold call, then enter awaiting-approval instead of looping." />

## Build a mental model

An **API-backed tool** translates a typed tool call into an authenticated call to an existing public/internal API. The tool is an adapter, not a second domain implementation.

Preserve API semantics: status codes, idempotency keys, validation errors, and concurrency conflicts. Map them to small typed tool outcomes without turning `409 hold conflict` into success.

Use workload credentials scoped to the agent’s identity. Forward staff context only according to the authentication design; never let model text select credentials or target hosts.

### Check the idea by hand

- Search tool calls the existing catalog endpoint and maps records to safe summaries.
- Order-status tool calls the existing order endpoint; it does not query an order table directly.
- Hold tool calls the existing hold endpoint with an idempotency key after approval; it does not decrement inventory itself.

## Write the failing test

Start with a small Python 3.12 test. Use Pydantic v2 for data crossing an HTTP or model boundary, `Protocol`/`dataclass` for internal seams when useful, and pytest fakes or HTTPX transports instead of live network calls.

Use a stub Gold Pasal API. Verify URL, method, auth scope, timeout, and idempotency header. Test mappings for 200, 404, 409, 429, timeout, and malformed response.

Name the test from the shopper or operator outcome. Run it and confirm it fails for the missing behavior, not because the FastAPI app failed to start or the fixture is malformed. Use `pytest`; use HTTPX `AsyncClient` when the behavior crosses the FastAPI boundary. A private helper test is not enough.

## Write the production code

Define one HTTP client `Protocol` and thin async handlers implemented with HTTPX `AsyncClient`. Reuse API contracts generated or defined from OpenAPI where the project already does so. Keep domain mutation in the existing Gold Pasal API.

Keep provider payloads inside adapters, domain decisions in Python, and FastAPI route functions thin. Use Pydantic v2 at untrusted boundaries; use `Protocol` and `dataclass` for internal contracts and state where they make the design clearer. Implement only enough to make the new test pass, then refactor while all earlier release behavior stays green. The lesson gives you contracts and constraints, not a finished application to copy.

## Walk one value through the system

Follow `create_hold` from tool input to API request and back. Show that no repository or inventory domain class is called by the tool adapter.

At every boundary, write down the Python type, whether Pydantic or domain code validates it, and how failure becomes an observable status or response. This is where “the model probably behaves” becomes an engineering claim.

<PredictThenRun prompt="What exact result or failure should the public seam produce?">

Compare your prediction with the command output. If they differ, explain the first
boundary where your mental model diverged before changing code.

</PredictThenRun>

## Practice

Return HTTP 409 from the stub. Predict the typed result and whether the agent may retry it automatically. Run the narrow pytest test first, then the release check.

## Worked reasoning

API-backed tools reuse authentication, concurrency, and audit rules. A thin adapter reduces drift and makes retry decisions depend on real API semantics. Compare that reasoning with your implementation; do not copy it as a substitute for the failing test.

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

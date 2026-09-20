---
id: r11-02
title: "Define typed tools for search, holds, and order status"
release: r11
order: 2
prerequisites: [r11-01]
outcomes:
  - Apply define typed tools for search, holds, and order status to the cumulative Gold Pasal system
  - Explain the resulting behavior and its failure boundary
evidence: [commit, ci-run]
---

<LessonMission
  role="staff assistant operator"
  problem="A model can search and propose a hold, but it must stop before an unapproved inventory change."
  destination="Typed tools, budgets, approvals, and durable state make every run bounded and inspectable."
/>

# Define typed tools for search, holds, and order status


This is step 2 of 11. You will add one observable behavior at a time without replacing the learner-owned application with a solved sample.

## See the idea first

A model should not invent URLs or pass free-form commands. It chooses from a small catalog of typed Gold Pasal operations.

The release invariant is **stop conditions and approval states are enforced by code outside the model**. Keep that sentence testable at `POST /api/agent/runs`.

<FailureWorkbench incident="A model can search and propose a hold, but it must stop before an unapproved inventory change." :hypotheses="['invalid input', 'boundary failure', 'state or concurrency defect']" next-evidence="A request to hold GP-N-042 may search once and propose one create-hold call, then enter awaiting-approval instead of looping." />

## Build a mental model

A **tool** is an application capability exposed to the agent through a name, description, input schema, and output schema. Typed inputs turn `"hold something"` into fields such as `sku`, `customerId`, and `quantity`.

Define tools for `search_catalog`, `get_order_status`, and `create_hold`. Reject unknown fields, invalid SKU formats, non-positive quantities, and oversized queries before any API call.

Tool results are also typed. Return only fields needed for the next decision plus a stable error code. Do not put raw exceptions, HTML, or an entire HTTP response into model context.

### Check the idea by hand

- `search_catalog({"query":"GP-N-042","limit":5})` is read-only.
- `get_order_status({"orderId":"GP-100"})` is read-only but staff-authorized.
- `create_hold({"sku":"GP-N-042","customerId":"customer-1","quantity":1})` changes inventory and requires approval.

## Write the failing test

Start with a small Python 3.12 test. Use Pydantic v2 for data crossing an HTTP or model boundary, `Protocol`/`dataclass` for internal seams when useful, and pytest fakes or HTTPX transports instead of live network calls.

Write Pydantic model-validation tests with pytest for each tool input and result. Add a dispatcher test proving an unknown name such as `shell` is denied before lookup or execution.

Name the test from the shopper or operator outcome. Run it and confirm it fails for the missing behavior, not because the FastAPI app failed to start or the fixture is malformed. Use `pytest`; use HTTPX `AsyncClient` when the behavior crosses the FastAPI boundary. A private helper test is not enough.

## Write the production code

Create a `StrEnum` for tool names, strict Pydantic v2 input/output models, typed async handlers, and one dispatcher that maps approved names to handlers. Keep side-effect metadata with the definition.

Keep provider payloads inside adapters, domain decisions in Python, and FastAPI route functions thin. Use Pydantic v2 at untrusted boundaries; use `Protocol` and `dataclass` for internal contracts and state where they make the design clearer. Implement only enough to make the new test pass, then refactor while all earlier release behavior stays green. The lesson gives you contracts and constraints, not a finished application to copy.

## Walk one value through the system

Trace model JSON through parsing, schema validation, authorization, handler call, result truncation, and recorded step. Name the failure returned at each boundary.

At every boundary, write down the Python type, whether Pydantic or domain code validates it, and how failure becomes an observable status or response. This is where “the model probably behaves” becomes an engineering claim.

<PredictThenRun prompt="What exact result or failure should the public seam produce?">

Compare your prediction with the command output. If they differ, explain the first
boundary where your mental model diverged before changing code.

</PredictThenRun>

## Practice

Try `create_hold` with quantity zero and an extra `admin=true` field. Predict which validator rejects each problem. Run the narrow pytest test first, then the release check.

## Worked reasoning

Typed tools narrow model freedom into reviewable capabilities. Types prevent malformed calls; they do not replace authentication, authorization, approval, or budgets. Compare that reasoning with your implementation; do not copy it as a substitute for the failing test.

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

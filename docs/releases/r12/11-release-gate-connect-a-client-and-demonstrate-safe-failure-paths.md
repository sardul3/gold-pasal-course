---
id: r12-11
title: "Release gate: connect a client and demonstrate safe failure paths"
release: r12
order: 11
prerequisites: [r12-10]
outcomes:
  - Apply release gate: connect a client and demonstrate safe failure paths to the cumulative Gold Pasal system
  - Explain the resulting behavior and its failure boundary
evidence: [commit, ci-run, demo]
---

<LessonMission
  role="MCP client integrator"
  problem="A local client needs Gold Pasal capabilities without receiving unrestricted database or shell access."
  destination="A stdio MCP server exposes narrow API-backed tools with typed errors and confirmation policy."
/>

# Release gate: connect a client and demonstrate safe failure paths


This gate proves that a real local client can use Gold Pasal safely. A happy-path screenshot is not enough.

## See the idea first

Use fixture or staging data only. Choose a known catalog query, a synthetic order owned by the demo identity, and a holdable demo product. Use a scoped token, a fixed idempotency key, and a cleanup or expiry plan. Keep secrets, private cluster names, and customer data out of the recording.

Demonstrate this sequence:

1. Start the stdio server and initialize a client.
2. Discover `catalog_search`, `get_order_status`, and `create_hold`; point out that shell and SQL are absent.
3. Search the existing Gold Pasal API and identify one stable product ID.
4. Read the synthetic order status under the demo identity.
5. Attempt invalid search input and show that no HTTP request leaves the server.
6. Stage a hold without confirmation and show that no write occurs.
7. Confirm the exact hold, then retry with the same idempotency key and show one hold ID.
8. Trigger a safe domain conflict or dependency fixture and show a typed, redacted error.
9. Close the client and show the child exits cleanly.

<FailureWorkbench incident="The demo accidentally creates two holds or exposes a token." :hypotheses="['retry key changed', 'confirmation was not bound to intent', 'logs captured raw headers']" next-evidence="Fixture shows one inventory effect; transcript is redacted and uses a scoped demo identity." />

## Practice

At each step, name the owner of truth. MCP owns protocol and discovery. The harness owns schema, approval, and tool policy. The API owns catalog, authorization, inventory, and idempotent domain behavior. The database protects persistent invariants. This explanation is stronger than “the agent handled it.”

<PredictThenRun prompt="Which visible result proves each safety claim, and what does that result still not prove?" />

Worked answer: discovery proves a narrow advertised surface, not host sandboxing. Zero recorded HTTP proves early validation in the fixture, not every production path. One repeated hold ID plus one inventory effect proves idempotency for the tested contract. Redacted failure output proves the known mapper, not that all future exceptions are safe.

## Release evidence

Attach a commit or PR, green CI run, Inspector transcript, automated fixtures, confirmation/idempotency evidence, and the safe demo recording. Score the rubric honestly:

- Behavior reaches 3 only when failure and recovery paths pass.
- Tests reach at least 2 only when public seams are covered.
- Design needs an explanation of invariants and boundaries.
- Operations needs reproducible start, stop, logs, and cleanup.
- Communication needs a focused demo with caveats.

If any dimension is below 2, the release is Practiced, not Proven. Do not manufacture a link or hide the gap.

## Check

```bash
uv run --project ../gold-pasal-course/checks pytest ../gold-pasal-course/checks/r12 --app-repo "$PWD"
```

Run the fixture suite immediately before recording. Record the exit status and discovered tool set in the Portfolio Ledger.

<EvidenceCard
  command="uv run pytest tests/mcp -q"
  artifact="Inspector evidence, protocol fixtures, and a safe failure transcript"
  invariant="protocol handlers validate and authorize but never duplicate business rules"
/>

<CareerSignal
  role="Python backend engineer with production AI skills"
  signal="Inspector evidence, protocol fixtures, and a safe failure transcript"
  interview-question="Where do MCP protocol, authorization, and business validation boundaries belong?"
/>

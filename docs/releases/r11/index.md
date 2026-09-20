---
title: "R11 — Bounded staff agent"
description: "A traced agent with typed tools, approvals, and executable stop conditions."
---

# R11 — Bounded staff agent

**Release promise:** A traced agent with typed tools, approvals, and executable stop conditions.

<LessonMission
  role="staff assistant operator"
  problem="A model can search and propose a hold, but it must stop before an unapproved inventory change."
  destination="Typed tools, budgets, approvals, and durable state make every run bounded and inspectable."
/>

## Lessons

1. [Decide when a workflow is enough and when an agent is justified](01-decide-when-a-workflow-is-enough-and-when-an-agent-is-justified)
2. [Define typed tools for search, holds, and order status](02-define-typed-tools-for-search-holds-and-order-status)
3. [Make tools call the Gold Pasal API instead of domain duplicates](03-make-tools-call-the-gold-pasal-api-instead-of-domain-duplicates)
4. [Add allowlists, deadlines, step budgets, and output limits](04-add-allowlists-deadlines-step-budgets-and-output-limits)
5. [Require confirmation before inventory-changing actions](05-require-confirmation-before-inventory-changing-actions)
6. [Persist explicit run state outside chat history](06-persist-explicit-run-state-outside-chat-history)
7. [Trace observe–decide–act steps without leaking secrets](07-trace-observedecideact-steps-without-leaking-secrets)
8. [Evaluate outcomes and golden tool trajectories](08-evaluate-outcomes-and-golden-tool-trajectories)
9. [Handle model, tool, partial-success, and retry failures](09-handle-model-tool-partial-success-and-retry-failures)
10. [Red-team unsafe requests and confused-deputy scenarios](10-red-team-unsafe-requests-and-confused-deputy-scenarios)
11. [Release gate: defend the stop conditions and safety boundary](11-release-gate-defend-the-stop-conditions-and-safety-boundary)

## Release evidence

Run `uv run pytest tests/evals/agent -q` and preserve golden trajectories, traces, and a denied-action demonstration. At the review, defend this
invariant: **stop conditions and approval states are enforced by code outside the model.**

<ArchitectureTrail
  before="A model can search and propose a hold, but it must stop before an unapproved inventory change."
  decision="Introduce only the boundary and mechanism needed by this release."
  after="Typed tools, budgets, approvals, and durable state make every run bounded and inspectable."
/>

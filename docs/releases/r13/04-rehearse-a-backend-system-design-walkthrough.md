---
id: r13-04
title: "Rehearse a backend system-design walkthrough"
release: r13
order: 4
prerequisites: [r13-03]
outcomes:
  - Apply rehearse a backend system-design walkthrough to the cumulative Gold Pasal system
  - Explain the resulting behavior and its failure boundary
evidence: [commit, ci-run]
---

<LessonMission
  role="job candidate"
  problem="A reviewer has limited time and needs evidence of judgment, not a tour of every file."
  destination="A concise demo connects product behavior, design trade-offs, tests, delivery, recovery, and AI safety."
/>

# Rehearse a backend system-design walkthrough


An interview walkthrough is not a memorized architecture tour. It is a sequence of decisions tied to requirements, scale, failure, and evidence.

## See the idea first

State the functional requirements: shoppers search jewelry, view their order, and create time-bounded inventory holds. State non-functional requirements: authenticated access, no overselling, idempotent retries, observable deployment, bounded failures, and safe agent access.

Then estimate only what changes design. Which path is read-heavy? How many concurrent hold attempts can target one item? How fresh must catalog availability be? What latency and recovery targets matter? If the portfolio has no measured production load, label numbers as design assumptions.

## Walk the Gold Pasal path

1. Clients call the OpenAPI-defined service; MCP remains an adapter.
2. Authentication identifies the shopper; authorization is checked per order or hold.
3. Catalog reads can be cached only with an explicit freshness rule.
4. Hold creation enters a transaction and protects stock with a durable concurrency strategy.
5. The idempotency key maps retries to one logical result.
6. Logs, metrics, health probes, and traces identify failure without leaking customer data.
7. Kubernetes rolls out a pinned artifact and can return to a known-good revision.

<FailureWorkbench incident="Two shoppers request the last ring at the same time." :hypotheses="['check-then-write is outside a transaction', 'lock scope is wrong', 'retry key is not unique']" next-evidence="Concurrency test shows at most one successful inventory effect and a typed conflict." />

## Explain trade-offs

PostgreSQL transactions are a sensible current choice because hold and stock invariants need strong consistency. A distributed queue or reservation service may become useful at much larger scale, but it adds lag, failure modes, and operations. Caching improves catalog latency but cannot be the authority for creating a hold. MCP improves client interoperability but does not replace API authorization.

## Practice

Give an eight-minute design answer. At minutes two, four, and six, pause and ask: what invariant am I protecting, what fails, and what evidence supports this choice?

<PredictThenRun prompt="If traffic grows 100× and one SKU becomes hot, which bottleneck appears first and which change would you test?" />

Worked reasoning: the hot hold row or lock may dominate before catalog reads do. Measure lock wait and conflict rate first. Consider partitioning inventory or a dedicated reservation path only after the current transaction design’s limit is evidenced.

Practice adversarial follow-ups: Why not microservices? What if PostgreSQL is unavailable after commit but before response? How do you prevent cross-user order reads? What does rollback do to schema compatibility? Why expose MCP?

Answer with current evidence, a caveat, and a revisit trigger. Do not pretend portfolio-scale tests establish internet-scale capacity.

## Check

```bash
./scripts/verify.sh && kubectl rollout status deployment/gold-pasal-api
```

Record the walkthrough and one corrected misconception in the Portfolio Ledger. The correction is evidence of judgment, not weakness.

<EvidenceCard
  command="./scripts/verify.sh && kubectl rollout status deployment/gold-pasal-api"
  artifact="curated ADRs, CI/deployment evidence, demo script, and honest résumé bullets"
  invariant="every claim in the presentation points to inspectable evidence and names its limits"
/>

<CareerSignal
  role="Python backend engineer with production AI skills"
  signal="curated ADRs, CI/deployment evidence, demo script, and honest résumé bullets"
  interview-question="Which decision best demonstrates your engineering judgment, and what would make you revisit it?"
/>

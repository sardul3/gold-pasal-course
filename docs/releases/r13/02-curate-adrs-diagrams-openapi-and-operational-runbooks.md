---
id: r13-02
title: "Curate ADRs, diagrams, OpenAPI, and operational runbooks"
release: r13
order: 2
prerequisites: [r13-01]
outcomes:
  - Apply curate adrs, diagrams, openapi, and operational runbooks to the cumulative Gold Pasal system
  - Explain the resulting behavior and its failure boundary
evidence: [commit, ci-run]
---

<LessonMission
  role="job candidate"
  problem="A reviewer has limited time and needs evidence of judgment, not a tour of every file."
  destination="A concise demo connects product behavior, design trade-offs, tests, delivery, recovery, and AI safety."
/>

# Curate ADRs, diagrams, OpenAPI, and operational runbooks


Documentation earns its place when it answers a reviewer’s question faster than reading the code. Curation means removing stale claims as well as polishing useful ones.

## See the idea first

An **ADR** (architecture decision record) explains a hard-to-reverse choice: context, options, decision, consequences, and revisit trigger. Good Gold Pasal candidates include PostgreSQL-backed idempotency, API-backed MCP tools, and the hold confirmation boundary. Do not write an ADR for every library import.

A diagram explains boundaries and data flow. Keep one context view and one hold sequence. Label auth, confirmation, transaction, idempotency, observability, and failure returns. Delete boxes no longer in the deployed path.

OpenAPI is the executable HTTP contract. Check that product, order, hold, error, authentication, and idempotency-header schemas match runtime behavior. Examples must use synthetic IDs and safe values.

A runbook is an operator’s procedure under pressure. It needs symptoms, scope, safe diagnostics, decision points, mitigation, rollback, verification, escalation, and evidence capture. “Restart the pod” is not a runbook.

<FailureWorkbench incident="The diagram says MCP writes PostgreSQL directly while runtime calls the API." :hypotheses="['diagram is stale', 'second path still exists', 'OpenAPI and implementation diverged']" next-evidence="Trace, contract test, and curated diagram agree on one API-backed path." />

## Build a reviewer path

Link artifacts in this order: product behavior → architecture diagram → relevant OpenAPI operation → test/CI evidence → ADR trade-off → runbook and rollback. A reviewer should not search the repository to reconstruct your claim.

For the hold path, show the unconfirmed tool call, confirmed API request with idempotency key, database invariant, returned hold ID, and recovery if deployment health declines. State that a diagram is explanatory evidence, not runtime proof.

## Practice

Audit every ADR, diagram, OpenAPI example, and runbook with `current`, `useful`, and `linked` checks. Archive or delete stale artifacts. For one surviving ADR, name a concrete metric or product change that would trigger reconsideration.

<PredictThenRun prompt="Can a reviewer move from a hold claim to contract, decision, test, deployment, and rollback evidence without guessing?" />

Worked answer: the chain is complete only when every link is inspectable and current. A README sentence claiming idempotency without a test and durable constraint is not enough.

Add dates or version references where drift matters. Run contract validation and dry-run the runbook; prose review alone cannot prove either.

## Check

```bash
./scripts/verify.sh && kubectl rollout status deployment/gold-pasal-api
```

Record links and one caveat per artifact in the Portfolio Ledger. This is Design and Operations evidence, not a substitute for working behavior.

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

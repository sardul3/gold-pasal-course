---
id: r13-01
title: "Review the architecture and close accidental complexity"
release: r13
order: 1
prerequisites: []
outcomes:
  - Apply review the architecture and close accidental complexity to the cumulative Gold Pasal system
  - Explain the resulting behavior and its failure boundary
evidence: [commit, ci-run]
---

<LessonMission
  role="job candidate"
  problem="A reviewer has limited time and needs evidence of judgment, not a tour of every file."
  destination="A concise demo connects product behavior, design trade-offs, tests, delivery, recovery, and AI safety."
/>

# Review the architecture and close accidental complexity


Your final architecture should be explainable as a path from shopper intent to a protected inventory invariant. If a box exists only because the project accumulated experiments, it needs a reason or an exit plan.

## See the idea first

Essential complexity comes from the Gold Pasal domain: changing gold prices, authenticated orders, concurrent inventory holds, idempotent writes, and safe agent confirmation. Accidental complexity comes from the implementation: duplicate adapters, two sources of configuration, unused queues, parallel business rules, or deployment layers with no current product need.

Begin with a current-state diagram:

```text
shopper / MCP client -> Gold Pasal API -> domain service -> PostgreSQL
                              |               |
                         auth + schema   holds + orders
deployment artifact -> Kubernetes -> logs, health, rollback
```

Annotate every arrow with its contract and failure owner. OpenAPI defines HTTP. MCP schemas define tool calls. Database constraints protect durable state. Kubernetes runs an immutable artifact and exposes health. If you cannot name a box’s responsibility, it may be accidental.

<FailureWorkbench incident="A hold rule exists in the API, MCP adapter, and demo script." :hypotheses="['business logic was copied', 'contract ownership is unclear', 'demo bypasses the public seam']" next-evidence="One API/domain implementation remains; clients validate shape and delegate." />

## Review with deletion questions

For each component ask: What user or operator outcome does it protect? Which public contract requires it? What fails if it disappears? Is another component already responsible? What evidence proves it is used?

Do not “simplify” by deleting authorization, idempotency, rollback, logs, or tests. Those are essential controls. Prefer removing duplicate paths, stale abstractions, dead flags, and speculative infrastructure. Make small reversible changes and run the full verification after each logical deletion.

## Practice

Create an architecture inventory with columns: component, responsibility, contract, evidence, failure mode, keep/remove/merge. Choose one accidental layer and write the before-and-after request trace.

<PredictThenRun prompt="Which layer can be removed while catalog, order, hold, deployment, and recovery invariants remain observable?" />

Worked reasoning: removing a duplicate MCP business-rule module is safe only when MCP still validates its own inputs and the API remains authoritative. Removing database uniqueness for idempotency is not simplification; it destroys the durable invariant.

## Evidence

Save the inventory, diagram diff, verification run, and a short decision note. A lower file count is not evidence by itself; the outcome is a smaller system with the same defended behavior and clearer ownership.

## Check

```bash
./scripts/verify.sh && kubectl rollout status deployment/gold-pasal-api
```

If no cluster is available, record deployment evidence as missing rather than inventing it. R13 requires rubric score 3 in Behavior, Operations, and Communication before the final release is Proven.

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

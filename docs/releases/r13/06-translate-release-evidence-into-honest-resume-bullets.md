---
id: r13-06
title: "Translate release evidence into honest résumé bullets"
release: r13
order: 6
prerequisites: [r13-05]
outcomes:
  - Apply translate release evidence into honest résumé bullets to the cumulative Gold Pasal system
  - Explain the resulting behavior and its failure boundary
evidence: [commit, ci-run]
---

<LessonMission
  role="job candidate"
  problem="A reviewer has limited time and needs evidence of judgment, not a tour of every file."
  destination="A concise demo connects product behavior, design trade-offs, tests, delivery, recovery, and AI safety."
/>

# Translate release evidence into honest résumé bullets


Your résumé can compress evidence. It cannot upgrade it.

## See the idea first

Use this structure: built or changed what; for which Gold Pasal outcome; with which meaningful constraint or decision; proven by which artifact. Add a number only when it was measured with a method you can explain.

Weak: “Built a scalable AI e-commerce platform.”

Evidence-backed: “Exposed Gold Pasal catalog, order-status, and hold workflows through three typed MCP tools backed by the existing API; added harness validation, explicit hold confirmation, idempotent retry fixtures, and safe error mapping.”

The second statement names inspectable work. It does not claim production adoption, revenue, scale, or “exactly once” delivery.

<FailureWorkbench incident="A bullet says reduced incidents by 40%, but the project has no baseline or production incident count." :hypotheses="['number was inferred', 'load test was described as production', 'course completion was described as employment impact']" next-evidence="Unsupported metric is removed or replaced by a measured test result with method and scope." />

## Match wording to evidence

Use “implemented” for code you built, “designed” for a documented choice, “validated” for a test or drill, and “deployed” only with deployment evidence. Use “production” only if it actually served production. Use “reduced” only with a before/after measurement. For solo work, do not imply team leadership.

Potential Gold Pasal bullets can cover:

- transactional, idempotent inventory holds and concurrency tests;
- OpenAPI-backed catalog and order workflows with authorization boundaries;
- CI, immutable artifacts, Kubernetes rollout, observability, and rollback drill;
- typed MCP tools with confirmation, least privilege, and replayable fixtures.

Each bullet should link privately in your ledger to the strongest artifact. The public résumé need not contain every URL, but you must be able to open the evidence during an interview.

## Practice

Draft four bullets. Under each, list every verb, number, scale word, and outcome. Mark its source artifact. Delete or narrow anything without support.

<PredictThenRun prompt="Can you defend every verb and number with a commit, CI run, contract, deployment, runbook, trace, or measured report?" />

Worked reasoning: “prevented duplicate holds in retry fixtures using an idempotency key” is defensible. “Guaranteed exactly-once inventory updates at scale” exceeds fixture and portfolio evidence. “Practiced Kubernetes rollback” is honest if there was a drill; “operated Kubernetes in production” is not.

Have another engineer challenge one bullet for five minutes. If the explanation depends on hidden assumptions, revise the bullet.

## Check

```bash
./scripts/verify.sh && kubectl rollout status deployment/gold-pasal-api
```

Store the final bullets and evidence map in the Portfolio Ledger. A missing artifact stays marked missing; evidence integrity outranks polish.

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

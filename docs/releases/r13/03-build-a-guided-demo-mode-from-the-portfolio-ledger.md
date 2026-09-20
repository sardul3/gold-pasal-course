---
id: r13-03
title: "Build a guided Demo Mode from the Portfolio Ledger"
release: r13
order: 3
prerequisites: [r13-02]
outcomes:
  - Apply build a guided demo mode from the portfolio ledger to the cumulative Gold Pasal system
  - Explain the resulting behavior and its failure boundary
evidence: [commit, ci-run]
---

<LessonMission
  role="job candidate"
  problem="A reviewer has limited time and needs evidence of judgment, not a tour of every file."
  destination="A concise demo connects product behavior, design trade-offs, tests, delivery, recovery, and AI safety."
/>

# Build a guided Demo Mode from the Portfolio Ledger


The Portfolio Ledger records what you can prove. Demo Mode turns selected ledger entries into a short reviewer journey without inventing new claims.

## See the idea first

A strong demo is not “here are thirteen releases.” It is a six-stop argument:

1. Shopper problem: prevent overselling while making catalog and orders useful.
2. Public behavior: search, inspect a synthetic order, and request a hold.
3. Invariant: concurrent or retried requests do not create duplicate inventory effects.
4. Delivery: CI produces an immutable artifact and Kubernetes rolls it out observably.
5. Recovery: a controlled failure leads to diagnosis and rollback.
6. Agent safety: MCP exposes narrow API-backed tools, validates inputs, requires confirmation, and fails safely.

Each ledger entry should include the claim, artifact link, verification command, observed result, date or commit, and limitation. Demo Mode should display or link these fields. It must not turn a Practiced item into a Proven badge.

<FailureWorkbench incident="Demo Mode claims production-scale reliability from one local fixture." :hypotheses="['ledger omitted limitations', 'status was inferred from prose', 'demo copied a stale link']" next-evidence="Claim is narrowed to fixture-backed behavior and the missing load evidence stays visible." />

## Curate a ten-minute route

Budget roughly one minute for problem and architecture, three for behavior and the hold invariant, two for tests and delivery, two for incident/rollback, and two for MCP safety and trade-offs. Keep a shorter three-minute route that preserves the same argument.

Use synthetic data and preflight every link. Offer a fallback screenshot or recorded fixture when a live dependency is unavailable, clearly labeled as recorded evidence. Demo Mode should be read-only; it must not expose admin controls or production credentials.

## Practice

Select one ledger entry for each stop. Remove any entry missing an inspectable artifact. Rehearse the transition sentence that explains why the next artifact matters.

<PredictThenRun prompt="Which six ledger-backed artifacts tell the Gold Pasal story with no unsupported claim?" />

Worked reasoning: choose the public contract test over a helper screenshot, the idempotency fixture over a claim of “exactly once,” the rollout/rollback evidence over a manifest alone, and the Inspector safe-failure transcript over generic AI wording.

## Test the demo

Ask another person to follow Demo Mode without narration. Record broken links, unclear terms, secret exposure, stale output, and places where they cannot tell live from recorded evidence. Fix the path, not by adding more claims.

## Check

```bash
./scripts/verify.sh && kubectl rollout status deployment/gold-pasal-api
```

Save the ten-minute recording and a claim-to-artifact checklist. Communication reaches rubric score 3 only when the explanation is interview-ready and caveated.

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

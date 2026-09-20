---
title: "R13 — Job-ready portfolio release"
description: "A defensible system narrative supported by working operational evidence."
---

# R13 — Job-ready portfolio release

**Release promise:** A defensible system narrative supported by working operational evidence.

<LessonMission
  role="job candidate"
  problem="A reviewer has limited time and needs evidence of judgment, not a tour of every file."
  destination="A concise demo connects product behavior, design trade-offs, tests, delivery, recovery, and AI safety."
/>

## Lessons

1. [Review the architecture and close accidental complexity](01-review-the-architecture-and-close-accidental-complexity)
2. [Curate ADRs, diagrams, OpenAPI, and operational runbooks](02-curate-adrs-diagrams-openapi-and-operational-runbooks)
3. [Build a guided Demo Mode from the Portfolio Ledger](03-build-a-guided-demo-mode-from-the-portfolio-ledger)
4. [Rehearse a backend system-design walkthrough](04-rehearse-a-backend-system-design-walkthrough)
5. [Rehearse Python, testing, API, database, Kubernetes, and AI trade-offs](05-rehearse-python-testing-api-database-kubernetes-and-ai-trade-offs)
6. [Translate release evidence into honest résumé bullets](06-translate-release-evidence-into-honest-resume-bullets)
7. [Run a final incident, rollback, and agent-safety drill](07-run-a-final-incident-rollback-and-agent-safety-drill)
8. [Release gate: publish the final release and identify the next specialization](08-release-gate-publish-the-final-release-and-identify-the-next-specialization)

## Release evidence

Run `./scripts/verify.sh && kubectl rollout status deployment/gold-pasal-api` and preserve curated ADRs, CI/deployment evidence, demo script, and honest résumé bullets. At the review, defend this
invariant: **every claim in the presentation points to inspectable evidence and names its limits.**

<ArchitectureTrail
  before="A reviewer has limited time and needs evidence of judgment, not a tour of every file."
  decision="Introduce only the boundary and mechanism needed by this release."
  after="A concise demo connects product behavior, design trade-offs, tests, delivery, recovery, and AI safety."
/>

## Rehearse the final story

<DemoMode />

## Curate the evidence

<PortfolioLedger />

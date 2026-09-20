---
id: r13-08
title: "Release gate: publish the final release and identify the next specialization"
release: r13
order: 8
prerequisites: [r13-07]
outcomes:
  - Apply release gate: publish the final release and identify the next specialization to the cumulative Gold Pasal system
  - Explain the resulting behavior and its failure boundary
evidence: [commit, ci-run, demo]
---

<LessonMission
  role="job candidate"
  problem="A reviewer has limited time and needs evidence of judgment, not a tour of every file."
  destination="A concise demo connects product behavior, design trade-offs, tests, delivery, recovery, and AI safety."
/>

# Release gate: publish the final release and identify the next specialization


Publishing is a claim that another engineer can inspect, run, and question your work. It is not uploading everything you produced.

## See the idea first

Curate a public entry point with the Gold Pasal problem, current architecture, local run path, safe demo path, verification command, deployed evidence if real, ADR index, OpenAPI contract, operational runbook, incident/rollback evidence, MCP safety evidence, and explicit limitations.

Before publishing:

- remove secrets, private addresses, customer data, local absolute paths, and stale artifacts;
- verify links from a clean reader path;
- pin or identify the released commit and container artifact;
- run the complete verification and public smoke path;
- confirm setup and rollback instructions match the release;
- distinguish live deployment, recorded fixture, design assumption, and missing evidence.

<FailureWorkbench incident="A reviewer clones the release but the demo depends on an unlisted local secret and stale database." :hypotheses="['setup was tested only in the author shell', 'fixture ownership is unclear', 'README overstates reproducibility']" next-evidence="Clean-environment rehearsal reaches the documented safe demo or reports the exact external prerequisite." />

## Score before you claim Proven

Use the evidence rubric. Every dimension must be at least 2. R13 additionally requires 3 in Behavior, Operations, and Communication:

- Behavior: failure and recovery paths pass.
- Operations: deployment is observable and rollback is proven.
- Communication: the explanation is interview-ready and names caveats.

If a cluster, CI link, or live deployment is unavailable, mark that gap. You may still publish a strong Practiced portfolio. Do not fabricate the missing proof.

## Choose the next specialization from evidence

Review the ledger for repeated strength, recurring gaps, and the work you want more of:

- Backend/platform: deepen concurrency, performance profiling, distributed systems, and database operations.
- Kubernetes/SRE: deepen SLOs, alert quality, autoscaling, progressive delivery, and incident leadership.
- AI application engineering: deepen evaluations, trace replay, retrieval safety, policy versioning, and human approval UX.
- Security: deepen threat modeling, tenant isolation, supply chain, secrets, and authorization testing.
- Data/ML: deepen data quality, reproducibility, offline/online evaluation, and model serving.

Choose one, not all. Write a 30-day experiment with a concrete artifact and success criterion. “Learn Kubernetes” is vague; “add and drill an SLO-backed canary rollback with measured detection time” is testable.

<PredictThenRun prompt="Which specialization follows from the strongest evidence and most important unresolved Gold Pasal risk?" />

Worked reasoning: if the incident drill exposed weak detection and rollback confidence, Kubernetes/SRE is a better next step than adding another MCP tool. If deterministic controls are strong but tool quality is unmeasured, AI evaluations may be the higher-value specialization.

## Practice

Tag or otherwise identify the final release according to the repository’s existing process. Open the public entry point as a reviewer, run the safe demo, then give the ten-minute walkthrough and answer one adversarial question without reading a script.

## Check

```bash
./scripts/verify.sh && kubectl rollout status deployment/gold-pasal-api
```

Record release identity, CI result, rollout result, demo link, rubric scores, caveats, and the next-specialization experiment in the Portfolio Ledger.

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

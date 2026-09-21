---
id: r14-04
title: "Honest resume bullets"
release: r14
order: 4
prerequisites: [r14-03]
outcomes:
  - Write 4-6 bullets with evidence links
  - Remove claims you cannot demo
evidence: [commit, ci-run]
---

<LessonMission
  role="job candidate"
  problem="A draft bullet says you 'built a production Kubernetes platform and a company-wide GitOps mesh.'"
  destination="Bullets that name Gold Pasal, kind, fixtures, and the Mandala mock without inflating."
/>

# Honest resume bullets

Honesty scales. You ran Kubernetes on kind, not EKS, unless you did the homelab side quest. You tested OpenAI with fixtures. You integrated a mock customer. Those are real skills. Inflated claims die in the first follow-up.

## See the idea first

From `gold-pasal`:

```bash
ls docs/adr INTERVIEW.md docs/INTERVIEW.md 2>/dev/null | head
```

```text

```

Add docs/RESUME.md. Each bullet ends with a path or a command.

## Shape

- "Designed Decimal pricing and property tests for NPR quotes" -> tests/unit
- "Enforced one active hold with a uniqueness constraint and integration tests" -> tests/inventory
- "Published an image digest to GHCR and rolled back by Git" -> deploy/kind
- "Shipped an assistant with retrieval evals; CI uses recorded OpenAI fixtures" -> tests/evals
- "Integrated a mock customer CSV/API with a discovery note and HTMX demo" -> customer/mandala

No "world-class," no "production at scale" unless it is true. kind is a local cluster. Say so.

## Java mapping

If you came from Spring, one bullet can say you mapped typed boundaries to Protocols and pyright. Do not say you "mastered Kubernetes" off kind. Do not say "production RAG platform" for a local Ollama assistant with fifteen gold questions.

## If it fails

| What you see | Cause | Fix |
| --- | --- | --- |
| EKS on the resume without evidence | inflation | Write kind |
| paid API in CI claimed | false | Fixtures |

## Practice

<LessonQuiz
  question="How do you describe the cluster work?"
  a="Ran enterprise multi-region mesh"
  b="Deployed the API to a local kind cluster with rollback"
  c="Invented Kubernetes"
  d="Skipped it because kind is fake"
  correct="b"
>

kind is real Kubernetes. Lying about EKS is not.

</LessonQuiz>

Next: [Final incident and safety drill](05-final-incident-and-safety-drill).

<EvidenceCard
  command="test -f docs/RESUME.md"
  artifact="RESUME.md bullets with links"
  invariant="Every bullet is demoable from this repo."
/>

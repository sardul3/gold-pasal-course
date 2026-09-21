---
id: r14-03
title: "Rehearse the system-design walkthrough"
release: r14
order: 3
prerequisites: [r14-02]
outcomes:
  - Write INTERVIEW.md with the 10-minute path
  - Practice once with a timer
evidence: [demo]
---

<LessonMission
  role="job candidate"
  problem="A 45-minute interview. You start at uvicorn flags and never reach holds or evals."
  destination="A timed 10-minute path: quote, hold race, checkout, delivery digest, assistant honesty, Mandala."
/>

# Rehearse the system-design walkthrough

Walk the product, not the file tree. Start with Maya's quote (R1), the double hold (R4), replay-safe checkout (R5), digest deploy (R9), grounded false (R10), Mandala (R13). Kubernetes objects only if they ask. Have one trade-off ready: kind vs homelab, Ollama vs OpenAI fixtures.

## See the idea first

From `gold-pasal`:

```bash
test -f docs/architecture.md && echo ok
```

```text
ok
```

Add INTERVIEW.md with minute marks. Use DemoMode on the course site if you still have a ledger; the shop README is enough.

## Path

1. Quote is Decimal and tested
2. One physical item, one active hold
3. Idempotent order
4. Image digest in Git
5. Assistant cannot invent SKUs
6. Customer adapter + HTMX

If they want deep Kubernetes, R8 probes and undo. If they want agents, R11 confirm. Do not apologize for skipping Argo CD; it is a side quest.

The course site Portfolio Ledger can store links. It is not a substitute for the repo.

## Trade-off card

Keep one card in INTERVIEW.md: "kind vs homelab" or "Ollama default vs OpenAI fixtures." Context, choice, consequence. If they want Kubernetes depth, you have R8 probes. If they want hosted models, you have the adapter and the CI rule.

## If it fails

| What you see | Cause | Fix |
| --- | --- | --- |
| starting at Dockerfile line 1 | lost the interviewer | Start at the shopper |
| cannot name a trade-off | unprepared | kind vs homelab is enough |

## Practice

<LessonQuiz
  question="Where does a 10-minute walkthrough start?"
  a="uv internals"
  b="A shopper-facing invariant (quote or hold)"
  c="Argo CD Application YAML"
  d="Your GPA"
  correct="b"
>

Interviews buy product judgment first.

</LessonQuiz>

Next: [Honest resume bullets](04-honest-resume-bullets).

<EvidenceCard
  command="test -f INTERVIEW.md || test -f docs/INTERVIEW.md"
  artifact="timed script"
  invariant="Every minute maps to evidence in the repo."
/>

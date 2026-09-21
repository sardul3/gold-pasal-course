---
id: r13-08
title: "Release gate: customer integration"
release: r13
order: 8
prerequisites: [r13-07]
outcomes:
  - Defend the mapping and non-goals
  - Show safe failure
evidence: [commit, ci-run, demo]
---

<LessonMission
  role="forward-deployed engineer"
  problem="A reviewer plays the customer. They will ask to see discovery, a working adapter, UI, runbook, and a failure."
  destination="All five artifacts, tests green, demo follows the script."
/>

# Release gate: customer integration

This is the release gate. Produce DISCOVERY.md, adapter tests, /demo, RUNBOOK.md, DEMO.md. pytest for mandala, assistant MT- cases, and demo HTTP. Then walk the script live or from the recording.

## See the idea first

From `gold-pasal`:

```bash
uv run pytest tests/adapters/test_mandala.py tests/http/test_demo.py -q
```

```text
... passed
```

If red, the gate is not met.

## Checklist

- Mock runs
- Mapping table accurate
- Adapter tests include tola and ok-false
- Assistant and MCP see MT- SKUs
- HTMX demo
- Runbook rollback
- Recorded or live stakeholder walkthrough

R14 turns this plus R0-R12 into interview evidence. Do not skip the messy customer work and jump to resume bullets.

## Reviewer questions

Expect: "What did you refuse to change on their side?" (CSV and 200-ok-false.) "What happens on 429?" (runbook.) "Can the assistant invent an MT SKU?" (no.) Answer from files, not from memory.

## Repo paths

All five artifacts live under `customer/mandala/` plus tests under `tests/adapters` and `tests/http/test_demo.py`. If a reviewer cannot find DISCOVERY.md in thirty seconds, move it. FDE work that is hidden is work that did not happen.

## If it fails

| What you see | Cause | Fix |
| --- | --- | --- |
| no failure in the demo | too happy-path | Show 429 or unknown SKU |
| rewrote Mandala to be clean | missed the point | Keep the quirks |

## Practice

<LessonQuiz
  question="What is this gate proving?"
  a="That you can design a greenfield shop only"
  b="That you can integrate someone else's messy system and explain it"
  c="That Argo CD is installed"
  d="That you memorized Kubernetes network policies"
  correct="b"
>

That is the FDE job this release rehearses.

</LessonQuiz>

<EvidenceCard
  command="uv run pytest tests/adapters/test_mandala.py tests/http/test_demo.py tests/evals/assistant -q"
  artifact="five files plus green tests plus demo"
  invariant="Customer constraints are visible in the write-up and the running system."
/>

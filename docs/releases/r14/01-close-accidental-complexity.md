---
id: r14-01
title: "Close accidental complexity"
release: r14
order: 1
prerequisites: []
outcomes:
  - Remove or park unused paths
  - Write docs/architecture.md as of this commit
evidence: [commit, adr]
---

<LessonMission
  role="job candidate"
  problem="The repo grew flags, dead adapters, and a second catalog path you no longer use."
  destination="A short architecture note of what remains and what you deleted or parked."
/>

# Close accidental complexity

R13 added a customer adapter. R0-R12 added many files. Before interviews, delete dead code or move it behind a clearly named extra. Do not keep two hold implementations. **Accidental complexity** is what a reviewer trips on that does not serve a requirement.

## See the idea first

From `gold-pasal`:

```bash
./scripts/verify.sh | tail -1
```

```text
... passed
```

Verify stays green after every deletion.

## Pass

Grep for TODO, unused Settings, and commented routes. If Mandala is extra, keep it but make postgres the default. If a feature is a side quest, say so in architecture.md.

architecture.md: boxes for API, Postgres, kind, assistant, agent, MCP, Mandala adapter. Arrows. One page.

Do not add a new framework on this page.

## Park vs delete

If you might show Mandala in an FDE interview, keep it. If you added an experimental embedding retriever you never evaled, delete it or move it to `extras/` with a README that says it is not in the gate. Interviewers will grep `extras` less than `src/gold_pasal`.

## If it fails

| What you see | Cause | Fix |
| --- | --- | --- |
| verify red after delete | you needed that module | Restore or replace the test |
| architecture.md is 20 pages | too much | One page |

## Practice

<LessonQuiz
  question="What do you do with unused hold code?"
  a="Leave it for history in src/"
  b="Delete it or move it out of the main path"
  c="Wrap it in an agent"
  d="Put it in the Ingress"
  correct="b"
>

Reviewers read src/. Dead paths look like confusion.

</LessonQuiz>

Next: [Curate ADRs and runbooks](02-curate-adrs-and-runbooks).

<EvidenceCard
  command="./scripts/verify.sh"
  artifact="architecture.md and a smaller main path"
  invariant="Every remaining module has a job on the diagram."
/>

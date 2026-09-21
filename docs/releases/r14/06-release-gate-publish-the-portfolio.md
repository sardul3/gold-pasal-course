---
id: r14-06
title: "Release gate: publish the portfolio"
release: r14
order: 6
prerequisites: [r14-05]
outcomes:
  - Publish or share gold-pasal
  - Name one next specialization without pretending you finished it
evidence: [commit, ci-run, demo]
---

<LessonMission
  role="job candidate"
  problem="A hiring manager has twenty minutes and a GitHub URL that 404s."
  destination="A public or shared repo, README that matches RESUME.md, architecture, Mandala demo, and a next-skill line that is honest."
/>

# Release gate: publish the portfolio

This is the last gate. README: what the shop is, how to verify, how to run kind optionally, how to run Mandala demo, links to ADRs. Next specialization examples: EKS, remote MCP, the TypeScript storefront. Do not list them as done.

## See the idea first

From `gold-pasal`:

```bash
./scripts/verify.sh | tail -1
```

```text
... passed
```

Push to GitHub if you have not. The course site is not the shop.

## Publish

```bash
gh repo view
./scripts/verify.sh
```

README must not claim Argo CD or a homelab unless you did those side quests.

The course constellation now has fifteen releases. This one is the interview layer on top of the FDE capstone.

Stop. Do not start a new platform rewrite the night before the interview.

## Secrets scan

Before you make the repo public, `git grep -E 'sk-|AKIA|BEGIN PRIVATE'` and confirm `.env` is ignored. A public Gold Pasal with a staff token in history is a worse portfolio than a private repo with a clean README and a shared link.

## If it fails

| What you see | Cause | Fix |
| --- | --- | --- |
| private repo they cannot open | share or make a public fork without secrets | Check .env is not in git |
| README lists undone work as done | edit RESUME and README together | Honesty |

## Practice

<LessonQuiz
  question="What does this gate add on top of R13?"
  a="A second customer mock"
  b="Curated evidence and an honest public story"
  c="Argo CD"
  d="Paid CI model calls"
  correct="b"
>

R13 is the integration. R14 is how you talk about the whole shop.

</LessonQuiz>

<EvidenceCard
  command="./scripts/verify.sh && gh repo view"
  artifact="shared repo, README, RESUME.md, architecture, drill"
  invariant="The story and the repository match."
/>

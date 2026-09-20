# Gold Pasal Course

Gold Pasal Course is a self-paced, project-based path from Java/Spring familiarity to production Python, FastAPI, platform engineering, and safe AI systems.

The learner builds one Nepal-focused jewelry store in a separate repository: [`../gold-pasal`](../gold-pasal). Lessons introduce concepts only when the next product release needs them. Every release ends with evidence that can be inspected in Git, CI, or the homelab deployment.

## Repository contract

This repository owns:

- VitePress lesson content and reference material
- release and lesson metadata
- interactive learning components
- black-box release checks under `checks/`
- browser-local learning convenience data
- curriculum rubrics, link checks, and site CI/CD

This repository does **not** own:

- Gold Pasal business logic or deployable API code
- learner secrets or credentials
- authoritative proof of competency
- copied content from the related projects under `~/dev`

The application repository is the source of truth for implementation. Browser progress distinguishes:

1. **Read** — the lesson was opened and reviewed.
2. **Practiced** — the learner completed the guided exercise.
3. **Proven** — the learner attached inspectable Git, CI, or deployment evidence.

The application starter intentionally contains no solved release behavior. Learners write both tests and production code; course-owned checks verify only public outcomes.

## Course map

The core path contains fourteen cumulative releases:

`R0 Workshop → R1 Quote desk → R2 Domain core → R3 API → R4 Inventory → R5 Orders → R6 Production confidence → R7 Containers → R8 Kubernetes → R9 Delivery → R10 LLM → R11 Agent → R12 MCP → R13 Portfolio`

Optional side quests never block graduation.

## Local development

Requires Node.js 22 or newer.

```bash
npm install
npm run docs:dev
```

The published course is at <https://sardul3.github.io/gold-pasal-course/>. GitHub Actions builds VitePress on `main` and deploys to GitHub Pages.

The complete quality gate is:

```bash
npm run verify
```

## Content rules

Every lesson starts from a concrete store problem, puts a command or file in front of the reader early, teaches new terms at first use, uses hand-checkable domain values, walks through non-trivial code, and ends with automated and portfolio evidence. Avoid unrelated toy exercises, unexplained code dumps, and notes homework that delays the first typed step.

See [CONTRIBUTING.md](CONTRIBUTING.md) for the full authoring contract.

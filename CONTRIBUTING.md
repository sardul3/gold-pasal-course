# Contributing to Gold Pasal Course

## Authoring contract

A lesson is ready only when a learner can answer all of these questions:

1. What store problem are we solving?
2. What is the first command or file I open?
3. Which idea is new, and why is it needed now?
4. How can I check the smallest example by hand or by running it?
5. What does each non-trivial code block do?
6. What output should this command produce?
7. Which automated check proves the public behavior?
8. Which artifact belongs in my portfolio ledger?

Use second person and imperative voice. Keep examples in the Nepal jewelry domain. Gloss a term once, then use the real word. Never say “simply,” “obviously,” or “as you know.” Write a live session: destination, then type this, then expected output, then the next piece. Park long why on a concept page. Do not make notes homework the main activity. Learners follow the published site and type in `gold-pasal`. Do not mention `gold-pasal-course` as a local folder they might open.

## Lesson structure

Each lesson file must contain:

- typed frontmatter with a stable `id`, release, order, prerequisites, outcomes, and evidence
- `LessonMission`, describing a customer, staff, or production incident
- a first typed step with expected output (`## See the idea first`)
- implementation as file edits and commands on the same session, plus a walkthrough of non-trivial code
- one bounded practice change or quiz
- a public-seam check
- an `EvidenceCard`

Release gates also require a demo, failure drill, reflection, and interview defense.

## Code and command safety

- Never put `.env`, tokens, kubeconfigs, or private keys in lessons or fixtures.
- Use placeholders for credentials and private addresses.
- Prefer reversible commands and explain rollback before destructive operations.
- Pin material dependencies and state supported versions.
- CI examples must not call paid LLM APIs.

## Source boundaries

The course may link to `docs`, `brain`, `ai-sme-map`, `mcp-sme`, `dealradar`, and `langchain`. Do not copy their prose or create another general-purpose atlas. A related link must explain why it is useful at that exact point in the course.

## Pull request checklist

- [ ] The lesson solves a release need.
- [ ] New terms and complex code are explained.
- [ ] Commands have expected outcomes and safe failure paths.
- [ ] The app behavior starts with a failing test.
- [ ] Keyboard and screen-reader paths work for new UI.
- [ ] `npm run verify` passes.
- [ ] Referenced app checks pass in `../gold-pasal`.

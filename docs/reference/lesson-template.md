---
title: Lesson authoring template
description: Required structure for a Gold Pasal lesson.
---

# Lesson authoring template

Write a live session a first-time reader can type through without a second tab.
Stay on the Gold Pasal story. Show a shop problem, then the first command or
file, then name the idea. Do not paste the release `LessonMission` onto every
page: that card belongs on the release index. Each lesson gets its own job.

`scripts/validate-content.mjs` requires frontmatter (`id`, `title`, `release`,
`order`, `outcomes`, `evidence`), `<LessonMission`, `## See the idea first`,
`## Practice`, and `<EvidenceCard`. The layout appends lesson state at the
end of every page that has a lesson `id`. Do not place `<LessonProgress>`
in the markdown.

`<JavaBridge>`, `<CareerSignal>`, and the appended lesson-state panel start
closed. `<PythonRunner>` is optional and only for small
browser snippets that do not need `gold_pasal` or `uv`. `<LessonQuiz>` is a
graded multiple-choice check: instant why, retry until the right pick, then
lock. Use it when the page has a single best answer, as in R0.
`<PredictThenRun>` remains the default spoiler until a lesson has authored
options.

## Authoring rules

- Second person. Imperative. Short sentences. One idea per paragraph.
- First typed step within a few paragraphs. Expected output sits under the command.
- Gloss a term on first use: `smoke test (the smallest check that the shop opened)`.
- After any non-trivial function, walk it in execution order with a typical value.
- Every new topic gets one hand-checkable example on this story.
- Practice is one bounded typed change or one quiz, not notes homework.
- Outcomes name something the learner can do after this page, not
  “Apply {title} to the cumulative Gold Pasal system.”
- `CareerSignal` is optional. If you use it, make the interview question match
  this lesson. Do not repeat the release question on every page.
- One companion reading, or none. Do not dump the same textbook list.
- State a release boundary once, where someone might violate it.

Drop any sentence that would still make sense if you swapped the lesson title.
Banned openers and filler: “In this lesson we will explore,” “Let’s dive in,”
“It’s important to note that,” “robust,” “leverage,” “seamlessly,” “This page
is still orientation,” “Write two sentences in your notes.”

## Source shape

Replace every placeholder. Extra headings should match the session (`Open this
file`, `Run this`, `If it fails`), not a catalog spine. For a setup-only lesson,
the “implementation” is real files and terminal commands, not application
features.

````md
---
id: r0-01
title: Name the learner-visible outcome
release: r0
order: 1
prerequisites: []
outcomes:
  - Describe one observable capability this page teaches
evidence: [commit, ci-run]
---

<LessonMission
  role="counter salesperson"
  problem="Name the concrete shop incident this page solves."
  destination="Name what the learner can run or open when the page is complete."
/>

# Name the learner-visible outcome

Who is at the counter, what is broken, and the first command or file to open.
Do not start with a definition.

## See the idea first

The smallest thing they type or run. Expected output immediately under it.
Then name the idea.

<JavaBridge
  java="The Spring habit this page reuses."
  python="How this repository expresses it."
  caution="Where the analogy fails for this lesson."
/>

<PythonRunner
  label="Name the snippet in store language"
  code="customer_name = 'Maya'
print(customer_name)"
/>

## Run this

The next command or file edit on the same session. Comments only for *why*.

## If it fails

What they see, the likely cause, the fix. Skip this heading if the page cannot
fail that way.

## Practice

One bounded typed change or one quiz. Predicted result sits next to the command.

## Check

```bash
the verification command
```

<EvidenceCard
  command="the verification command"
  artifact="the commit, CI run, ADR, or deployment evidence"
  invariant="the business rule proved by the evidence"
/>
````

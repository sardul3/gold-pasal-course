---
id: r6-05
title: "Use coverage to find risk, not chase a percentage"
release: r6
order: 5
prerequisites: [r6-04]
outcomes:
  - Apply use coverage to find risk, not chase a percentage to the cumulative Gold Pasal system
  - Explain the resulting behavior and its failure boundary
evidence: [commit, ci-run]
---

<LessonMission
  role="on-call engineer"
  problem="An order fails in production and a green unit suite does not reveal whether the API, database, or dependency caused it."
  destination="Layered tests and telemetry narrow the failure without guesswork."
/>

# Use coverage to find risk, not chase a percentage


This is step 5 of 11. Use coverage as a map of executed code, not a score for trust.

## See the idea first

### Ninety percent, still unsafe

Gold Pasal reports 90% line coverage, yet a missing catalog item returns a traceback. Many setup and happy-path lines ran. The untested branch is the one shoppers encounter when a SKU is gone.

**Line coverage** asks whether a line executed. **Branch coverage** asks whether each decision outcome executed. Neither asks whether the test asserted the right result.

<TestMatrix unit="each order-state decision has meaningful examples" slice="404 and dependency-failure responses are both exercised" integration="commit, rollback, absent-row, and constraint paths are measured" />

<FailureWorkbench incident="High coverage coexists with traceback leakage for an absent SKU." :hypotheses="['the error branch is uncovered', 'the branch runs but no safety assertion exists', 'excluded files hide boundary code']" next-evidence="Open the branch report at the missing-item route and inspect the test assertion." />

## Read a tiny report by hand

Suppose a function has four executable lines:

```text
1 read item
2 if item is absent
3 return safe 404
4 return item
```

A happy-path test executes lines 1, 2, and 4: 75% line coverage. Adding a test that merely calls the absent case can reach 100%, even if it never asserts content type or traceback safety. Coverage found the gap; the assertion supplies confidence.

## Learner work: risk before percentage

Run coverage with branch reporting using the project’s configured tool. List uncovered lines in:

- order writes and rollback;
- catalog absence;
- authentication/authorization denial;
- request-ID and problem-details middleware.

Choose the uncovered branch with the greatest customer or operator cost. Write a failing behavioral test for it before considering the total percentage.

<PredictThenRun prompt="If one test calls the missing-item branch but asserts only status 404, which release-contract risks remain unproved?">

After the new test passes, compare branch movement and read the assertion aloud. Do not add tests that execute lines without discriminating correct from incorrect output.

</PredictThenRun>

## Coverage judgment

Generated files, migrations, and defensive “cannot happen” branches need explicit treatment rather than silent exclusion. If you exclude code, record why testing it would not improve confidence. A lower honest number is better than a polished number with hidden boundaries.

## Practice

Temporarily remove one assertion from the safe-404 test. Predict whether coverage changes. Run it, restore the assertion, and explain why identical coverage can represent different confidence.

## Worked answer

Removing the “no traceback” assertion usually leaves coverage unchanged because the same application lines execute. Yet the release guarantee is weaker. The report guides attention; a test’s observation and assertion establish the claim.

## Check

```bash
uv run pytest --cov --cov-branch --cov-report=term-missing
```

Keep one short risk note naming the branch you selected, the test added, and what remains intentionally uncovered.

<EvidenceCard
  command="uv run pytest --cov --cov-branch --cov-report=term-missing"
  artifact="a diagnostic trace, focused regression test, and short postmortem"
  invariant="tests and telemetry cover different risks and remain deterministic"
/>

<CareerSignal
  role="Python backend engineer with production AI skills"
  signal="a diagnostic trace, focused regression test, and short postmortem"
  interview-question="What belongs in a unit, slice, integration, or contract test?"
/>

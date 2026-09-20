---
id: r6-06
title: "Enforce formatting, linting, typing, and import boundaries"
release: r6
order: 6
prerequisites: [r6-05]
outcomes:
  - Apply enforce formatting, linting, typing, and import boundaries to the cumulative Gold Pasal system
  - Explain the resulting behavior and its failure boundary
evidence: [commit, ci-run]
---

<LessonMission
  role="on-call engineer"
  problem="An order fails in production and a green unit suite does not reveal whether the API, database, or dependency caused it."
  destination="Layered tests and telemetry narrow the failure without guesswork."
/>

# Enforce formatting, linting, typing, and import boundaries


This is step 6 of 11. Turn cheap static checks into fast feedback before runtime.

## See the idea first

### A safe error path bypassed

The catalog route imports a PostgreSQL adapter directly. A test replaces the application’s repository port, but this route silently bypasses it. When the database fails, the route leaks an internal exception instead of returning safe problem details.

Formatting makes source layout consistent. **Linting** finds suspicious source patterns. **Static typing** checks whether values are used according to declared shapes without running the app. An **import boundary** says which package layers may depend on which others.

<TestMatrix unit="Ruff and Pyright reject local defects quickly" slice="HTTP code depends on application ports, not database adapters" integration="adapters implement owned typed contracts" />

<FailureWorkbench incident="A route bypasses error mapping by importing a database adapter." :hypotheses="['no layer rule exists', 'the port type is too vague', 'static checks omit the HTTP package']" next-evidence="Run import-boundary and Pyright checks on the offending module." />

## See the dependency direction

Use the repository’s actual package names, but preserve this direction:

```text
HTTP adapter -> application service -> domain
database adapter -> application port -> domain
domain -X-> HTTP, database, FastAPI, SQLAlchemy
```

The arrow means “may import.” The crossed arrow means “must not import.” If the domain imports FastAPI’s `HTTPException`, a pricing rule can no longer run independently of the web framework.

## Learner work: fail each gate on purpose

Configure Ruff for formatting and linting, Pyright for the application package, and the project’s import-boundary checker or architecture test. Before fixing anything, introduce one safe temporary violation for each:

- an unused import for Ruff;
- a function returning `None` where an order is promised for Pyright;
- a domain-to-FastAPI import for the boundary rule.

Run the narrow command and read the file, line, and reason. Revert the temporary violations, then address real failures without adding blanket ignores.

<PredictThenRun prompt="Which gate should reject a domain module importing FastAPI, and why would Pyright alone be insufficient?">

Run checks in the cheapest-first order: format check, Ruff, import boundaries, Pyright, then tests.

</PredictThenRun>

## Walk through one type

Follow the catalog lookup result from repository port to service to HTTP mapper. Distinguish “item absent” from “database failed” in the type or exception contract. If both become an untyped `Any` or `None`, static analysis cannot protect the 404-versus-503 decision.

## Practice

Find one `Any`, broad ignore, or reversed import in the missing-item path. Predict the first static command that will expose it. Tighten the seam and keep the r6 safe-error test green.

## Worked answer

An import boundary catches architectural direction; Pyright catches incompatible value use; Ruff catches source defects and consistency issues. None proves PostgreSQL behavior, so integration tests remain necessary.

## Check

```bash
uv run ruff format --check . && uv run ruff check . && uv run pyright
```

Add the project’s import-boundary command to the same CI job. Do not weaken a rule merely to make the gate green; fix the dependency or document a narrow, reviewed exception.

<EvidenceCard
  command="uv run ruff format --check . && uv run ruff check . && uv run pyright"
  artifact="a diagnostic trace, focused regression test, and short postmortem"
  invariant="tests and telemetry cover different risks and remain deterministic"
/>

<CareerSignal
  role="Python backend engineer with production AI skills"
  signal="a diagnostic trace, focused regression test, and short postmortem"
  interview-question="What belongs in a unit, slice, integration, or contract test?"
/>

---
id: r0-02
title: "Java to Python"
release: r0
order: 2
prerequisites: [r0-01]
outcomes:
  - Rebind a karat name from 22 to "22K" and see Python accept it
  - Map Gradle, JUnit, and Checkstyle onto uv, pytest, Ruff, and Pyright
  - Name which tool owns lockfiles, types, quote values, and missing HTTP routes in R0
evidence: [commit, ci-run]
---

<LessonMission
  role="new backend engineer"
  problem="You brought Spring habits into an empty Python shop and cannot tell which tool would catch a bad karat value."
  destination="You can point at uv, Ruff, Pyright, and pytest and say what each one can and cannot prove."
/>

# Java to Python

You keep useful Spring instincts: explicit boundaries, tests, and one build command. Python does not enforce those ideas in the same places.

A salesperson enters `22` for karat. Python can then **rebind** (point the same name at a new value) that name to `"22K"`.

## See the idea first

Run this on the page. It does not touch `src/gold_pasal`.

<PythonRunner
  label="Rebind karat and watch the runtime accept it"
  code="karat = 22
print(type(karat).__name__, karat)
karat = '22K'
print(type(karat).__name__, karat)"
/>

You should see `int 22` then `str 22K`. The runtime accepts the assignment. **Pyright** (the type checker) is what reports the mismatch before merge. That split is why this shop runs both Pyright and pytest.

<JavaBridge java="Java compiles declared types; Spring often discovers components at startup." python="Python executes modules at runtime; Pyright checks type hints; tests check behavior." caution="FastAPI resembles Spring MVC at HTTP, but R0 has no FastAPI dependency or API code." />

## Map the bench

| Spring habit | This shop |
| --- | --- |
| Gradle / Maven wrapper | `uv` plus committed `uv.lock` |
| `src/main/java` | `src/gold_pasal` |
| JUnit | pytest (plain `test_` functions) |
| Checkstyle / formatter | **Ruff** (linter and formatter) |
| `javac` type errors | Pyright on type **hints** (annotations) |
| `./gradlew check` | `./scripts/verify.sh` |

The analogy fails at the framework. **Dependency injection** (a container supplying collaborators) is a Spring default. Plain Python often passes a function or object directly. Do not add FastAPI before an HTTP job exists.

## Prove Pyright sees only configured paths

Do not put this file in `src/gold_pasal`. If you already have `uv`, from `gold-pasal` write `scratch_karat.py` at the shop root:

```python
karat: int = 22
karat = "22K"
```

Then:

```bash
uv run pyright
uv run pyright scratch_karat.py
```

The first stays green: this project's Pyright include paths are `src` and `tests`. The second fails. Expected last lines:

```text
error: Type "Literal['22K']" is not assignable to declared type "int"
1 error, 0 warnings, 0 informations
```

Delete `scratch_karat.py`. Do not commit it. If `uv` is missing, keep the in-page result and run the two commands after [Prepare the workshop](03-prepare-the-terminal-git-python-uv-editor-and-repository-safely).

## Practice

<LessonQuiz
  question="If you assign '22K' to an int-annotated name, which statement is true in this R0 workspace?"
  a="Python refuses to run the assignment"
  b="Ruff is the type checker that rejects it"
  c="Pyright reports the mismatch; Python still runs the assignment"
  d="pytest fails even though R0 has no karat test"
  correct="c"
>

Python itself runs it. Ruff is not the type checker. Pyright reports the mismatch when it sees that file. pytest fails only if a test asserts a result that exposes the bad value.

</LessonQuiz>

Classify each concern: lockfile, types, quote values, missing HTTP route. Answers: (1) `uv.lock` → dependency review, frozen sync must not rewrite it quietly. (2) `"22K"` on `int` → Pyright, if it sees the file. (3) Wrong NPR total → pytest, once R1 exists. (4) Missing route → not an R0 defect.

Next: [Prepare the workshop](03-prepare-the-terminal-git-python-uv-editor-and-repository-safely).

<EvidenceCard
  command="In-page runner: rebind karat from 22 to '22K'"
  artifact="a four-line classification of lockfile, types, quote values, and missing routes"
  invariant="R0 stays setup-only; FastAPI is not the proof that Python is ready"
/>

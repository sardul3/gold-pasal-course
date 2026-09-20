---
title: "R0 — Your Python workshop"
description: "A reproducible Python workspace and a first green quality check."
---

# R0 — Your Python workshop

**Release promise:** A reproducible Python workspace and a first green quality check.

<LessonMission
  role="new backend engineer"
  problem="The quote desk works on one laptop, but nobody can reproduce its Python setup."
  destination="A clean checkout runs the same command and reports the same result."
/>

Two folders:

- **`gold-pasal-course`** — this site. You read it.
- **`gold-pasal`** — the shop. You type there.

If `pwd` ends in `gold-pasal-course`, you are in the library.

## How to walk these seven pages

Open the shop. Run the command. Match the output. Then the one-line why.

1. **Welcome** — find the two folders, open the smoke test, name what R0 proves.
2. **Java to Python** — rebind a karat value, then map Gradle/JUnit habits onto `uv`, Ruff, Pyright, and pytest.
3. **Prepare the workshop** — install Git and uv, frozen-sync, run `./scripts/verify.sh`.
4. **The first program** — print `0.1.0`, inspect `__file__`, fail an assert on purpose.
5. **Read a traceback** — cause `AttributeError`, copy the last line, ask five useful questions.
6. **Small commits** — stage one file, unstage it, leave it on disk.
7. **Release gate** — commit if needed, push, open the green `application-ci` run.

Skip ahead and `./scripts/verify.sh` will look like a missing download. It is a path: the script lives in the shop folder, after `uv` is installed.

## Lessons

1. [Welcome to Gold Pasal](01-welcome-to-gold-pasal-the-product-learner-contract-and-graduation-evidence)
2. [Java to Python](02-map-java-spring-habits-to-python-fastapiplus-where-the-analogy-fails)
3. [Prepare the workshop](03-prepare-the-terminal-git-python-uv-editor-and-repository-safely)
4. [The first program](04-run-inspect-and-debug-the-first-python-program)
5. [Read a traceback](05-read-tracebacks-and-ask-useful-diagnostic-questions)
6. [Small commits](06-work-in-small-commits-and-recover-without-destructive-git)
7. [Release gate: first CI check](07-release-gate-reproducible-environment-and-first-ci-check)

## Release evidence

From `gold-pasal`, run `./scripts/verify.sh` and preserve a small commit plus the first green GitHub Actions run named `application-ci`. At the review, defend this invariant: **a new engineer can reproduce the environment without private machine state.**

<ArchitectureTrail
  before="The quote desk works on one laptop, but nobody can reproduce its Python setup."
  decision="Introduce only the boundary and mechanism needed by this release."
  after="A clean checkout runs the same command and reports the same result."
/>

---
title: Maintainer guide
description: How to evolve the curriculum without solving the learner's project.
---

# Maintaining Gold Pasal Course

## Protect the learner boundary

`gold-pasal-course` owns teaching, examples, and external acceptance contracts. `gold-pasal` is learner-owned. Do not add solved production behavior, migrations, deployment manifests, agent loops, or MCP handlers to the starter.

The starter may contain setup that every release needs: package metadata, strict quality tools, a smoke test, CI, ignore rules, and a documented verification command.

## Change a release

1. State the learner or operator outcome.
2. Update the typed release metadata.
3. Deepen the affected lesson prose and practical example.
4. Add or revise an external black-box check at the public seam.
5. Run the content validator, component tests, type check, and VitePress build.
6. Confirm the starter still passes R0 and later checks still fail for missing behavior rather than missing course infrastructure.
7. Record breaking public-contract changes in an ADR.

Do not rerun `scripts/generate-lessons.py --force` after hand-editing lessons. The generator exists only to create a new curriculum skeleton; force mode overwrites authored pages.

## Lesson review

A release is not complete because all titles have pages. Sample every lesson for:

- a Nepal jewelry incident with concrete values
- a first-use explanation of each new term
- a hand-checkable example before framework code
- a failing public-seam check before production instructions
- a walkthrough of branches, loops, formulas, and boundaries
- one bounded practice with an expected result
- an evidence artifact and an honest limitation

Reject prose that could be moved to an unrelated tutorial unchanged.

## External checks

Checks under `checks/rXX` may require public commands, routes, schemas, files, or protocols. They must not import private application modules or force an internal class/ORM layout.

R0 runs against the starter in course maintenance. R1–R12 are expected to fail until the learner reaches that release. Use `--collect-only` to validate their test modules without requiring a completed application.

## Dependency and link maintenance

- Pin lockfiles in both repositories.
- Keep course runtime dependencies separate from check-runner dependencies.
- Review public related-project URLs quarterly.
- Local-only projects are shown as paths, not broken `file://` links.
- Never add a second general-purpose resource atlas or personal progress authority.

# ADR 0001: Separate the course from the application

- Status: Accepted
- Date: 2026-09-20

## Context

The curriculum needs static-site tooling, interactive learning state, and frequent content changes. The learner application needs Python packaging, release tags, deployment history, and a portfolio-quality Git narrative.

Combining both would make course UI changes part of the application’s production history and would blur which repository owns competency evidence.

## Decision

Maintain two repositories:

- `gold-pasal-course` owns lessons, curriculum metadata, interactive teaching components, and site delivery.
- `gold-pasal` owns domain behavior, API code, tests, runtime configuration, and deployment manifests.

The course links to application checks and evidence. It never imports application source into the VitePress build.

## Consequences

- Each repository has an independent CI/CD pipeline and release cadence.
- Links and version expectations must be checked.
- Learners build one cumulative application rather than copying solved code per lesson.
- The application’s Git history remains understandable to interviewers.

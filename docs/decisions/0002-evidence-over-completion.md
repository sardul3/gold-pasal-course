# ADR 0002: Evidence over completion checkmarks

- Status: Accepted
- Date: 2026-09-20

## Context

A static VitePress site can store progress in the browser, but a checked box proves neither implementation skill nor operational judgment. An account-backed learning management system would add a second product and distract from the backend curriculum.

## Decision

Use local storage for resume position, bookmarks, predictions, and three visible states: Read, Practiced, and Proven. Treat Git, CI, ADR, runbook, evaluation, and deployment artifacts as the authoritative evidence for Proven.

Local data is versioned and exportable as JSON. It contains links and learner notes, never credentials.

## Consequences

- The course remains static and inexpensive to host.
- Learners own portable evidence.
- A browser reset may remove convenience state unless exported.
- The UI must state clearly that checkmarks are not competency claims.

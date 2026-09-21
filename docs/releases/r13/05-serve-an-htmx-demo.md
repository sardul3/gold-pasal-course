---
id: r13-05
title: "Serve an HTMX demo"
release: r13
order: 5
prerequisites: [r13-04]
outcomes:
  - Add HTML templates and HTMX partials
  - Keep tokens off the page
evidence: [demo]
---

<LessonMission
  role="forward-deployed engineer"
  problem="The stakeholder is not going to run curl or Inspector. They need a page."
  destination="FastAPI serves a small HTMX UI: search Mandala items, show assistant answer, staff confirm hold."
/>

# Serve an HTMX demo

**HTMX** swaps HTML fragments over HTTP. No new Node toolchain. Templates under `src/gold_pasal/demo/`. Search form GET returns a table. Ask form POST returns the assistant JSON rendered as HTML. Hold button POST hits confirm with the staff token from the server session or a demo header you document. The TypeScript storefront remains a [side quest](/side-quests/).

## See the idea first

From `gold-pasal`:

```bash
uv add jinja2 && mkdir -p src/gold_pasal/demo/templates
```

```text

```

If jinja2 is already there, skip add. Do not put OPENAI_API_KEY in HTML.

## Page

`GET /demo` staff-only or demo-mode flag from Settings (`GOLD_PASAL_DEMO=1`). Show mapping one-liner from DISCOVERY.md. Table of MT- SKUs. Question box. Answer with grounded badge.

Holds: the confirm path from R11, not a hidden auto-hold.

Keep CSS small. This is a stakeholder demo, not a marketing site.

Tests: HTTPX against /demo search with the Mandala fixture, expect SKU text in HTML.

## HTMX pattern

`hx-get="/demo/search"` on the form, `hx-target="#results"`. The partial is a table, not a JSON blob the browser parses. Validation errors return HTML with problem text. You already have problem details on the API; the demo can show the title field.

## If it fails

| What you see | Cause | Fix |
| --- | --- | --- |
| key in data-attribute | leak | Server-side only |
| SPA build step | wrong toolchain | HTMX + Jinja |

## Practice

<LessonQuiz
  question="Why HTMX here instead of the TypeScript storefront?"
  a="TypeScript is forbidden forever"
  b="No new toolchain; FastAPI already serves the shop"
  c="HTMX is required by MCP"
  d="kind needs HTMX"
  correct="b"
>

FDE demos should boot with the API you already have. TS stays optional.

</LessonQuiz>

Next: [Write the runbook](06-write-the-runbook).

<EvidenceCard
  command="uv run pytest tests/http/test_demo.py -q"
  artifact="GET /demo showing MT items"
  invariant="The browser never holds provider keys."
/>

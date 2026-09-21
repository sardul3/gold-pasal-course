---
id: r9-05
title: "Smoke after deploy"
release: r9
order: 5
prerequisites: [r9-04]
outcomes:
  - Run a post-apply smoke command
  - Keep the failing output instead of retrying until green
evidence: [deployment]
---

<LessonMission
  role="delivery owner"
  problem="The new digest is applied. Nobody curled /ready. Checkout is broken and the PR is already green."
  destination="A documented smoke: /health, /ready, and a catalog 404, run after apply, with failures kept."
/>

# Smoke after deploy

**Smoke** is a tiny production check, not the unit suite. After apply, curl /health and /ready through Ingress. Bound the time (`--max-time 15`). If it fails, save the body and `kubectl describe`. Do not wrap smoke in a loop that hides flakes.

## See the idea first

From `gold-pasal`:

```bash
curl --fail --show-error --max-time 15 -s -o /dev/null -w '%{http_code}\n' http://gold-pasal.local/ready
```

```text
200
```

If this fails, the digest is not ready. That is a failed deploy, not a reason to rerun unit tests.

## Smoke script

Add `scripts/smoke-kind.sh`:

```bash
set -euo pipefail
base="${GOLD_PASAL_SMOKE_BASE:-http://gold-pasal.local}"
curl --fail --show-error --max-time 15 "$base/health"
curl --fail --show-error --max-time 15 "$base/ready"
code=$(curl -s -o /tmp/sku.json -w '%{http_code}' "$base/api/catalog/GP-DOES-NOT-EXIST")
test "$code" = 404
```

Run it after every apply. Commit the script. CI on GitHub cannot see `gold-pasal.local`; smoke stays on the machine that can reach kind, unless you add a self-hosted runner later (out of scope).

A failed smoke is evidence. Paste it in the PR that rolled the digest back.

## If it fails

| What you see | Cause | Fix |
| --- | --- | --- |
| curl 000 | Ingress or hosts file | R8 Ingress page; /etc/hosts |
| /ready 503 | Postgres or URL in the digest | describe pod; check Secret |

## Practice

<LessonQuiz
  question="Why not retry smoke until it passes?"
  a="curl cannot retry"
  b="Retries hide an unstable release"
  c="GitHub forbids retries"
  d="kind deletes failed Pods"
  correct="b"
>

A flaky /ready is a product bug. Looping until 200 ships it.

</LessonQuiz>

Next: [Roll back by digest](06-roll-back-by-digest).

<EvidenceCard
  command="./scripts/smoke-kind.sh"
  artifact="smoke script plus one passing transcript"
  invariant="Apply is not done until smoke says so."
/>

---
title: "R2: Design a trustworthy domain core"
description: "Value objects, property tests, Protocols, fakes, and logging around one pricing seam."
---

# R2: Design a trustworthy domain core

**What you'll have:** the design and testing techniques that keep a pricing module honest as it grows: value objects that cannot hold a bad value, a test suite with structure, property-based tests that hunt for counterexamples, swappable policies behind a Protocol, a repository port with an in-memory fake, and a log line for every priced quote.

<LessonMission
  role="pricing policy owner"
  problem="A rounding tweak that fixes Maya's 22K total can quietly drop 18K gold value below 14K. A festival stall wants a flat making fee. The tray knows RING-01 is 5.00 g but quote() still wants grams typed by hand. The CLI prints a number in every case."
  destination="gold_pasal.pricing.quote still prints Maya's NPR 231080.15, and around it: Money, Weight, and Purity types; tests/unit with conftest and markers; Hypothesis invariants; a MakingChargePolicy; a CatalogRepository fake; one INFO log per quote."
/>

## Before you start

You finished [R1](/releases/r1/): `uv run gold-pasal quote ...` prints Maya's five lines, `src/gold_pasal/pricing.py` exposes `quote()`, and `tests/test_quote.py` and `tests/test_cli.py` are green. Prove it from `gold-pasal`:

```bash
uv run gold-pasal quote --rate-per-tola 200000 --weight-grams 11.6638038 --karat 22 --wastage-percent 2 --making-charge-per-gram 1500 | tail -1
uv run pytest -q | tail -1
```

```text
Total: NPR 231080.15
14 passed in 0.20s
```

Every page here keeps `./scripts/verify.sh` green; the refactor page is the only one that changes existing tests.

## Guide

| Page | You will be able to |
| --- | --- |
| [Value objects: Money, Weight, Purity](01-value-objects-money-weight-purity) | write a frozen type with arithmetic, ordering, and validation |
| [Refactor pricing with a safety net](02-refactor-pricing-with-a-safety-net) | move `quote()` onto the new types without changing its answers |
| [Organize tests: conftest and markers](03-organize-tests-conftest-and-markers) | lay out `tests/unit`, share fixtures, register markers |
| [Property-based tests with Hypothesis](04-property-based-tests-with-hypothesis) | state an invariant and let Hypothesis search for a counterexample |
| [Protocols and the strategy pattern](05-protocols-and-the-strategy-pattern) | swap the making-charge rule without editing `gold_value` |
| [Repositories and test doubles](06-repositories-and-test-doubles) | price a SKU through a port, with a fake and, once, a mock |
| [Logging and auditable decisions](07-logging-and-auditable-decisions) | log one line per quote and assert it with `caplog` |
| [Release gate: pricing invariants](08-release-gate-pricing-invariants) | show sorted gold across karats and a rejected 19K from the CLI |

## Release evidence

From `gold-pasal`:

```bash
uv run pytest tests/unit -q
uv run gold-pasal quote --rate-per-tola 200000 --weight-grams 5.00 --karat 19 --wastage-percent 2 --making-charge-per-gram 1500
```

R3 puts this domain behind HTTP. The `CatalogRepository` Protocol from this release is what the API's routes ask for.

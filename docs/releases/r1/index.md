---
title: "R1: Intermediate and advanced Python"
description: "Packages, exceptions, classes, types, generators, and pytest, ending in the gold-pasal quote CLI."
---

# R1: Intermediate and advanced Python

**What you'll have:** the Python that turns a script into a package other code can trust: modules and imports, exceptions, classes and dataclasses, type hints checked by pyright, generators and files, and pytest. The release ends with `uv run gold-pasal quote`, a typed CLI that prints Maya's itemized NPR quote from the [pricing contract](/reference/pricing-contract).

<LessonMission
  role="counter salesperson"
  problem="Maya asks why an 11.6638038 g, 22K ornament totals NPR 231080.15. counter.py can print numbers, but nothing in gold_pasal can be imported, a 16K stamp only prints a message, and Sita cannot run a quote without editing a script."
  destination="uv run gold-pasal quote prints Gold value, Wastage, Making charge, VAT, and Total; bad input exits non-zero; ./scripts/verify.sh is green with the quote tests."
/>

## Before you start

You finished [R0](/releases/r0/): `gold-pasal` exists, `counter.py` prints three tray lines, and `tests/test_counter.py` has three green tests. Prove it from `gold-pasal`:

```bash
uv run pytest -q
```

```text
....                                                                     [100%]
4 passed in 0.02s
```

If that is not green, finish the [R0 gate](/releases/r0/07-release-gate-counter-script) first.

Each page here is a topic with self-contained examples. The last page assembles them into `src/gold_pasal/pricing.py` and `src/gold_pasal/cli.py`.

## Guide

| Page | You will be able to |
| --- | --- |
| [Modules, packages, and imports](01-modules-packages-and-imports) | import from the standard library and from `gold_pasal`, add `units.py` |
| [Exceptions and error handling](02-exceptions-and-error-handling) | read a traceback, `try`/`except`, `raise`, define `PricingError` |
| [Classes, dataclasses, and enums](03-classes-dataclasses-and-enums) | model an ornament with a frozen dataclass and a `Karat` enum |
| [Type hints, Protocols, and pyright](04-type-hints-protocols-and-pyright) | annotate functions, read a pyright error, write a `Protocol` |
| [Generators, files, and decorators](05-generators-files-and-decorators) | `yield` tola readings, read a tray CSV, wrap a function |
| [Test with pytest](06-test-with-pytest) | write, parametrize, and run tests; check that bad input raises |
| [Release gate: the quote CLI](07-release-gate-the-quote-cli) | ship `gold-pasal quote` and pass the shop's verify command |

## Release evidence

From `gold-pasal`:

```bash
uv run gold-pasal quote --rate-per-tola 200000 --weight-grams 11.6638038 --karat 22 --wastage-percent 2 --making-charge-per-gram 1500
./scripts/verify.sh
```

R2 keeps `gold_pasal.pricing.quote` as its public seam and adds value objects, a making-charge Protocol, and an in-memory catalog fake.

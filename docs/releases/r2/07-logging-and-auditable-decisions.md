---
id: r2-07
title: "Logging and auditable decisions"
release: r2
order: 7
prerequisites: [r2-06]
outcomes:
  - Use the logging module with a per-module logger and lazy formatting
  - Configure output once, at the CLI edge, with basicConfig and a --verbose flag
  - Assert a log line in pytest with caplog
evidence: [commit, ci-run]
---

<LessonMission
  role="pricing policy owner"
  problem="A customer disputes a quote from Tuesday. The CLI printed five lines to a terminal that is long gone. Nobody can say which rate, weight, and purity produced that total."
  destination="Every priced quote emits one INFO log line with its inputs and total. Library code never prints. The CLI turns logging on with -v, and a test proves the line exists."
/>

# Logging and auditable decisions

`print` writes to whoever is watching the terminal. **Logging** writes a record with a level, a source, and a time, to wherever the program's edge decides: the terminal today, a file or a log collector in R6. Library code such as `pricing.py` logs; it never prints. This page adds the first audit line to the shop.

## See the idea first

From `gold-pasal`, `uv run python`:

```python
>>> import logging
>>> logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s: %(message)s")
>>> log = logging.getLogger("gold_pasal.counter")
>>> log.info("rate board updated to %s", 200000)
INFO gold_pasal.counter: rate board updated to 200000
>>> log.debug("not shown at INFO")
>>> log.warning("rate board is %s minutes old", 45)
WARNING gold_pasal.counter: rate board is 45 minutes old
```

`basicConfig` sets up output once. `getLogger(name)` gives you a named logger. Each call has a **level**; messages below the configured level are dropped before formatting.

## Loggers, levels, handlers

### One logger per module

At the top of any module that logs:

```python
import logging

logger = logging.getLogger(__name__)
```

`__name__` is `gold_pasal.pricing` inside `pricing.py`, so every line from that file is tagged with its source. Loggers form a tree by dotted name: configuring `gold_pasal` configures `gold_pasal.pricing` and `gold_pasal.catalog` too.

```python
>>> logging.getLogger("gold_pasal.pricing").parent.name
'root'
```

Until you configure a `gold_pasal` logger, the parent is `root`, which `basicConfig` set up.

### Levels

| Level | Use it for |
| --- | --- |
| `DEBUG` | values a developer wants while chasing a bug |
| `INFO` | one line per business decision: a quote priced, an item added |
| `WARNING` | something odd that did not stop the work: a stale rate |
| `ERROR` | an operation failed; include the exception |
| `CRITICAL` | the process cannot continue |

A library module decides the level of each message. The edge (CLI, server) decides which levels are shown. `pricing.py` has no opinion about whether anyone is reading.

### Lazy formatting

```python
logger.info("quote priced total=%s", result.total)     # right
logger.info(f"quote priced total={result.total}")       # avoid
```

With `%s` and arguments, the string is only built if the level is enabled. With an f-string, `str(result.total)` runs every time, even when INFO is off. `ruff`'s `G004` rule flags the f-string form when enabled; the shop's rule set does not yet, so this is a habit to keep by hand.

### Exceptions

Inside an `except`, `logger.exception("...")` logs at ERROR and attaches the traceback:

```python
try:
    catalog.get(sku)
except UnknownSkuError:
    logger.exception("lookup failed sku=%s", sku)
    raise
```

Log, then re-raise, or handle. Do not log and swallow: an error that is only in a log file is an error nobody acts on.

## Log the pricing decision

In `src/gold_pasal/pricing.py`, add the logger at the top and one line at the end of `price`:

```python
import logging

logger = logging.getLogger(__name__)

...

def price(...) -> QuoteResult:
    ...
    result = QuoteResult(
        gold_value=gold, wastage=wastage, making_charge=making, vat=vat, total=subtotal + vat
    )
    logger.info(
        "quote priced weight=%s purity=%s rate=%s total=%s",
        weight,
        purity,
        rate_per_tola,
        result.total,
    )
    return result
```

`weight`, `purity`, `rate_per_tola`, and `result.total` all have `__str__` methods from the [value objects page](01-value-objects-money-weight-purity), so the line reads `weight=5.00 g purity=22K rate=NPR 200000.00 total=NPR 99058.66`. The domain types made the log line readable for free.

`key=value` pairs, one decision per line. R6 swaps the formatter for JSON without changing this call.

### What not to log

Not the customer's name or phone. Not a token. Not the full request body. A quote log needs the inputs that produced the number and the number. If a field would embarrass the shop in a leaked log file, it does not belong in the message.

## Configure at the edge

`pricing.py` emits. `cli.py` decides what is shown. Add a `--verbose` flag and a `basicConfig` call in `main`:

```python
import logging

...

def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(prog="gold-pasal")
    parser.add_argument("-v", "--verbose", action="store_true", help="log pricing decisions")
    subcommands = parser.add_subparsers(dest="command", required=True)
    ...


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    logging.basicConfig(
        level=logging.INFO if args.verbose else logging.WARNING,
        format="%(levelname)s %(name)s: %(message)s",
        stream=sys.stderr,
    )
    ...
```

`stream=sys.stderr` keeps log lines out of stdout, so a receipt piped to a file stays a receipt. The `-v` flag goes before the subcommand:

```bash
uv run gold-pasal -v quote --rate-per-tola 200000 --weight-grams 5.00 --karat 24 --wastage-percent 2 --making-charge-per-gram 1500
```

```text
INFO gold_pasal.pricing: quote priced weight=5.00 g purity=24K rate=NPR 200000.00 total=NPR 107293.53
Gold value: NPR 85735.32
Wastage: NPR 1714.71
Making charge: NPR 7500.00
VAT: NPR 12343.50
Total: NPR 107293.53
```

Without `-v`, only the five receipt lines print. `tests/test_cli.py` still passes because it reads stdout, and the log went to stderr.

::: tip basicConfig belongs to the process, not the library
Call `basicConfig` once, in `main`. Never in `pricing.py`, `domain.py`, or a test. A library that configures logging overrides the choices of the program that imported it. R3's server will configure it differently from the CLI, and both import the same `pricing`.
:::

## Assert the log in a test

pytest's `caplog` fixture captures log records. Create `tests/unit/pricing/test_logging.py`:

```python
import logging
from decimal import Decimal

import pytest

from gold_pasal.pricing import quote


def test_pricing_logs_one_decision_line(caplog: pytest.LogCaptureFixture) -> None:
    with caplog.at_level(logging.INFO, logger="gold_pasal.pricing"):
        quote(
            rate_per_tola=Decimal("200000"),
            weight_grams=Decimal("5.00"),
            karat=22,
            wastage_percent=Decimal("2"),
            making_charge_per_gram=Decimal("1500"),
        )

    assert len(caplog.records) == 1
    assert "purity=22K" in caplog.text
    assert "total=NPR" in caplog.text
```

```bash
uv run pytest tests/unit/pricing/test_logging.py -q
```

```text
.                                                                        [100%]
1 passed in 0.02s
```

`caplog.at_level` enables INFO for that logger inside the block, whatever the process default is. `caplog.records` is the list of `LogRecord` objects; `caplog.text` is the formatted output. One quote, one record: if a refactor ever adds a second log line per quote or drops the line, this test says so.

Assert the facts (`purity=22K`), not the whole string. Formatting changes; the fact that the purity was logged should not.

## What logging is not

It is not a replacement for a return value: `quote` still returns the `QuoteResult`, and the CLI prints it. It is not a database: R5 adds an append-only audit table for staff actions with identity and time, because a log file can be rotated away and a legal record cannot. The INFO line is the first, cheap step: enough to answer "what inputs produced this total" the same day.

## If it fails

| What you see | Cause | Fix |
| --- | --- | --- |
| No log line appears | Level too high, or `basicConfig` never ran | `-v` on the CLI; `caplog.at_level(logging.INFO, ...)` in tests |
| Log lines mixed into the receipt | Logging to stdout | `stream=sys.stderr` in `basicConfig` |
| `basicConfig` seems ignored | It was already called once (it only acts the first time) | Configure once, in `main`; never in library code |
| `caplog.records` is empty | Wrong logger name | It must be `gold_pasal.pricing`, the module's `__name__` |
| ruff `G004` (if enabled) | f-string in a log call | Use `%s` with arguments |

## Practice

<LessonQuiz
  question="pricing.py wants its INFO lines to show up when someone runs the CLI. Where does logging.basicConfig belong?"
  a="At the top of pricing.py"
  b="In cli.main, once, before quote is called"
  c="In domain.py so Money can log itself"
  d="In every test file"
  correct="b"
>

Configuration is the program's decision. `pricing.py` is a library that any program imports, so it emits with `logger.info` and stays silent about handlers and levels. `main` chooses; tests use `caplog`.

</LessonQuiz>

Next: [Release gate: pricing invariants](08-release-gate-pricing-invariants).

<EvidenceCard
  command="uv run gold-pasal -v quote --rate-per-tola 200000 --weight-grams 5.00 --karat 24 --wastage-percent 2 --making-charge-per-gram 1500"
  artifact="one INFO line per quote from gold_pasal.pricing; --verbose flag; caplog test"
  invariant="Every priced quote leaves a record of its inputs and total; library code never prints"
/>

---
id: r1-07
title: "Release gate: the quote CLI"
release: r1
order: 7
prerequisites: [r1-06]
outcomes:
  - Implement gold_pasal.pricing.quote from a red tests/test_quote.py
  - Register the gold-pasal console script and print the five contract lines
  - Exit non-zero on bad input and pass ./scripts/verify.sh
evidence: [commit, ci-run, demo]
---

<LessonMission
  role="counter salesperson"
  problem="Maya asks why an 11.6638038 g, 22K ornament totals NPR 231080.15. Sita needs one command that prints the answer, refuses a 16K stamp or a zero weight, and gives the same numbers as the hand check every time."
  destination="uv run gold-pasal quote prints Gold value, Wastage, Making charge, VAT, and Total; bad input exits 2 with a message on stderr; ./scripts/verify.sh is green."
/>

# Release gate: the quote CLI

This page assembles the release. Every piece was covered on an earlier page: a module with functions, custom exceptions, frozen dataclasses, type hints, `argparse`, and pytest. You will write four files in this order: the failing test, the pricing module, the CLI, and the CLI test.

The formula is the [pricing contract](/reference/pricing-contract). The destination:

```bash
uv run gold-pasal quote --rate-per-tola 200000 --weight-grams 11.6638038 --karat 22 --wastage-percent 2 --making-charge-per-gram 1500
```

```text
Gold value: NPR 183333.33
Wastage: NPR 3666.67
Making charge: NPR 17495.71
VAT: NPR 26584.44
Total: NPR 231080.15
```

## See the idea first

Hand-check Maya's quote before writing code. Rate NPR 200,000 per tola, `11.6638038` g (one tola), 22K, 2% wastage, NPR 1500 per gram making, 13% VAT:

```text
purity   = 22 / 24                          = 0.91666…
tola     = 11.6638038 / 11.6638038          = 1
gold     = 200000 × 1 × 0.91666…            = 183333.333…   → 183333.33
wastage  = gold × 2 / 100                   = 3666.666…     → 3666.67
making   = 11.6638038 × 1500                = 17495.7057    → 17495.71
subtotal = gold + wastage + making          = 204495.7057…
vat      = subtotal × 0.13                  = 26584.4417…   → 26584.44
total    = subtotal + vat                   = 231080.1474…  → 231080.15
```

The arrows are display rounding, half up, applied to a copy. `183333.33 + 3666.67 + 17495.71 + 26584.44` is `231080.15` here by luck; the contract says compute `total` from the unrounded parts, and one of the later test rows would catch a summed-lines implementation.

## Step 1: the failing test

Create `tests/test_quote.py`:

```python
from decimal import Decimal

import pytest

from gold_pasal.errors import PricingError
from gold_pasal.pricing import QuoteResult, display, quote


def maya_quote(*, weight_grams: Decimal = Decimal("11.6638038"), karat: int = 22) -> QuoteResult:
    """Maya's contract inputs, with the two fields tests like to vary."""
    return quote(
        rate_per_tola=Decimal("200000"),
        weight_grams=weight_grams,
        karat=karat,
        wastage_percent=Decimal("2"),
        making_charge_per_gram=Decimal("1500"),
    )


def test_maya_one_tola_22k_matches_the_contract() -> None:
    result = maya_quote()

    assert display(result.gold_value) == Decimal("183333.33")
    assert display(result.wastage) == Decimal("3666.67")
    assert display(result.making_charge) == Decimal("17495.71")
    assert display(result.vat) == Decimal("26584.44")
    assert display(result.total) == Decimal("231080.15")


def test_half_weight_halves_gold_value() -> None:
    result = maya_quote(weight_grams=Decimal("5.8319019"))

    assert display(result.gold_value) == Decimal("91666.67")


@pytest.mark.parametrize("bad_weight", [Decimal("0"), Decimal("-1")])
def test_non_positive_weight_is_rejected(bad_weight: Decimal) -> None:
    with pytest.raises(PricingError, match="weight_grams"):
        maya_quote(weight_grams=bad_weight)


def test_unsupported_karat_is_rejected() -> None:
    with pytest.raises(PricingError, match="karat"):
        maya_quote(karat=19)
```

`maya_quote` is a plain helper, not a fixture, because two tests need to override one field. `quote` takes keyword-only arguments so nobody can swap the rate and the weight.

Run it:

```bash
uv run pytest tests/test_quote.py -q
```

```text
ModuleNotFoundError: No module named 'gold_pasal.pricing'
```

That is the intended red. If you see a `SyntaxError` instead, fix the test file first.

## Step 2: the pricing module

You already have `src/gold_pasal/units.py` and `src/gold_pasal/errors.py` from earlier pages. If not, they are listed on [Modules](01-modules-packages-and-imports) and [Exceptions](02-exceptions-and-error-handling).

Create `src/gold_pasal/pricing.py`:

```python
"""The R1 pricing contract: one quote, five labelled NPR lines."""

from dataclasses import dataclass
from decimal import ROUND_HALF_UP, Decimal

from gold_pasal.errors import NonPositiveAmountError, UnsupportedKaratError
from gold_pasal.units import grams_to_tola

SUPPORTED_KARATS = (14, 18, 22, 24)
VAT_RATE = Decimal("0.13")
PAISA = Decimal("0.01")


@dataclass(frozen=True)
class QuoteInput:
    rate_per_tola: Decimal
    weight_grams: Decimal
    karat: int
    wastage_percent: Decimal
    making_charge_per_gram: Decimal

    def __post_init__(self) -> None:
        if self.karat not in SUPPORTED_KARATS:
            raise UnsupportedKaratError(self.karat)
        for field in ("rate_per_tola", "weight_grams", "making_charge_per_gram"):
            if getattr(self, field) <= 0:
                raise NonPositiveAmountError(field, getattr(self, field))
        if self.wastage_percent < 0:
            raise NonPositiveAmountError("wastage_percent", self.wastage_percent)


@dataclass(frozen=True)
class QuoteResult:
    gold_value: Decimal
    wastage: Decimal
    making_charge: Decimal
    vat: Decimal
    total: Decimal

    def lines(self) -> list[str]:
        """The five labelled lines the CLI prints, rounded for display."""
        return [
            f"Gold value: NPR {display(self.gold_value)}",
            f"Wastage: NPR {display(self.wastage)}",
            f"Making charge: NPR {display(self.making_charge)}",
            f"VAT: NPR {display(self.vat)}",
            f"Total: NPR {display(self.total)}",
        ]


def display(amount: Decimal) -> Decimal:
    """Round a copy for the receipt. Never feed the result back into arithmetic."""
    return amount.quantize(PAISA, rounding=ROUND_HALF_UP)


def purity_factor(karat: int) -> Decimal:
    return Decimal(karat) / Decimal(24)


def gold_value(rate_per_tola: Decimal, weight_grams: Decimal, karat: int) -> Decimal:
    return rate_per_tola * grams_to_tola(weight_grams) * purity_factor(karat)


def wastage_charge(gold: Decimal, wastage_percent: Decimal) -> Decimal:
    return gold * (wastage_percent / Decimal(100))


def making_charge(weight_grams: Decimal, charge_per_gram: Decimal) -> Decimal:
    return weight_grams * charge_per_gram


def vat_on(subtotal: Decimal) -> Decimal:
    return subtotal * VAT_RATE


def quote(
    *,
    rate_per_tola: Decimal,
    weight_grams: Decimal,
    karat: int,
    wastage_percent: Decimal,
    making_charge_per_gram: Decimal,
) -> QuoteResult:
    """Price one ornament. Raises PricingError on bad input."""
    inputs = QuoteInput(
        rate_per_tola=rate_per_tola,
        weight_grams=weight_grams,
        karat=karat,
        wastage_percent=wastage_percent,
        making_charge_per_gram=making_charge_per_gram,
    )
    gold = gold_value(inputs.rate_per_tola, inputs.weight_grams, inputs.karat)
    wastage = wastage_charge(gold, inputs.wastage_percent)
    making = making_charge(inputs.weight_grams, inputs.making_charge_per_gram)
    subtotal = gold + wastage + making
    vat = vat_on(subtotal)
    return QuoteResult(
        gold_value=gold,
        wastage=wastage,
        making_charge=making,
        vat=vat,
        total=subtotal + vat,
    )
```

How the pieces from earlier pages show up:

- `QuoteInput.__post_init__` validates once, when the input is built. `quote` never sees a zero weight or a 19K stamp.
- Each rule is a small function with a name and type hints, so a test can pin one of them, and R2 can swap `making_charge` for a policy object.
- `display` is the only place rounding happens, and it returns a new Decimal. Every field on `QuoteResult` keeps full precision.
- `QuoteResult.lines()` owns the labels. The CLI prints them; it does not format money.

```bash
uv run pytest tests/test_quote.py -q
```

```text
.....                                                                    [100%]
5 passed in 0.02s
```

## Step 3: the CLI

`argparse` (standard library) turns `--karat 22` into `args.karat`. Create `src/gold_pasal/cli.py`:

```python
"""`gold-pasal` command-line entry point."""

import argparse
import sys
from decimal import Decimal, InvalidOperation

from gold_pasal.errors import PricingError
from gold_pasal.pricing import quote


def decimal_arg(text: str) -> Decimal:
    try:
        return Decimal(text)
    except InvalidOperation:
        raise argparse.ArgumentTypeError(f"not a number: {text!r}") from None


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(prog="gold-pasal")
    subcommands = parser.add_subparsers(dest="command", required=True)

    quote_parser = subcommands.add_parser("quote", help="price one ornament in NPR")
    quote_parser.add_argument(
        "--rate-per-tola", type=decimal_arg, required=True, help="NPR per tola of 24K gold"
    )
    quote_parser.add_argument(
        "--weight-grams", type=decimal_arg, required=True, help="scale reading in grams"
    )
    quote_parser.add_argument("--karat", type=int, required=True, help="14, 18, 22, or 24")
    quote_parser.add_argument(
        "--wastage-percent", type=decimal_arg, required=True, help="percent of gold value"
    )
    quote_parser.add_argument(
        "--making-charge-per-gram", type=decimal_arg, required=True, help="NPR per gram"
    )
    return parser


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    try:
        result = quote(
            rate_per_tola=args.rate_per_tola,
            weight_grams=args.weight_grams,
            karat=args.karat,
            wastage_percent=args.wastage_percent,
            making_charge_per_gram=args.making_charge_per_gram,
        )
    except PricingError as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 2
    for line in result.lines():
        print(line)
    return 0


if __name__ == "__main__":
    sys.exit(main())
```

Read `main` top to bottom. `parse_args` converts each option with the `type` function you gave it, so `args.weight_grams` is already a `Decimal` and `"22K"` for `--karat` is rejected by argparse with exit code 2 before `quote` runs. `quote` raises `PricingError` for a valid number that breaks a business rule; `main` prints the message to **stderr** (the error stream, so it never mixes with a receipt piped to a file) and returns `2`. On success, the five lines go to stdout and `main` returns `0`.

`main(argv=None)` lets a test call `main(["quote", ...])` directly, while `sys.exit(main())` at the bottom makes `python -m gold_pasal.cli` behave like the installed command.

Register the command. In `pyproject.toml`, under `[project]`, add:

```toml
[project.scripts]
gold-pasal = "gold_pasal.cli:main"
```

The value is `module:function`. Then sync so the environment picks up the new entry point:

```bash
uv sync --all-groups
```

This rewrites `uv.lock` because `pyproject.toml` changed. That is expected here; commit both files together.

Run Maya's command:

```bash
uv run gold-pasal quote --rate-per-tola 200000 --weight-grams 11.6638038 --karat 22 --wastage-percent 2 --making-charge-per-gram 1500
```

```text
Gold value: NPR 183333.33
Wastage: NPR 3666.67
Making charge: NPR 17495.71
VAT: NPR 26584.44
Total: NPR 231080.15
```

Then the two failure paths:

```bash
uv run gold-pasal quote --rate-per-tola 200000 --weight-grams 0 --karat 22 --wastage-percent 2 --making-charge-per-gram 1500
echo "exit $?"
```

```text
error: weight_grams must be greater than 0; got 0
exit 2
```

```bash
uv run gold-pasal quote --rate-per-tola 200000 --weight-grams 5.00 --karat 19 --wastage-percent 2 --making-charge-per-gram 1500
```

```text
error: karat must be one of 14, 18, 22, 24; got 19
```

`$?` is the exit status of the last command. `0` is success; anything else is failure. Scripts and CI read that number, not the text.

`uv run gold-pasal quote --help` lists the five options with their units.

## Step 4: the CLI test

A test that runs the command as a real subprocess proves the entry point, the argument parsing, and the exit codes together. Create `tests/test_cli.py`:

```python
import subprocess
import sys

MAYA_ARGS = [
    "quote",
    "--rate-per-tola",
    "200000",
    "--weight-grams",
    "11.6638038",
    "--karat",
    "22",
    "--wastage-percent",
    "2",
    "--making-charge-per-gram",
    "1500",
]


def run_cli(*args: str) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        [sys.executable, "-m", "gold_pasal.cli", *args],
        capture_output=True,
        text=True,
        check=False,
    )


def test_maya_command_prints_five_labelled_lines() -> None:
    result = run_cli(*MAYA_ARGS)

    assert result.returncode == 0, result.stderr
    assert result.stdout.splitlines() == [
        "Gold value: NPR 183333.33",
        "Wastage: NPR 3666.67",
        "Making charge: NPR 17495.71",
        "VAT: NPR 26584.44",
        "Total: NPR 231080.15",
    ]


def test_zero_weight_exits_non_zero_without_a_total() -> None:
    result = run_cli(*MAYA_ARGS[:4], "0", *MAYA_ARGS[5:])

    assert result.returncode == 2
    assert "weight_grams" in result.stderr
    assert "Total" not in result.stdout
```

`sys.executable -m gold_pasal.cli` runs the module with the same Python pytest is using, so the test does not depend on the `gold-pasal` script being on `PATH`. `MAYA_ARGS[:4], "0", MAYA_ARGS[5:]` swaps only the weight value.

## Step 5: the gate

```bash
./scripts/verify.sh
```

You should see `All checks passed!` from ruff, `0 errors` from pyright, and every test green (the smoke test, three counter tests, the units table, five quote tests, two CLI tests). If `ruff format --check` lists a file, run `uv run ruff format .` and rerun.

Now delete `counter.py` from the shop root. Everything it did lives in the package, with tests. Keep `tests/test_counter.py`; it still guards the three hand checks.

## Walk Maya's quote through the code

`main` parses five strings into four Decimals and an int. `quote` builds `QuoteInput`, whose `__post_init__` finds `22` in `SUPPORTED_KARATS` and every amount positive. `gold_value` gives `200000 × 1 × 22/24`. `wastage_charge` takes two percent of that. `making_charge` is `11.6638038 × 1500`. The three sum to the subtotal; `vat_on` takes thirteen percent; `QuoteResult` stores all five at full precision. `lines()` rounds each one for the receipt, and `main` prints them and returns `0`.

## If it fails

| What you see | Cause | Fix |
| --- | --- | --- |
| `error: unrecognized arguments` or `No such command 'gold-pasal'` | `[project.scripts]` missing, or you did not sync | Add the table; `uv sync --all-groups` |
| `Total: NPR 231080.14` | Summed rounded lines, or quantized inside a helper | Total from unrounded parts; round only in `display` |
| `Gold value: NPR 200000.00` | Purity skipped | `purity_factor(karat)` in `gold_value` |
| `Making charge: NPR 17495.70` | Rounded the grams before multiplying | Multiply full-precision Decimals |
| Zero weight prints a Total | `PricingError` not caught in `main`, or validation missing | `__post_init__` raises; `main` catches and returns `2` |
| A traceback reaches the salesperson | Exception escaped `main` | Only `PricingError` is expected; anything else is a bug to fix, not to catch |
| pyright `reportMissingParameterType` in `cli.py` | Unannotated helper | Annotate every parameter and return |
| `uv.lock` changed | You added `[project.scripts]` | Expected; commit it with `pyproject.toml` |

## Practice

<LessonQuiz
  question="Displayed Total NPR 231080.15 comes from which rule?"
  a="Add the four rounded display lines"
  b="Compute subtotal and VAT at full precision, add them, then round the total once"
  c="Gold value times 1.13"
  d="Making charge times 13"
  correct="b"
>

`display` runs once per line, on a copy, at the end. The total is `subtotal + vat` with every digit intact. Adding the printed lines gives the same number for Maya's inputs and a different number for others; the contract forbids it.

</LessonQuiz>

R2 starts by asserting, through this same `quote` function, that gold value never falls as karat rises.

<EvidenceCard
  command="uv run gold-pasal quote --rate-per-tola 200000 --weight-grams 11.6638038 --karat 22 --wastage-percent 2 --making-charge-per-gram 1500 && ./scripts/verify.sh"
  artifact="src/gold_pasal/pricing.py, src/gold_pasal/cli.py, tests/test_quote.py, tests/test_cli.py, project.scripts entry"
  invariant="The same explicit inputs always produce the same five labelled lines; bad input exits 2 without a Total"
/>

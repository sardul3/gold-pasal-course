---
id: r0-07
title: "Release gate: counter script"
release: r0
order: 7
prerequisites: [r0-06]
outcomes:
  - Run counter.py and read three tray lines
  - Put making_charge and gold_value under pytest in tests/test_counter.py
  - Run ./scripts/verify.sh green with the new test
evidence: [commit, demo]
---

<LessonMission
  role="new backend developer"
  problem="counter.py prints the right numbers today. Nobody can tell whether it still will after the next edit, and a REPL session disappears when the terminal closes."
  destination="counter.py runs clean, tests/test_counter.py asserts three hand-checkable amounts, and ./scripts/verify.sh is green."
/>

# Release gate: counter script

This page is a checklist. You already wrote the code; here you prove it. No new Python topics.

## See the idea first

1. From `gold-pasal`, run the script one more time:

```bash
uv run python counter.py
```

```text
RING-01: gold NPR 78590.71, making NPR 7500.00
CHAIN-02: gold NPR 183333.33, making NPR 17495.71
BANGLE-09: stop, 16K is not a supported karat
```

If your output differs, fix `counter.py` against the listing at the end of [Functions](06-functions) before you continue.

2. Create `tests/test_counter.py`:

```python
from decimal import ROUND_HALF_UP, Decimal

GRAMS_PER_TOLA = Decimal("11.6638038")


def making_charge(grams: Decimal, charge_per_gram: Decimal) -> Decimal:
    return grams * charge_per_gram


def gold_value(rate_per_tola: Decimal, grams: Decimal, karat: int) -> Decimal:
    tola = grams / GRAMS_PER_TOLA
    purity = Decimal(karat) / Decimal(24)
    return rate_per_tola * tola * purity


def display(amount: Decimal) -> Decimal:
    return amount.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def test_five_grams_at_1500_npr_per_gram_is_7500() -> None:
    assert making_charge(Decimal("5.00"), Decimal("1500")) == Decimal("7500.00")


def test_one_tola_of_22k_at_200000_displays_183333_33() -> None:
    gold = gold_value(Decimal("200000"), Decimal("11.6638038"), 22)

    assert display(gold) == Decimal("183333.33")


def test_half_a_tola_halves_the_gold_value() -> None:
    full = gold_value(Decimal("200000"), Decimal("11.6638038"), 22)
    half = gold_value(Decimal("200000"), Decimal("5.8319019"), 22)

    assert display(half) == display(full / 2)
```

The functions live inside the test file for now. R1 moves them into the `gold_pasal` package and imports them; until then the test file is the only place they can be imported from.

3. Run the tests:

```bash
uv run pytest tests/test_counter.py -q
```

```text
...                                                                      [100%]
3 passed in 0.01s
```

Each `.` is one passing test. Times vary.

`assert` is the check: if the expression is false, pytest reports the test as failed and shows both sides. `gold_value` takes `rate_per_tola` as a parameter here instead of reading a module constant, so a test can pass a different rate later.

## Run the full verify command

4. The shop's one quality gate:

```bash
./scripts/verify.sh
```

It runs four tools: `ruff check` (lint), `ruff format --check` (formatting), `pyright` (types on `src/` and `tests/`), and `pytest` with coverage. You should see `All checks passed!`, `0 errors`, and `4 passed` (the smoke test plus your three).

If `ruff format --check` complains about `counter.py` or the test file, let it fix the layout:

```bash
uv run ruff format .
```

Then rerun `./scripts/verify.sh`.

## Walk the three assertions

- `5.00 × 1500 = 7500.00`. `Decimal("7500.00")` and `Decimal("7500")` compare equal; the two-decimal form reads like a price.
- One tola of 22K at NPR 200,000: `200000 × 1 × 22 / 24 = 183333.333…`, displayed `183333.33`.
- Half the grams gives half the gold value, because tola is linear in grams and purity does not change. The test compares two displayed values rather than hard-coding `91666.67`, so it keeps working if the rate changes.

## If it fails

| What you see | Cause | Fix |
| --- | --- | --- |
| `No such file or directory: tests/test_counter.py` | File saved in the wrong folder | It belongs in `gold-pasal/tests/` |
| `AssertionError: assert Decimal('1505.00') == Decimal('7500.00')` | Wrong operator in `making_charge` | Multiply, do not add |
| `Would reformat: counter.py` | Formatting differs from `ruff format` | `uv run ruff format .` |
| pyright `reportMissingParameterType` | A parameter without a hint in `tests/` | Add `: Decimal` or `: int` to every parameter |
| `verify.sh: Permission denied` | Script not executable | `chmod +x scripts/verify.sh` |
| `1 passed` only | You ran `tests/test_setup.py` | Pass `tests/test_counter.py`, or run the whole `tests/` folder |

## Practice

<LessonQuiz
  question="Which command is the R0 release gate?"
  a="uv run python counter.py"
  b="./scripts/verify.sh"
  c="uv run gold-pasal quote --karat 22"
  d="git push"
  correct="b"
>

`counter.py` is the demo; `verify.sh` is the gate, because it runs lint, format, types, and every test together. The quote CLI does not exist until the end of R1. Git is not part of this page.

</LessonQuiz>

R1 starts by moving `GRAMS_PER_TOLA` and the tola conversion into their own module inside `src/gold_pasal`, so that `counter.py`, the tests, and later the CLI import one copy.

<EvidenceCard
  command="./scripts/verify.sh"
  artifact="counter.py output plus tests/test_counter.py with three green assertions"
  invariant="Pricing rules are functions a test can call, and the shop's verify command passes"
/>

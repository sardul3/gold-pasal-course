---
id: r1-01
title: "Modules, packages, and imports"
release: r1
order: 1
prerequisites: []
outcomes:
  - Import names from the standard library in the three common forms
  - Add src/gold_pasal/units.py and import it from a test and a script
  - Explain what src/gold_pasal/__init__.py does and why uv run finds the package
evidence: [commit, ci-run]
---

<LessonMission
  role="new backend developer"
  problem="GRAMS_PER_TOLA is typed in counter.py and again in tests/test_counter.py. When the two drift, the receipt and the test disagree and nobody notices."
  destination="One copy of the tola conversion lives in src/gold_pasal/units.py, and counter.py, the tests, and later the CLI all import it."
/>

# Modules, packages, and imports

A **module** is one `.py` file. A **package** is a folder of modules with an `__init__.py`. `import` loads a module and gives you a name to reach into it. The shop already is a package, `gold_pasal`, and this page puts your first module in it.

## See the idea first

From `gold-pasal`, `uv run python`:

```python
>>> import gold_pasal
>>> gold_pasal.__version__
'0.1.0'
>>> gold_pasal.__name__
'gold_pasal'
```

That works because `src/gold_pasal/__init__.py` exists and `uv sync` installed the shop into the project environment. Everything you write under `src/gold_pasal/` becomes importable the same way.

## The three import forms

```python
>>> import math
>>> math.floor(2.7)
2
>>> from decimal import Decimal, ROUND_HALF_UP
>>> Decimal("5.00")
Decimal('5.00')
>>> import datetime as dt
>>> dt.date(2026, 9, 21).isoformat()
'2026-09-21'
```

| Form | You then write | Use when |
| --- | --- | --- |
| `import math` | `math.floor(...)` | you use a few names and want the module visible at each call |
| `from decimal import Decimal` | `Decimal(...)` | you use one name everywhere |
| `import datetime as dt` | `dt.date(...)` | the module name is long or clashes with yours |

Avoid `from module import *`. It dumps unknown names into your file and hides where each one came from.

Imports go at the top of the file, in three groups separated by a blank line: standard library, third-party packages, then your own package. `ruff` (the shop's linter) sorts them for you.

## Standard library tour

Python ships with modules for most counter chores. You have met `decimal`. A few more the shop uses:

```python
>>> from collections import Counter
>>> Counter([22, 22, 18, 24, 22])
Counter({22: 3, 18: 1, 24: 1})
>>> Counter([22, 22, 18, 24, 22]).most_common(1)
[(22, 3)]
```

`Counter` tallies how many of each karat sit on the tray.

```python
>>> from collections import defaultdict
>>> by_karat = defaultdict(list)
>>> by_karat[22].append("RING-01")
>>> by_karat[22].append("CHAIN-02")
>>> dict(by_karat)
{22: ['RING-01', 'CHAIN-02']}
```

`defaultdict(list)` creates an empty list the first time a key is touched, so grouping needs no "if key not in" check.

```python
>>> from pathlib import Path
>>> Path("src") / "gold_pasal" / "pricing.py"
PosixPath('src/gold_pasal/pricing.py')
>>> Path("src/gold_pasal/pricing.py").suffix
'.py'
```

`Path` joins folders with `/` and knows about names, suffixes, and whether a file exists. The [files page](05-generators-files-and-decorators) uses it to read a tray CSV.

```python
>>> import statistics
>>> statistics.mean([Decimal("5.00"), Decimal("3.20")])
Decimal('4.1')
>>> dt.date(2026, 9, 21).strftime("%d %b %Y")
'21 Sep 2026'
```

Others you will meet in this release: `json` (files page), `argparse` and `sys` (the CLI), `enum` and `dataclasses` (classes page), `typing` (type hints page). Reach for the standard library before adding a dependency.

## Write your own module

1. Create `src/gold_pasal/units.py`:

```python
"""Weight units used on the Nepal gold-rate board."""

from decimal import Decimal

GRAMS_PER_TOLA = Decimal("11.6638038")


def grams_to_tola(grams: Decimal) -> Decimal:
    """Convert a scale reading in grams to tola."""
    return grams / GRAMS_PER_TOLA


def tola_to_grams(tola: Decimal) -> Decimal:
    """Convert tola back to grams."""
    return tola * GRAMS_PER_TOLA
```

The first string in a module is its docstring, the same idea as a function docstring.

2. Import it in a fresh REPL:

```python
>>> from gold_pasal import units
>>> units.GRAMS_PER_TOLA
Decimal('11.6638038')
>>> units.__name__
'gold_pasal.units'
>>> from gold_pasal.units import grams_to_tola as to_tola
>>> to_tola(Decimal("5.8319019"))
Decimal('0.5')
```

The dotted name `gold_pasal.units` is package then module. Nothing else changed: the file is in the right folder, so `import` finds it.

3. Use it from `counter.py`. Replace the local constant with the import:

```python
from decimal import ROUND_HALF_UP, Decimal

from gold_pasal.units import grams_to_tola

SUPPORTED_KARATS = {14, 18, 22, 24}
RATE_PER_TOLA = Decimal("200000")
MAKING_CHARGE_PER_GRAM = Decimal("1500")

tray = [
    ("RING-01", Decimal("5.00"), 22),
    ("CHAIN-02", Decimal("11.6638038"), 22),
    ("BANGLE-09", Decimal("8.40"), 16),
]


def gold_value(grams: Decimal, karat: int) -> Decimal:
    purity = Decimal(karat) / Decimal(24)
    return RATE_PER_TOLA * grams_to_tola(grams) * purity


def making_charge(grams: Decimal, charge_per_gram: Decimal) -> Decimal:
    return grams * charge_per_gram


def display(amount: Decimal) -> Decimal:
    return amount.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


for sku, grams, karat in tray:
    if karat not in SUPPORTED_KARATS:
        print(f"{sku}: stop, {karat}K is not a supported karat")
        continue
    gold = gold_value(grams, karat)
    making = making_charge(grams, MAKING_CHARGE_PER_GRAM)
    print(f"{sku}: gold NPR {display(gold)}, making NPR {display(making)}")
```

```bash
uv run python counter.py
```

The three lines are unchanged. Do the same in `tests/test_counter.py`: delete its `GRAMS_PER_TOLA` line and add `from gold_pasal.units import grams_to_tola`, then use `grams_to_tola(grams)` inside `gold_value`. Run `uv run pytest tests/test_counter.py -q` and you should still see `3 passed`.

## Packages and `__init__.py`

Open `src/gold_pasal/__init__.py`:

```python
"""Gold Pasal application package."""

__version__ = "0.1.0"
```

That file makes the folder a package. Code in it runs when the package is first imported, which is why `gold_pasal.__version__` exists. Keep `__init__.py` small: a docstring, the version, and at most a few re-exports. Real code goes in named modules such as `units.py`.

### The src layout

```text
gold-pasal/
├── pyproject.toml
├── counter.py
├── src/
│   └── gold_pasal/
│       ├── __init__.py
│       └── units.py
└── tests/
    ├── test_counter.py
    └── test_setup.py
```

Putting the package under `src/` means Python can only import `gold_pasal` through the installed environment, never by accident from the current folder. `pyproject.toml` tells the build which folder is the package (`packages = ["src/gold_pasal"]`), and `uv sync` installs it in editable mode, so edits to `units.py` are visible immediately without reinstalling.

`counter.py` sits at the root because it is a scratch script, not part of the package. Tests live in `tests/` and import the package the same way any user would.

## Run a module as a script

`__name__` is the module's dotted name when it is imported, and the string `"__main__"` when you run the file directly. The idiom:

```python
if __name__ == "__main__":
    print(grams_to_tola(Decimal("11.6638038")))
```

Append that to `units.py`, then:

```bash
uv run python -m gold_pasal.units
```

```text
1
```

`-m` runs a module by its dotted name inside the package. Importing `units` from a test does not trigger the block, because then `__name__` is `"gold_pasal.units"`. The CLI page uses this idiom so `python -m gold_pasal.cli` and the installed `gold-pasal` command share one `main`.

## How Python finds a module

`import` searches, in order: the folder of the script you ran, the installed packages in the environment, and the standard library. `uv run` makes sure the environment is the shop's `.venv`.

```python
>>> import gold_pasal.pricing
Traceback (most recent call last):
  ...
ModuleNotFoundError: No module named 'gold_pasal.pricing'
```

That is the correct error today: `pricing.py` does not exist until the release gate. When you see `ModuleNotFoundError` for a module you did write, check the file is under `src/gold_pasal/`, the name matches exactly, and you ran the command through `uv run`.

::: warning Circular imports
If `pricing.py` imports `cli.py` and `cli.py` imports `pricing.py`, one of them will see a half-loaded module and fail with `ImportError: cannot import name`. Keep dependencies one-way: `cli` imports `pricing`, `pricing` imports `units`, and nothing imports upward.
:::

## If it fails

| What you see | Cause | Fix |
| --- | --- | --- |
| `ModuleNotFoundError: No module named 'gold_pasal'` | Ran plain `python`, or never synced | `uv run python`; `uv sync --frozen --all-groups` |
| `ModuleNotFoundError: No module named 'gold_pasal.units'` | File not at `src/gold_pasal/units.py` | Check the path and the `.py` suffix |
| `ImportError: cannot import name 'grams_to_tola'` | Name misspelled, or defined below the import site in a circular pair | Match the `def` name; keep imports one-way |
| `ruff` reports `I001` unsorted imports | Import groups out of order | `uv run ruff check --fix .` |
| `NameError: name 'Decimal' is not defined` inside `units.py` | Module has its own imports | Every module imports what it uses |

## Practice

<LessonQuiz
  question="You run uv run python -m gold_pasal.units. Inside units.py, what is __name__?"
  a="'gold_pasal.units'"
  b="'units'"
  c="'__main__'"
  d="'gold_pasal'"
  correct="c"
>

Running a file directly, with `-m` or by path, sets `__name__` to `'__main__'`. Only when another module imports it does `__name__` become `'gold_pasal.units'`.

</LessonQuiz>

Next: [Exceptions and error handling](02-exceptions-and-error-handling), where a 16K stamp becomes a named error instead of a printed message.

<EvidenceCard
  command="uv run python -m gold_pasal.units && uv run pytest tests/test_counter.py -q"
  artifact="src/gold_pasal/units.py imported by counter.py and tests/test_counter.py"
  invariant="GRAMS_PER_TOLA exists in exactly one module"
/>

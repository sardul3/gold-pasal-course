---
id: r2-03
title: "Organize tests: conftest and markers"
release: r2
order: 3
prerequisites: [r2-02]
outcomes:
  - Lay out tests/unit by module and share fixtures from tests/conftest.py
  - Register a marker in pyproject.toml so --strict-markers accepts it
  - Select tests by folder, name, marker, and speed
evidence: [commit, ci-run]
---

<LessonMission
  role="pricing policy owner"
  problem="tests/ is a flat pile of files. Every new test rebuilds Maya's ring by hand. verify.sh runs pytest -m 'not integration', and nobody has told pytest what integration means."
  destination="tests/unit mirrors src/gold_pasal, a conftest provides the shared ring and catalog, the integration marker is registered, and you can run exactly the slice you need."
/>

# Organize tests: conftest and markers

A test suite is code too. This page gives `tests/` a layout that matches the package, a place for shared fixtures, and registered markers so the shop's verify command means what it says.

## See the idea first

From `gold-pasal`:

```bash
uv run pytest --collect-only -q
```

```text
tests/test_cli.py::test_maya_command_prints_five_labelled_lines
tests/test_cli.py::test_zero_weight_exits_non_zero_without_a_total
tests/test_counter.py::test_five_grams_at_1500_npr_per_gram_is_7500
...
tests/unit/domain/test_weight_and_purity.py::test_purities_order_by_karat
20 tests collected in 0.05s
```

`--collect-only` lists every test pytest would run without running it. Use it whenever you move files around: if a test disappears from this list, pytest cannot see it.

## A layout that mirrors the package

```text
tests/
├── conftest.py              shared fixtures for every test below
├── test_setup.py            smoke test from the starter
├── test_counter.py          R0 hand checks
├── test_quote.py            R1 contract tests on quote()
├── test_cli.py              subprocess tests of the command
└── unit/
    ├── domain/              one file per domain type
    ├── pricing/             rules, policies, invariants
    └── catalog/             repository and fake
```

`tests/unit/<module>` mirrors `src/gold_pasal/<module>`. When `catalog.py` changes, the tests to read are in `tests/unit/catalog/`. R3 adds `tests/http/`; R4 adds `tests/inventory/` with tests that need a database, which is where the marker comes in.

pytest does not need `__init__.py` files in these folders. Keep test file names unique across folders, though: two `test_quote.py` files in different folders confuse pytest's default import mode.

## conftest.py

A `conftest.py` is a file pytest imports automatically. Fixtures defined in it are available to every test in that folder and below, with no import statement. Create `tests/conftest.py`:

```python
from decimal import Decimal

import pytest

from gold_pasal.pricing import QuoteResult, quote

MAYA_RATE = Decimal("200000")
MAYA_GRAMS = Decimal("11.6638038")


@pytest.fixture
def maya_result() -> QuoteResult:
    """Maya's contract quote, priced once per test that asks for it."""
    return quote(
        rate_per_tola=MAYA_RATE,
        weight_grams=MAYA_GRAMS,
        karat=22,
        wastage_percent=Decimal("2"),
        making_charge_per_gram=Decimal("1500"),
    )
```

Any test under `tests/` can now take `maya_result: QuoteResult` as a parameter. Try it in `tests/unit/pricing/test_lines.py`:

```python
from gold_pasal.pricing import QuoteResult


def test_lines_start_with_the_five_contract_labels(maya_result: QuoteResult) -> None:
    labels = [line.split(":")[0] for line in maya_result.lines()]

    assert labels == ["Gold value", "Wastage", "Making charge", "VAT", "Total"]
```

The [repositories page](06-repositories-and-test-doubles) adds `maya_ring` and `catalog` fixtures to the same file, and shows a fixture that depends on another fixture by naming it as a parameter.

### Fixture scope

By default a fixture runs once per test. `scope="module"` or `scope="session"` runs it once per file or once per run:

```python
@pytest.fixture(scope="session")
def contract_rate() -> Decimal:
    return Decimal("200000")
```

Use wider scope only for values that are expensive to build and never mutated. A shared `InMemoryCatalog` that one test adds to would leak into the next test; keep mutable fixtures at function scope.

### Where a fixture belongs

| Used by | Put it in |
| --- | --- |
| one test | inline in the test, or a plain helper function like `maya_quote()` |
| one file | that file |
| one folder | `tests/<folder>/conftest.py` |
| the whole suite | `tests/conftest.py` |

Do not move a fixture up until a second file needs it.

## Markers

A **marker** tags a test. `pytest.mark.parametrize` is one you already use. Custom markers let you select or skip groups. The shop's `verify.sh` runs:

```bash
uv run pytest -m "not integration" --cov=gold_pasal --cov-report=term-missing
```

`-m "not integration"` means "everything without the `integration` marker". `pyproject.toml` also sets `--strict-markers`, which turns an unregistered marker into an error rather than a typo that silently runs. Try it. Create `tests/test_marker_demo.py`:

```python
import pytest


@pytest.mark.slow
def test_marked() -> None:
    assert True
```

```bash
uv run pytest tests/test_marker_demo.py -q
```

```text
ERROR tests/test_marker_demo.py - Failed: 'slow' not found in `markers` configuration option
1 error in 0.12s
```

Register the markers the shop uses in `pyproject.toml`:

```toml
[tool.pytest.ini_options]
addopts = "-ra --strict-markers"
testpaths = ["tests"]
markers = [
  "integration: needs a real service such as PostgreSQL",
]
```

Delete `test_marker_demo.py`. Nothing in the suite is marked `integration` yet; R4's Testcontainers tests will be, and `verify.sh` will keep skipping them on a laptop without Docker while CI runs them. Registering the marker now means the verify command is honest today.

Apply a marker to a whole file with a module-level variable:

```python
pytestmark = pytest.mark.integration
```

## Select what to run

| Command | Runs |
| --- | --- |
| `uv run pytest tests/unit -q` | one folder |
| `uv run pytest tests/unit/domain/test_money.py -q` | one file |
| `uv run pytest -k "rounded or refuses" -q` | names matching either word |
| `uv run pytest -m integration` | only marked tests |
| `uv run pytest -m "not integration"` | everything else (what `verify.sh` does) |
| `uv run pytest --lf` | last failures only |
| `uv run pytest -x --durations=3` | stop at first failure; report the three slowest |

```bash
uv run pytest tests/unit -q --durations=3
```

```text
============================= slowest 3 durations ==============================
0.01s call     tests/unit/domain/test_money.py::test_money_adds_and_scales_at_full_precision
...
```

`--durations` is how you notice when a "unit" test has started talking to a disk or a network. The next page adds tests that take a tenth of a second on purpose; this flag shows them.

## Naming and shape

The shop's convention is a sentence about behavior in the test name, and arrange / act / assert separated by blank lines:

```python
def test_half_weight_halves_gold_value() -> None:
    result = maya_quote(weight_grams=Decimal("5.8319019"))

    assert result.gold_value.rounded() == Money.npr("91666.67")
```

Older files use `test_given_x_when_y_then_z`. Both are fine; be consistent within a file. A test whose name is `test_quote_2` fails you at 2 a.m.

## If it fails

| What you see | Cause | Fix |
| --- | --- | --- |
| `'slow' not found in markers configuration option` | Unregistered marker under `--strict-markers` | Add it to `markers` in `pyproject.toml`, or remove the mark |
| `fixture 'catalog' not found` | Fixture not in scope, or `conftest.py` in the wrong folder | Move it to `tests/conftest.py` |
| `import file mismatch` | Two test files with the same name in different folders | Rename one |
| `collected 0 items` | Folder not under `testpaths`, or file not `test_*.py` | Put it under `tests/`; rename |
| A test passes alone and fails in the suite | Shared mutable fixture | Function scope; build a fresh object per test |

## Practice

<LessonQuiz
  question="verify.sh runs pytest -m 'not integration' with --strict-markers on. You add @pytest.mark.integration to a test without editing pyproject.toml. What happens?"
  a="The test is skipped as intended"
  b="pytest errors during collection because the marker is not registered"
  c="The test runs, because unknown markers are ignored"
  d="Only a warning is printed"
  correct="b"
>

`--strict-markers` turns unknown markers into collection errors. Register `integration` under `[tool.pytest.ini_options] markers` and the `-m` filter works as intended.

</LessonQuiz>

Next: [Property-based tests with Hypothesis](04-property-based-tests-with-hypothesis).

<EvidenceCard
  command="uv run pytest --collect-only -q"
  artifact="tests/unit mirroring src, tests/conftest.py, integration marker registered"
  invariant="verify.sh's -m 'not integration' names a marker pytest knows about"
/>

---
id: r1-06
title: "Test with pytest"
release: r1
order: 6
prerequisites: [r1-05]
outcomes:
  - Write test functions pytest discovers and read its assertion output
  - Check that bad input raises with pytest.raises and drive many cases with parametrize
  - Share setup with fixtures and run a subset with -k
evidence: [commit, ci-run]
---

<LessonMission
  role="new backend developer"
  problem="tests/test_counter.py has three asserts you wrote by copying a hand check. The quote formula has five lines, two failure modes, and a half-weight case, and you need to prove all of them before the CLI exists."
  destination="You can write a failing test first, read exactly why it failed, and cover happy paths, error paths, and a table of cases in one file."
/>

# Test with pytest

**pytest** is the test runner this shop uses. You have already run it. This page is how it finds tests, what it prints when one fails, and the four features (`raises`, `parametrize`, fixtures, `-k`) that cover most test files you will write.

## See the idea first

From `gold-pasal`, run the tests you already have, verbosely:

```bash
uv run pytest tests/test_counter.py -v
```

```text
tests/test_counter.py::test_five_grams_at_1500_npr_per_gram_is_7500 PASSED [ 33%]
tests/test_counter.py::test_one_tola_of_22k_at_200000_displays_183333_33 PASSED [ 66%]
tests/test_counter.py::test_half_a_tola_halves_the_gold_value PASSED     [100%]

============================== 3 passed in 0.01s ===============================
```

Each line is `file::function` and a verdict. `-v` names them; `-q` (quiet) prints one dot each.

## How pytest finds tests

Configuration lives in `pyproject.toml`:

```toml
[tool.pytest.ini_options]
addopts = "-ra --strict-markers"
testpaths = ["tests"]
```

pytest looks under `tests/`, opens every `test_*.py` file, and collects every function whose name starts with `test_`. Nothing else is special: no base class, no registration. `-ra` prints a short summary of anything that did not pass.

See what would run without running it:

```bash
uv run pytest --collect-only -q
```

Name each test as a sentence about behavior: `test_half_a_tola_halves_the_gold_value`. When it fails at 2 a.m., the name is the first thing you read.

## assert

A test passes if it reaches the end without an exception. `assert expr` raises `AssertionError` when `expr` is false, and pytest rewrites the statement so the failure shows every value involved.

Break `making_charge` on purpose in `tests/test_counter.py` (`grams + charge_per_gram`) and run:

```bash
uv run pytest tests/test_counter.py -q
```

```text
F..                                                                      [100%]
=================================== FAILURES ===================================
_________________ test_five_grams_at_1500_npr_per_gram_is_7500 _________________

    def test_five_grams_at_1500_npr_per_gram_is_7500() -> None:
>       assert making_charge(Decimal("5.00"), Decimal("1500")) == Decimal("7500.00")
E       AssertionError: assert Decimal('1505.00') == Decimal('7500.00')
E        +  where Decimal('1505.00') = making_charge(Decimal('5.00'), Decimal('1500'))
E        +    where Decimal('5.00') = Decimal('5.00')
E        +    and   Decimal('1500') = Decimal('1500')
E        +  and   Decimal('7500.00') = Decimal('7500.00')

tests/test_counter.py:21: AssertionError
=========================== short test summary info ============================
FAILED tests/test_counter.py::test_five_grams_at_1500_npr_per_gram_is_7500
1 failed, 2 passed in 0.02s
```

The `>` marks the failing line. The `E` lines show what each side evaluated to. `1505.00` is `5 + 1500`; you can see the wrong operator without opening a debugger. Put the `*` back.

Plain `assert` is all you need. There is no `assertEqual` family to learn.

### Arrange, act, assert

Most tests read as three short blocks, separated by a blank line:

```python
def test_half_a_tola_halves_the_gold_value() -> None:
    full = gold_value(Decimal("200000"), Decimal("11.6638038"), 22)   # arrange + act
    half = gold_value(Decimal("200000"), Decimal("5.8319019"), 22)

    assert display(half) == display(full / 2)                          # assert
```

One behavior per test. Two asserts about the same result are fine; two unrelated behaviors belong in two tests, so a failure names the right one.

## pytest.raises

To assert that code raises, wrap it in `with pytest.raises(...)`:

```python
import pytest

from gold_pasal.errors import PricingError, UnsupportedKaratError


def test_karat_19_is_rejected() -> None:
    with pytest.raises(UnsupportedKaratError):
        raise UnsupportedKaratError(19)


def test_the_message_names_the_field() -> None:
    with pytest.raises(PricingError, match="karat"):
        raise UnsupportedKaratError(19)
```

The block passes if the named exception (or a subclass) is raised inside it. If nothing is raised, the test fails with `Failed: DID NOT RAISE`. `match` is a regular expression searched in the message; use it to pin the part of the message a user will read.

Try the failing case: change `raise UnsupportedKaratError(19)` to `pass` in the first test and run it. You should see `DID NOT RAISE`. Put it back.

## parametrize

One test function, many rows of inputs:

```python
@pytest.mark.parametrize(
    ("grams", "expected_tola"),
    [
        (Decimal("11.6638038"), Decimal("1")),
        (Decimal("5.8319019"), Decimal("0.5")),
        (Decimal("23.3276076"), Decimal("2")),
    ],
)
def test_grams_convert_to_tola(grams: Decimal, expected_tola: Decimal) -> None:
    assert grams_to_tola(grams) == expected_tola
```

pytest runs the function once per row and reports each as its own test:

```text
tests/test_units.py::test_grams_convert_to_tola[grams0-expected_tola0] PASSED
tests/test_units.py::test_grams_convert_to_tola[grams1-expected_tola1] PASSED
tests/test_units.py::test_grams_convert_to_tola[grams2-expected_tola2] PASSED
```

The parameter names in the decorator must match the function's parameter names exactly. Pass `ids=["one tola", "half", "two"]` to replace the `grams0` labels with readable ones. Add a `karat` row for each of `14, 18, 22, 24` when you want a table instead of four copied tests.

Save that as `tests/test_units.py` with `from gold_pasal.units import grams_to_tola` at the top. It is your first test of the package itself.

## Fixtures

A **fixture** is a function that builds something several tests need. Declare it with `@pytest.fixture`; request it by naming a parameter after it:

```python
from dataclasses import dataclass


@dataclass(frozen=True)
class Ornament:
    sku: str
    grams: Decimal
    karat: int


@pytest.fixture
def maya_ornament() -> Ornament:
    return Ornament("CHAIN-02", Decimal("11.6638038"), 22)


def test_maya_is_one_tola(maya_ornament: Ornament) -> None:
    assert grams_to_tola(maya_ornament.grams) == Decimal("1")
```

pytest sees the parameter `maya_ornament`, finds the fixture with that name, calls it, and passes the result in. Each test gets a fresh one. Fixtures used by more than one file go in `tests/conftest.py`, where every test file can request them without importing.

### Built-in fixtures

| Fixture | Gives you |
| --- | --- |
| `tmp_path` | a fresh temporary `Path` per test, for file code |
| `capsys` | `capsys.readouterr()` with captured stdout and stderr |
| `monkeypatch` | `monkeypatch.setenv(...)`, `monkeypatch.setattr(...)`, undone after the test |

```python
def test_read_tray_yields_ornaments(tmp_path: Path) -> None:
    tray_file = tmp_path / "tray.csv"
    tray_file.write_text("sku,grams,karat\nRING-01,5.00,22\n")

    items = list(read_tray(tray_file))

    assert items == [Ornament("RING-01", Decimal("5.00"), 22)]
```

`tmp_path` means the test never touches the shop folder and never depends on a file another test left behind.

## Run a subset

| Command | Runs |
| --- | --- |
| `uv run pytest -q` | everything under `tests/` |
| `uv run pytest tests/test_units.py -q` | one file |
| `uv run pytest -k tola -q` | tests whose name contains `tola` |
| `uv run pytest -x` | stop at the first failure |
| `uv run pytest --lf` | only the tests that failed last time |
| `uv run pytest --cov=gold_pasal --cov-report=term-missing` | with a coverage report (what `verify.sh` runs) |

`-k` and `-x` together make the edit-run loop fast while you are fixing one thing.

## Test first

Write the test before the code it tests. Run it. It must fail, and it must fail for the right reason: an `ImportError` because the module does not exist yet, or an `AssertionError` with the wrong number. A `SyntaxError` in the test is not a useful red.

Then write the smallest code that makes it pass. Then run everything.

That is the loop the release gate uses. `tests/test_quote.py` is written before `src/gold_pasal/pricing.py`, and its first run ends in `ModuleNotFoundError: No module named 'gold_pasal.pricing'`. That error is the proof that the test is testing something.

::: tip What to test
Test the public seam: the function a CLI or another module will import. Do not test that `Decimal` multiplies. Do test the numbers the business cares about (Maya's `231080.15`), the boundaries (half weight, zero weight), and the errors (karat 19). One hand-checkable value per test beats ten asserts about internals.
:::

## If it fails

| What you see | Cause | Fix |
| --- | --- | --- |
| `collected 0 items` | File or function not named `test_*` | Rename |
| `fixture 'karat' not found` | Parametrize names do not match the function's parameters | Same names in both places |
| `Failed: DID NOT RAISE` | The block ran without the exception | The code under test is not rejecting the input |
| `ModuleNotFoundError` in a test | Module missing or not under `src/gold_pasal/` | Expected before you write it; otherwise check the path |
| `PytestUnknownMarkWarning` turned into an error | Typo in a mark name; `--strict-markers` is on | Use `pytest.mark.parametrize`, spelled exactly |
| pyright complains about a test parameter | Test functions in `tests/` are strict-checked too | Annotate fixture and parametrize parameters |

## Practice

<LessonQuiz
  question="A test contains: with pytest.raises(ValueError): parse_karat('22'). parse_karat('22') returns 22 without raising. What does pytest report?"
  a="PASSED, because 22 is a valid karat"
  b="FAILED with DID NOT RAISE"
  c="ERROR, because raises needs a match argument"
  d="SKIPPED"
  correct="b"
>

`pytest.raises` asserts that the block raises. A block that returns normally fails the assertion, and pytest names the problem `DID NOT RAISE <class 'ValueError'>`.

</LessonQuiz>

Next: [Release gate: the quote CLI](07-release-gate-the-quote-cli), which starts with a red `tests/test_quote.py`.

<EvidenceCard
  command="uv run pytest -q"
  artifact="tests/test_units.py with a parametrized tola table and a tmp_path file test"
  invariant="Every behavior the CLI will expose has a test that fails when the behavior is wrong"
/>

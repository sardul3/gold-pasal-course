---
id: r1-02
title: "Exceptions and error handling"
release: r1
order: 2
prerequisites: [r1-01]
outcomes:
  - Read a traceback from the bottom up
  - Catch specific exceptions with try, except, else, and finally
  - Raise ValueError and define PricingError subclasses in src/gold_pasal/errors.py
evidence: [commit, ci-run]
---

<LessonMission
  role="counter salesperson"
  problem="A karat typed as 22K crashes the script with a wall of text. A 16K stamp only prints a message and the loop keeps going. Neither is a behavior a CLI or an API can rely on."
  destination="Bad input raises a named PricingError with a message that says which field is wrong, and the caller decides what to do with it."
/>

# Exceptions and error handling

An **exception** is Python's signal that something went wrong at this line and the normal flow cannot continue. You have already seen several: `NameError`, `KeyError`, `TypeError`, `ValueError`. This page is how to read them, catch the ones you expect, and raise your own.

## See the idea first

From `gold-pasal`, `uv run python`:

```python
>>> int("22K")
Traceback (most recent call last):
  File "<stdin>", line 1, in <module>
ValueError: invalid literal for int() with base 10: '22K'
```

The last line is the exception type and its message. Everything above is the **traceback**: the chain of calls that led to it. Now catch it:

```python
>>> try:
...     karat = int("22K")
... except ValueError:
...     print("karat must be a whole number")
...
karat must be a whole number
```

The `try` block ran until the line that failed. Python jumped to the matching `except` and continued after it. No traceback, no crash.

## Read a traceback

Save this as `tb.py` at the shop root and run it with `uv run python tb.py`:

```python
from decimal import Decimal

GRAMS_PER_TOLA = Decimal("11.6638038")


def to_tola(grams):
    return grams / GRAMS_PER_TOLA


print(to_tola(5.00))
```

```text
Traceback (most recent call last):
  File "/.../gold-pasal/tb.py", line 10, in <module>
    print(to_tola(5.00))
          ^^^^^^^^^^^^^
  File "/.../gold-pasal/tb.py", line 7, in to_tola
    return grams / GRAMS_PER_TOLA
           ~~~~~~^~~~~~~~~~~~~~~~
TypeError: unsupported operand type(s) for /: 'float' and 'decimal.Decimal'
```

Read it bottom up:

1. The last line names the problem: a `float` divided by a `Decimal`.
2. The frame above it says where: line 7, inside `to_tola`. The carets mark the operator.
3. The frame above that says who called it: line 10 at module level, with `5.00` as a float literal.

The fix is at the call site (`Decimal("5.00")`), not in the function. Most tracebacks are read this way: find the line that raised, then walk up until you reach code you control. Delete `tb.py` when you are done.

## try and except

```python
def parse_karat(text: str) -> int:
    try:
        karat = int(text)
    except ValueError:
        print(f"karat must be a whole number, got {text!r}")
        return 0
    return karat
```

Catch the **specific** exception you expect. `except Exception` would also swallow a typo that raises `NameError`, and you would never see it.

### Keep the exception object

`as` binds the exception so you can read its message or attributes:

```python
>>> try:
...     {"RING-01": 1}["CHAIN-02"]
... except KeyError as exc:
...     print("missing SKU:", exc)
...
missing SKU: 'CHAIN-02'
```

### Several except clauses

```python
try:
    grams = Decimal(text)
    tola = grams / GRAMS_PER_TOLA
except InvalidOperation:
    ...   # text was not a number
except ZeroDivisionError:
    ...   # cannot happen here, shown for the shape
```

Python runs the first clause whose type matches. `except (ValueError, TypeError):` catches either with one clause.

`Decimal("22K")` raises `decimal.InvalidOperation`, not `ValueError`. Check the docs or try it in the REPL when you are unsure which exception a library raises.

### else and finally

```python
>>> def parse_karat(text):
...     try:
...         karat = int(text)
...     except ValueError:
...         print("rejected:", text)
...     else:
...         print("parsed:", karat)
...     finally:
...         print("done with", text)
...
>>> parse_karat("22")
parsed: 22
done with 22
>>> parse_karat("22K")
rejected: 22K
done with 22K
```

`else` runs only when the `try` block raised nothing. `finally` runs no matter what, even if the function returns or raises inside `try`. Use `finally` for cleanup (closing a file, releasing a lock). The [files page](05-generators-files-and-decorators) shows `with`, which does that cleanup for you.

## raise

`raise` creates an exception on purpose. Give it a message that names the field and the bad value:

```python
>>> SUPPORTED_KARATS = (14, 18, 22, 24)
>>> def check_karat(karat: int) -> int:
...     if karat not in SUPPORTED_KARATS:
...         raise ValueError(f"karat must be one of 14, 18, 22, 24; got {karat}")
...     return karat
...
>>> check_karat(22)
22
>>> check_karat(19)
Traceback (most recent call last):
  ...
ValueError: karat must be one of 14, 18, 22, 24; got 19
```

Raise early, at the top of the function, before any arithmetic. A function that returns `0` or `None` for bad input pushes the problem to whoever reads the receipt. A function that raises stops it here.

::: tip Raise or return?
Raise when the caller has made a mistake or the input is impossible (zero grams, karat 19). Return a value when the outcome is a normal result of the business (a lookup that legitimately finds nothing). "Maya's ornament weighs nothing" is not a normal result.
:::

### Re-raise and chain

Inside an `except`, a bare `raise` rethrows the same exception. `raise NewError(...) from exc` wraps it and keeps the original as `__cause__`:

```python
def parse_karat(text: str) -> int:
    try:
        return int(text)
    except ValueError as exc:
        raise ValueError(f"karat must be a whole number, got {text!r}") from exc
```

The traceback then shows both: your message, and below it "The above exception was the direct cause". `from None` hides the original when it would only be noise.

## Define your own exceptions

An exception is a class. Subclass an existing one so callers who catch the general type still catch yours.

1. Create `src/gold_pasal/errors.py`:

```python
"""Exceptions raised by Gold Pasal pricing."""


class PricingError(ValueError):
    """Base class for every bad quote input."""


class UnsupportedKaratError(PricingError):
    def __init__(self, karat: int) -> None:
        super().__init__(f"karat must be one of 14, 18, 22, 24; got {karat}")
        self.karat = karat


class NonPositiveAmountError(PricingError):
    def __init__(self, field: str, value: object) -> None:
        super().__init__(f"{field} must be greater than 0; got {value}")
        self.field = field
```

`class` and `__init__` are the subject of the [next page](03-classes-dataclasses-and-enums). For now: `PricingError` is a `ValueError` with a better name, and the two subclasses build their message from the bad value and remember it.

2. Try it:

```python
>>> from gold_pasal.errors import PricingError, UnsupportedKaratError
>>> try:
...     raise UnsupportedKaratError(19)
... except ValueError as exc:
...     print(type(exc).__name__, "|", exc, "|", exc.karat)
...
UnsupportedKaratError | karat must be one of 14, 18, 22, 24; got 19 | 19
```

Catching `ValueError` caught it, because of the inheritance chain:

```python
>>> UnsupportedKaratError.__mro__
(<class 'gold_pasal.errors.UnsupportedKaratError'>, <class 'gold_pasal.errors.PricingError'>, <class 'ValueError'>, <class 'Exception'>, <class 'BaseException'>, <class 'object'>)
```

The CLI will catch `PricingError` and print the message to stderr. R2's tests, which expect `ValueError`, still pass. Both are satisfied by one raise.

## assert is not error handling

`assert` is for tests and for conditions that can only be false if the program has a bug. Python skips `assert` entirely when run with `-O`. Never use it to validate user input:

```python
# wrong: disappears under -O, and the message does not name the field
assert karat in SUPPORTED_KARATS

# right
if karat not in SUPPORTED_KARATS:
    raise UnsupportedKaratError(karat)
```

## Update counter.py

Replace the printed "stop" message with an exception you catch at the loop:

```python
from decimal import ROUND_HALF_UP, Decimal

from gold_pasal.errors import PricingError, UnsupportedKaratError
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
    if karat not in SUPPORTED_KARATS:
        raise UnsupportedKaratError(karat)
    purity = Decimal(karat) / Decimal(24)
    return RATE_PER_TOLA * grams_to_tola(grams) * purity


def making_charge(grams: Decimal, charge_per_gram: Decimal) -> Decimal:
    return grams * charge_per_gram


def display(amount: Decimal) -> Decimal:
    return amount.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


for sku, grams, karat in tray:
    try:
        gold = gold_value(grams, karat)
    except PricingError as exc:
        print(f"{sku}: stop, {exc}")
        continue
    making = making_charge(grams, MAKING_CHARGE_PER_GRAM)
    print(f"{sku}: gold NPR {display(gold)}, making NPR {display(making)}")
```

```bash
uv run python counter.py
```

```text
RING-01: gold NPR 78590.71, making NPR 7500.00
CHAIN-02: gold NPR 183333.33, making NPR 17495.71
BANGLE-09: stop, karat must be one of 14, 18, 22, 24; got 16
```

The rule now lives inside `gold_value`, where every caller gets it. The loop only decides what to do about it. Those are two different jobs, and separating them is what lets the CLI exit non-zero while a report skips the row.

## If it fails

| What you see | Cause | Fix |
| --- | --- | --- |
| The `except` never runs | You caught a different type than was raised | Read the last traceback line; catch that type |
| `except ValueError` also hides a typo | Too broad for that block | Catch only around the line that can fail; keep the block small |
| `decimal.InvalidOperation` escapes | `Decimal("22K")` does not raise `ValueError` | `from decimal import InvalidOperation` and catch it |
| `TypeError: exceptions must derive from BaseException` | Raised a string or a non-exception | `raise ValueError("...")`, not `raise "..."` |
| `ModuleNotFoundError: gold_pasal.errors` | File not at `src/gold_pasal/errors.py` | Check the path |

## Practice

<LessonQuiz
  question="A caller writes except ValueError around code that raises UnsupportedKaratError(19). What happens?"
  a="The exception escapes, because the names differ"
  b="The except clause runs, because UnsupportedKaratError inherits from ValueError"
  c="Python raises TypeError about mismatched exception types"
  d="Nothing is raised; unsupported karat returns 0"
  correct="b"
>

`except` matches a raised exception if it is an instance of the named class or any subclass. `UnsupportedKaratError` is a `PricingError`, which is a `ValueError`.

</LessonQuiz>

Next: [Classes, dataclasses, and enums](03-classes-dataclasses-and-enums), which explains the `class` and `__init__` you just used.

<EvidenceCard
  command="uv run python counter.py"
  artifact="src/gold_pasal/errors.py with PricingError, UnsupportedKaratError, NonPositiveAmountError"
  invariant="Bad input raises a PricingError that names the field; callers choose how to handle it"
/>

---
id: r0-06
title: "Functions"
release: r0
order: 6
prerequisites: [r0-05]
outcomes:
  - Define a function with def, parameters, and a return value
  - Call it with positional, keyword, and default arguments
  - Read a docstring, a type hint, and a lambda used as a sort key
evidence: [commit]
---

<LessonMission
  role="counter salesperson"
  problem="The gold-value arithmetic is pasted inside the loop. Making charge and wastage are two more rules. Pasting all three into one loop body hides which number went wrong, and nothing outside the script can call them."
  destination="Each pricing rule is a named function that returns a Decimal, so counter.py calls it and, on the next page, a test calls it too."
/>

# Functions

A **function** is a named block of code that takes inputs, does work, and hands back a result. You have been calling functions since the first page: `print`, `len`, `sorted`. This page is how to write your own.

## See the idea first

From `gold-pasal`, `uv run python`:

```python
>>> from decimal import Decimal
>>> def making_charge(weight_grams, charge_per_gram):
...     return weight_grams * charge_per_gram
...
>>> making_charge(Decimal("5.00"), Decimal("1500"))
Decimal('7500.00')
```

`def` starts the definition. The names in parentheses are **parameters**. The indented body runs when you call the function. `return` hands the result back to the caller.

## Define and call

```python
def gold_value(rate_per_tola, grams, karat):
    tola = grams / Decimal("11.6638038")
    purity = Decimal(karat) / Decimal(24)
    return rate_per_tola * tola * purity
```

Calling it:

```python
>>> gold_value(Decimal("200000"), Decimal("11.6638038"), 22)
Decimal('183333.3333333333333333333333')
```

Walk that call in order. Python binds `rate_per_tola` to `200000`, `grams` to `11.6638038`, `karat` to `22`. `tola` is `1`. `purity` is `22 / 24`. The `return` line multiplies the three and hands back the Decimal. The names `tola` and `purity` exist only inside the call.

### Arguments and parameters

The values you pass are **arguments**; the names inside the function are **parameters**. They match by position unless you name them:

```python
>>> making_charge(Decimal("5.00"), Decimal("1500"))
Decimal('7500.00')
>>> making_charge(charge_per_gram=Decimal("1500"), weight_grams=Decimal("5.00"))
Decimal('7500.00')
```

Keyword arguments can go in any order and make a call with several Decimals readable. The shop's `quote(...)` function in R1 takes all five inputs by keyword for exactly this reason.

### return

A function stops at `return`. A function with no `return` returns `None`:

```python
>>> def announce(sku):
...     print(f"Now pricing {sku}")
...
>>> result = announce("RING-01")
Now pricing RING-01
>>> result is None
True
```

Do not `print` inside a pricing function when you want the number. Return it, and print at the call site. A function that returns is reusable by a test, a CLI, and later an API. A function that prints is only reusable by a terminal.

### Return more than one value

Return a tuple and unpack it:

```python
>>> def split_name(full):
...     first, *rest = full.split()
...     return first, " ".join(rest)
...
>>> split_name("Maya Shrestha")
('Maya', 'Shrestha')
>>> first, last = split_name("Maya Shrestha")
```

## Default values

A parameter with `=` has a default that applies when the caller omits it:

```python
>>> def making_charge(weight_grams, charge_per_gram=Decimal("1500")):
...     return weight_grams * charge_per_gram
...
>>> making_charge(Decimal("5.00"))
Decimal('7500.00')
>>> making_charge(Decimal("5.00"), Decimal("1200"))
Decimal('6000.00')
```

Parameters with defaults must come after the ones without.

::: warning Never use a list or dict as a default
`def add_tag(item, tags=[])` shares one list across every call. Use `tags=None` and create the list inside the function. R1's dataclass page shows the `field(default_factory=list)` version of the same idea.
:::

### Keyword-only parameters

A bare `*` in the parameter list means everything after it must be passed by name:

```python
def quote(*, rate_per_tola, weight_grams, karat):
    ...
```

`quote(Decimal("200000"), Decimal("5"), 22)` is now an error. `quote(rate_per_tola=..., weight_grams=..., karat=...)` is the only way in. With five Decimal inputs, that protects the caller from swapping the rate and the weight.

## Variable numbers of arguments

`*args` collects extra positional arguments into a tuple. `**kwargs` collects extra keyword arguments into a dict:

```python
>>> def total(*amounts):
...     return sum(amounts, Decimal("0"))
...
>>> total(Decimal("1"), Decimal("2.5"))
Decimal('3.5')
>>> def describe(**facts):
...     return ", ".join(f"{key}={value}" for key, value in facts.items())
...
>>> describe(sku="RING-01", karat=22)
'sku=RING-01, karat=22'
```

The same stars unpack on the calling side: `print(*tray)` passes each item as its own argument. You will use this less than the other forms; recognise it when you read library code.

## Scope

Names bound inside a function are **local**. They disappear when the function returns and do not clash with names outside:

```python
>>> def to_tola(grams):
...     tola = grams / Decimal("11.6638038")
...     return tola
...
>>> to_tola(Decimal("11.6638038"))
Decimal('1')
>>> tola
Traceback (most recent call last):
  ...
NameError: name 'tola' is not defined
```

A function can read module-level names such as `GRAMS_PER_TOLA`. It cannot rebind them without the `global` keyword, and this shop does not use `global`. Constants at the top of the file, everything else passed in as a parameter.

## Docstrings

A string as the first line of the body is the **docstring**. `help` shows it:

```python
>>> def making_charge(weight_grams, charge_per_gram):
...     """Grams times NPR per gram."""
...     return weight_grams * charge_per_gram
...
>>> making_charge.__doc__
'Grams times NPR per gram.'
```

One line that says what the function computes is enough. Write it for a function someone else will call; skip it for a three-line helper whose name already says everything.

## Type hints

A **type hint** records what kind of value each parameter and the return should be:

```python
def making_charge(weight_grams: Decimal, charge_per_gram: Decimal) -> Decimal:
    return weight_grams * charge_per_gram
```

Python does not check hints when it runs. A tool called **pyright** checks them before you run, and this shop runs pyright on `src/` and `tests/` in strict mode. From here on, write hints on every function that goes in a file. R1 has a [whole page on them](/releases/r1/04-type-hints-protocols-and-pyright).

## Functions are values

A function name without parentheses is the function itself. You can pass it to another function:

```python
>>> sorted(["Tilhari", "Ring", "Nathiya"], key=len)
['Ring', 'Tilhari', 'Nathiya']
>>> type(making_charge).__name__
'function'
```

`key=len` passes the `len` function; `sorted` calls it on every item.

### lambda

A **lambda** is a one-expression function without a name, handy as a sort key:

```python
>>> sorted(["Tilhari", "Ring", "Nathiya"], key=lambda name: len(name))
['Ring', 'Tilhari', 'Nathiya']
>>> rows = [("RING-01", Decimal("5.00")), ("CHAIN-02", Decimal("11.6638038"))]
>>> sorted(rows, key=lambda row: row[1], reverse=True)[0]
('CHAIN-02', Decimal('11.6638038'))
```

If the lambda needs a second line, or you want to test it on its own, give it a `def` and a name.

## Update counter.py

Move each rule into a function and call them from the loop:

```python
from decimal import ROUND_HALF_UP, Decimal

GRAMS_PER_TOLA = Decimal("11.6638038")
SUPPORTED_KARATS = {14, 18, 22, 24}
RATE_PER_TOLA = Decimal("200000")
MAKING_CHARGE_PER_GRAM = Decimal("1500")

tray = [
    ("RING-01", Decimal("5.00"), 22),
    ("CHAIN-02", Decimal("11.6638038"), 22),
    ("BANGLE-09", Decimal("8.40"), 16),
]


def gold_value(grams: Decimal, karat: int) -> Decimal:
    tola = grams / GRAMS_PER_TOLA
    purity = Decimal(karat) / Decimal(24)
    return RATE_PER_TOLA * tola * purity


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

```text
RING-01: gold NPR 78590.71, making NPR 7500.00
CHAIN-02: gold NPR 183333.33, making NPR 17495.71
BANGLE-09: stop, 16K is not a supported karat
```

Two blank lines between top-level functions is the formatting rule the shop's formatter (`ruff format`) enforces. Hand-check the ring's making line: `5.00 × 1500 = 7500.00`. Maya's: `11.6638038 × 1500 = 17495.7057`, displayed `17495.71`.

## If it fails

| What you see | Cause | Fix |
| --- | --- | --- |
| `IndentationError` after `def` | Body not indented | Indent every body line four spaces |
| `NameError: name 'making_charge' is not defined` | Called before the `def` ran, or a fresh REPL | Define first, then call |
| `TypeError: making_charge() missing 1 required positional argument` | Fewer arguments than parameters | Pass every parameter without a default |
| `TypeError: got an unexpected keyword argument` | Keyword spelled differently from the parameter | Match the parameter name exactly |
| Function prints but `result` is `None` | You printed instead of returning | `return` the value; print at the call site |
| `SyntaxError: non-default argument follows default argument` | A defaulted parameter before a required one | Put defaults last |

## Practice

<LessonQuiz
  question="def making_charge(weight_grams, charge_per_gram=Decimal('1500')): return weight_grams * charge_per_gram. What does making_charge(Decimal('2'), charge_per_gram=Decimal('1000')) return?"
  a="Decimal('3000')"
  b="Decimal('2000')"
  c="Decimal('1500')"
  d="A TypeError, because the default is overridden"
  correct="b"
>

The caller supplied `charge_per_gram`, so the default is ignored. `2 × 1000 = 2000`. Overriding a default is allowed; that is what defaults are for.

</LessonQuiz>

Next: [Release gate: counter script](07-release-gate-counter-script), where these functions get a test that reruns without you.

<EvidenceCard
  command="uv run python counter.py"
  artifact="counter.py with gold_value, making_charge, and display as typed functions"
  invariant="Each pricing rule is a function that returns a Decimal; printing happens at the call site"
/>

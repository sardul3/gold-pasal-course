---
id: r1-05
title: "Generators, files, and decorators"
release: r1
order: 5
prerequisites: [r1-04]
outcomes:
  - Write a generator with yield and consume it lazily
  - Read and write a tray CSV and a JSON file with pathlib, csv, and json
  - Write a decorator with functools.wraps and a closure that carries a rate
evidence: [commit, ci-run]
---

<LessonMission
  role="counter salesperson"
  problem="The tray comes in as a CSV from the scale software, not as a Python list typed by hand. Some days it has three rows, some days three hundred, and every pricing function is called through the same logging wrapper."
  destination="You can stream rows from a file, turn each into a Decimal, write results back as JSON, and wrap a pricing function without editing it."
/>

# Generators, files, and decorators

Three intermediate tools that show up all over Python code. **Generators** produce values one at a time instead of building a whole list. **Files** need opening, reading, and closing safely. **Decorators** wrap a function to add behavior around it. They share one idea: the code that produces data is separate from the code that consumes it.

## See the idea first

From `gold-pasal`, `uv run python`:

```python
>>> from decimal import Decimal
>>> from gold_pasal.units import grams_to_tola
>>> def tola_readings(grams_list):
...     for grams in grams_list:
...         yield grams_to_tola(grams)
...
>>> readings = tola_readings([Decimal("11.6638038"), Decimal("5.8319019")])
>>> readings
<generator object tola_readings at 0x...>
>>> list(readings)
[Decimal('1'), Decimal('0.5')]
```

`yield` instead of `return` makes `tola_readings` a **generator function**. Calling it does no work; it returns a generator object. Each value is computed only when something asks for it.

## Iteration under the hood

`for` works on anything **iterable**. It calls `iter()` to get an **iterator**, then `next()` until `StopIteration`:

```python
>>> tray = [Decimal("5.00"), Decimal("11.6638038")]
>>> it = iter(tray)
>>> next(it)
Decimal('5.00')
>>> next(it)
Decimal('11.6638038')
>>> next(it)
Traceback (most recent call last):
  ...
StopIteration
```

Lists, tuples, dicts, strings, files, and generators are all iterable. You rarely call `next` yourself; `for`, `list()`, `sum()`, and comprehensions do it for you.

## Generators

A generator is an iterator you write with a function body. It remembers where it was between `next` calls:

```python
def priced_rows(rows, rate_per_tola):
    for sku, grams, karat in rows:
        gold = rate_per_tola * grams_to_tola(grams) * Decimal(karat) / Decimal(24)
        yield sku, gold
```

Compared with building a list and returning it, a generator uses constant memory for a tray of any size and starts producing the first row before the last one is read. For three rows the difference is invisible. For a nightly file of every sale it is the difference between running and not.

A generator can be consumed once. After `list(readings)` above, `list(readings)` again is `[]`. Call the function again for a fresh one.

### Generator expressions

A comprehension in parentheses is a generator:

```python
>>> sum(grams for grams in tray)
Decimal('16.6638038')
>>> max(len(name) for name in ["Ring", "Tilhari"])
7
```

When the result feeds straight into `sum`, `max`, `any`, or `all`, prefer the generator: no intermediate list.

### itertools

The standard library has building blocks for iterators:

```python
>>> import itertools
>>> list(itertools.pairwise([14, 18, 22, 24]))
[(14, 18), (18, 22), (22, 24)]
>>> all(a < b for a, b in itertools.pairwise([14, 18, 22, 24]))
True
>>> list(itertools.islice(itertools.count(14, 4), 3))
[14, 18, 22]
```

`pairwise` plus `all` is a one-line "this list is strictly increasing", which R2 uses to assert that gold value never falls as karat rises.

## Files and pathlib

`Path` (from the [imports page](01-modules-packages-and-imports)) represents a file location. Reading a whole small file is one call:

```python
>>> from pathlib import Path
>>> tray_path = Path("tray.csv")
>>> tray_path.write_text("sku,grams,karat\nRING-01,5.00,22\nCHAIN-02,11.6638038,22\n")
55
>>> tray_path.read_text().splitlines()[1]
'RING-01,5.00,22'
>>> tray_path.exists(), Path("nope.csv").exists()
(True, False)
```

`write_text` returns the number of characters written. Run this from the shop root and it creates `tray.csv` there; delete it at the end of the page.

### with open

For anything beyond one small read, open the file in a `with` block:

```python
with tray_path.open() as handle:
    for line in handle:
        print(line.rstrip())
```

`with` is a **context manager**: it opens the file, runs the block, and closes the file when the block ends, even if the block raises. A file iterates line by line (another iterator), so a huge file never sits in memory at once. `rstrip()` removes the trailing newline each line carries.

Write mode replaces the file; append mode adds to it:

```python
with Path("note.txt").open("w") as handle:
    handle.write("Maya\n")
    handle.write("22K\n")
```

A missing file raises `FileNotFoundError`, a subclass of `OSError`. Catch it at the place that knows what to do (ask for another path, fall back to a default).

### CSV

Do not split on commas by hand. `csv.DictReader` handles quoting and gives you one dict per row, keyed by the header:

```python
import csv

with tray_path.open() as handle:
    rows = list(csv.DictReader(handle))
```

```python
>>> rows[0]
{'sku': 'RING-01', 'grams': '5.00', 'karat': '22'}
>>> Decimal(rows[1]["grams"])
Decimal('11.6638038')
```

Every value from a CSV is a string. Convert at the edge: `Decimal(row["grams"])`, `int(row["karat"])`. This is the boundary where a `ValueError` or `InvalidOperation` for `"22K"` belongs.

Putting it together, a generator that yields validated ornaments from a file:

```python
from dataclasses import dataclass


@dataclass(frozen=True)
class Ornament:
    sku: str
    grams: Decimal
    karat: int


def read_tray(path: Path):
    with path.open() as handle:
        for row in csv.DictReader(handle):
            yield Ornament(row["sku"], Decimal(row["grams"]), int(row["karat"]))
```

```python
>>> [item.sku for item in read_tray(tray_path)]
['RING-01', 'CHAIN-02']
```

The file is closed when the generator finishes. The caller never sees a raw string.

## JSON

`json` converts between Python values and the text format APIs speak:

```python
>>> import json
>>> data = {"sku": "RING-01", "karat": 22, "weight_grams": "5.00"}
>>> text = json.dumps(data)
>>> text
'{"sku": "RING-01", "karat": 22, "weight_grams": "5.00"}'
>>> json.loads(text)["karat"]
22
```

`dumps` (dump to string) and `loads` (load from string) are the pair; `json.dump(data, handle)` and `json.load(handle)` do the same with an open file. `indent=2` pretty-prints.

::: warning JSON has no Decimal
`json.dumps({"total": Decimal("1.5")})` raises `TypeError: Object of type Decimal is not JSON serializable`. Send money as a string (`str(total)`) and parse it back with `Decimal(...)` on the other side. Never let it become a float in transit. R3's API uses this rule for `weight_grams`.
:::

```python
>>> json.dumps({"total": Decimal("1.5")}, default=str)
'{"total": "1.5"}'
```

`default=str` tells `dumps` how to handle types it does not know.

## Closures

A function defined inside another function keeps access to the outer function's variables after the outer one returns. That is a **closure**:

```python
>>> def per_gram_policy(rate):
...     def charge(grams):
...         return grams * rate
...     return charge
...
>>> patan = per_gram_policy(Decimal("1500"))
>>> patan(Decimal("5.00"))
Decimal('7500.00')
```

`patan` remembers `rate` even though `per_gram_policy` has finished. A closure is the lightweight version of the `PerGram` class from the [type hints page](04-type-hints-protocols-and-pyright): use the class when you want a named type a Protocol can describe, the closure when a one-off function is enough.

## Decorators

A **decorator** is a function that takes a function and returns a new one. `@name` above a `def` is shorthand for `func = name(func)`.

```python
import functools


def logged(func):
    @functools.wraps(func)
    def wrapper(*args, **kwargs):
        result = func(*args, **kwargs)
        print(f"{func.__name__}{args} -> {result}")
        return result
    return wrapper


@logged
def making_charge(grams, per_gram):
    return grams * per_gram
```

```python
>>> making_charge(Decimal("5.00"), Decimal("1500"))
making_charge(Decimal('5.00'), Decimal('1500')) -> 7500.00
Decimal('7500.00')
>>> making_charge.__name__
'making_charge'
```

`wrapper` accepts any arguments (`*args, **kwargs`), calls the original, does something extra, and returns the original's result. `functools.wraps` copies the name and docstring onto the wrapper; without it `making_charge.__name__` would be `'wrapper'` and pytest output would be confusing.

You have already used decorators written by others: `@dataclass`, `@property`, `@classmethod`, and soon `@pytest.mark.parametrize` and `@pytest.fixture`. Writing one is worth doing once so those stop being magic.

### functools.lru_cache

A decorator from the standard library that remembers results:

```python
>>> @functools.lru_cache
... def purity_factor(karat):
...     print("computing")
...     return Decimal(karat) / Decimal(24)
...
>>> purity_factor(22)
computing
Decimal('0.9166666666666666666666666667')
>>> purity_factor(22)
Decimal('0.9166666666666666666666666667')
```

The second call did not print. Cache only pure functions (same input, same output, no side effects). A cached function that reads today's gold rate would serve yesterday's.

## Context managers you write

`with` works on any object with `__enter__` and `__exit__`. `contextlib.contextmanager` builds one from a generator:

```python
>>> from contextlib import contextmanager
>>> @contextmanager
... def counter_session(name):
...     print(f"open {name}")
...     yield name
...     print(f"close {name}")
...
>>> with counter_session("Patan") as session:
...     print("serving", session)
...
open Patan
serving Patan
close Patan
```

Everything before `yield` is setup; everything after is teardown, run even if the block raises. R4 uses this shape for database transactions: begin, yield the session, commit or roll back.

## Unpacking with * and **

The stars from `*args` and `**kwargs` also spread a collection into a call or a literal:

```python
>>> print(*[1, 2, 3])
1 2 3
>>> [*[1, 2], *[3]]
[1, 2, 3]
>>> {**{"a": 1}, **{"b": 2}}
{'a': 1, 'b': 2}
```

`quote(**inputs)` with a dict of the five contract fields is a common way to call a keyword-only function from a row you read from a file.

Clean up the scratch files before moving on:

```bash
rm tray.csv note.txt
```

## If it fails

| What you see | Cause | Fix |
| --- | --- | --- |
| `list(gen)` is `[]` the second time | Generators are single-use | Call the generator function again |
| `TypeError: 'generator' object is not subscriptable` | Indexed a generator | `list(gen)[0]`, or `next(gen)` |
| `FileNotFoundError` | Wrong path or wrong working folder | `Path(...).exists()`; run from the shop root |
| `TypeError: Object of type Decimal is not JSON serializable` | Decimal in `json.dumps` | `default=str`, or convert before dumping |
| `wrapper` shows up as the function name | Missing `functools.wraps` | Add `@functools.wraps(func)` on the inner function |
| `ValueError: I/O operation on closed file` | Used the handle after the `with` block | Do the reading inside the block, or return the data |

## Practice

<LessonQuiz
  question="def readings(): yield 1; yield 2. You run g = readings(); list(g); list(g). What is the second list?"
  a="[1, 2]"
  b="[]"
  c="[2]"
  d="A StopIteration error is raised"
  correct="b"
>

The first `list(g)` drained the generator. A generator does not restart; the second `list(g)` gets `StopIteration` immediately and returns an empty list. Call `readings()` again for a fresh generator.

</LessonQuiz>

Next: [Test with pytest](06-test-with-pytest).

<EvidenceCard
  command="uv run python"
  artifact="a read_tray generator over a CSV, a JSON dump with default=str, and a logged decorator"
  invariant="Strings from files are converted to Decimal and int at the boundary, once"
/>

---
id: r0-04
title: "Lists, tuples, dicts, and sets"
release: r0
order: 4
prerequisites: [r0-03]
outcomes:
  - Hold a tray of ornaments in a list and index, slice, sort, and mutate it
  - Unpack a tuple row into named parts
  - Look up a weight by SKU in a dict and test karat membership in a set
evidence: [commit]
---

<LessonMission
  role="counter salesperson"
  problem="The tray holds a ring, a tilhari, and a bangle. Each has a SKU, grams, and karat. Three variables per piece does not scale to a tray, and the display name is not a safe key."
  destination="You can model the tray with a list of tuples, look up grams by SKU in a dict, and check karat against a set of supported values."
/>

# Lists, tuples, dicts, and sets

Python has four built-in **collections**. A **list** is an ordered sequence you can change. A **tuple** is an ordered sequence you cannot change. A **dict** (dictionary) maps keys to values. A **set** holds unique members and answers "is this in here?" fast.

The tray at the counter uses all four.

## See the idea first

From `gold-pasal`, `uv run python`:

```python
>>> tray = ["Sajilo 22K Ring", "Tilhari Necklace", "18K Bangle"]
>>> tray[0]
'Sajilo 22K Ring'
>>> len(tray)
3
>>> tray.append("Nathiya")
>>> tray
['Sajilo 22K Ring', 'Tilhari Necklace', '18K Bangle', 'Nathiya']
```

Square brackets make a list. `tray[0]` is the first item. `append` adds one at the end and changes the list in place.

## Lists

### Index and slice

Indexes and slices work exactly as they did on strings:

```python
>>> tray[-1]
'Nathiya'
>>> tray[1:3]
['Tilhari Necklace', '18K Bangle']
```

Asking for an index that does not exist is an error, not `None`:

```python
>>> tray[4]
Traceback (most recent call last):
  ...
IndexError: list index out of range
```

### Add and remove

```python
>>> tray.insert(0, "Chura")
>>> tray
['Chura', 'Sajilo 22K Ring', 'Tilhari Necklace', '18K Bangle', 'Nathiya']
>>> tray.pop()
'Nathiya'
>>> tray.remove("Chura")
>>> tray
['Sajilo 22K Ring', 'Tilhari Necklace', '18K Bangle']
```

`pop()` removes and returns the last item. `remove(x)` deletes the first item equal to `x`. `append`, `insert`, `pop`, and `remove` all **mutate** the list: they change it rather than returning a new one.

### Sort

`sorted` returns a new sorted list. `.sort()` sorts in place and returns `None`.

```python
>>> from decimal import Decimal
>>> weights = [Decimal("5.00"), Decimal("11.6638038"), Decimal("3.20")]
>>> sorted(weights)
[Decimal('3.20'), Decimal('5.00'), Decimal('11.6638038')]
>>> sorted(weights, reverse=True)
[Decimal('11.6638038'), Decimal('5.00'), Decimal('3.20')]
>>> weights
[Decimal('5.00'), Decimal('11.6638038'), Decimal('3.20')]
```

Sort by something other than the value itself with `key`:

```python
>>> sorted(tray, key=len)
['18K Bangle', 'Sajilo 22K Ring', 'Tilhari Necklace']
```

`key=len` means "compare by the length of each name". Any function works as a key; the [Functions](06-functions) page comes back to this.

### Aggregate

```python
>>> sum(weights)
Decimal('19.8638038')
>>> min(weights), max(weights)
(Decimal('3.20'), Decimal('11.6638038'))
>>> "18K Bangle" in tray
True
```

### Two names, one list

Assignment does not copy. Two names can point at the same list:

```python
>>> a = [1, 2]
>>> b = a
>>> b.append(3)
>>> a
[1, 2, 3]
```

When you want an independent copy, say so:

```python
>>> c = a.copy()
>>> c.append(4)
>>> a
[1, 2, 3]
>>> c
[1, 2, 3, 4]
```

This is the single most common surprise for people new to Python. If a list changes "on its own", look for a second name bound to it.

## Tuples

A **tuple** is a fixed sequence. Parentheses make one, and you cannot append to it. Use a tuple for a row whose shape never changes:

```python
>>> row = ("RING-01", Decimal("5.00"), 22)
>>> row[1]
Decimal('5.00')
>>> len(row)
3
```

### Unpacking

Bind each position to a name in one line:

```python
>>> sku, grams, karat = row
>>> sku
'RING-01'
>>> karat
22
```

Unpacking is how a `for` loop reads rows on the next page. Functions also return several values as a tuple:

```python
>>> divmod(7, 2)
(3, 1)
>>> whole, remainder = divmod(7, 2)
```

### The tray as a list of tuples

```python
tray = [
    ("RING-01", Decimal("5.00"), 22),
    ("CHAIN-02", Decimal("11.6638038"), 22),
    ("BANGLE-09", Decimal("8.40"), 16),
]
```

A list holds the ordered tray; each tuple is one row. `tray[1][1]` is Maya's grams. That double index is the sign you want a dict.

## Dictionaries

A **dict** maps a **key** to a **value**. Curly braces with colons make one:

```python
>>> catalog = {"RING-01": Decimal("5.00"), "CHAIN-02": Decimal("11.6638038")}
>>> catalog["RING-01"]
Decimal('5.00')
```

Keys are usually strings or ints. Values can be anything.

### Lookup

A missing key is an error, not `None`:

```python
>>> catalog["BANGLE-09"]
Traceback (most recent call last):
  ...
KeyError: 'BANGLE-09'
```

`get` returns `None` (or a default you choose) instead:

```python
>>> catalog.get("BANGLE-09")
>>> catalog.get("BANGLE-09", Decimal("0"))
Decimal('0')
```

Use `[]` when the key must exist, so a typo fails loudly. Use `get` when absence is a normal case.

### Add, change, delete

```python
>>> catalog["BANGLE-09"] = Decimal("18.5")
>>> catalog
{'RING-01': Decimal('5.00'), 'CHAIN-02': Decimal('11.6638038'), 'BANGLE-09': Decimal('18.5')}
>>> del catalog["BANGLE-09"]
>>> "BANGLE-09" in catalog
False
>>> len(catalog)
2
```

`in` on a dict checks keys, not values.

### Keys, values, items

```python
>>> list(catalog.keys())
['RING-01', 'CHAIN-02']
>>> list(catalog.values())
[Decimal('5.00'), Decimal('11.6638038')]
>>> for sku, grams in catalog.items():
...     print(sku, grams)
...
RING-01 5.00
CHAIN-02 11.6638038
```

`items()` gives `(key, value)` pairs. The loop unpacks each pair. Dicts keep insertion order.

### A record as a dict

A dict can describe one ornament by field name:

```python
>>> item = {"sku": "RING-01", "karat": 22, "weight_grams": Decimal("5.00"), "tags": ["ring", "wedding"]}
>>> item["karat"]
22
>>> item["tags"][0]
'ring'
```

Nesting works: a dict can hold a list, and a list can hold dicts. R1 replaces this shape with a **dataclass**, which gives each field a name and a type. Until then, the dict is fine for a scratch script.

## Sets

A **set** holds unique values with no order. Braces without colons make one:

```python
>>> SUPPORTED_KARATS = {14, 18, 22, 24}
>>> 22 in SUPPORTED_KARATS
True
>>> 19 in SUPPORTED_KARATS
False
```

Membership is the main job of a set. It is the right tool for "is this karat one we sell".

### Deduplicate

`set()` on a list drops repeats:

```python
>>> stamps = [22, 22, 18, 24, 22]
>>> sorted(set(stamps))
[18, 22, 24]
>>> len(set(stamps))
3
```

Print `sorted(...)` of a set. Printing the set itself shows the members in an order you should not rely on.

### Set arithmetic

```python
>>> sorted(SUPPORTED_KARATS & {18, 19, 22})
[18, 22]
>>> sorted(SUPPORTED_KARATS - {14, 18})
[22, 24]
```

`&` is the intersection (in both), `|` the union (in either), `-` the difference (in the first but not the second).

## Which one to use

| You need | Use | Example |
| --- | --- | --- |
| an ordered tray you add to and remove from | `list` | `tray.append(...)` |
| one row with a fixed shape | `tuple` | `("RING-01", Decimal("5.00"), 22)` |
| lookup by a key | `dict` | `catalog["RING-01"]` |
| membership or uniqueness | `set` | `karat in SUPPORTED_KARATS` |

Look up by SKU, not by display name. Names on tags change; codes should not.

## Update counter.py

Replace the single-ornament variables with a tray:

```python
from decimal import ROUND_HALF_UP, Decimal

GRAMS_PER_TOLA = Decimal("11.6638038")
SUPPORTED_KARATS = {14, 18, 22, 24}
RATE_PER_TOLA = Decimal("200000")

tray = [
    ("RING-01", Decimal("5.00"), 22),
    ("CHAIN-02", Decimal("11.6638038"), 22),
    ("BANGLE-09", Decimal("8.40"), 16),
]

sku, grams, karat = tray[1]
tola = grams / GRAMS_PER_TOLA
gold_value = RATE_PER_TOLA * tola * Decimal(karat) / Decimal(24)
displayed = gold_value.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

print(f"{sku}: {grams} g is {tola} tola")
print(f"Gold value: NPR {displayed}")
print("BANGLE-09 supported:", 16 in SUPPORTED_KARATS)
```

```bash
uv run python counter.py
```

```text
CHAIN-02: 11.6638038 g is 1 tola
Gold value: NPR 183333.33
BANGLE-09 supported: False
```

`tray[1]` unpacks Maya's row. The next page loops over all three rows and branches on the karat check.

## If it fails

| What you see | Cause | Fix |
| --- | --- | --- |
| `IndexError: list index out of range` | Index past the last item | Indexes start at `0`; last is `len(tray) - 1` |
| `KeyError: 'CHAIN-02'` | Key typo, or never added | Print the dict; copy the key exactly |
| `ValueError: too many values to unpack` | Row has more parts than names | Match the count: `sku, grams, karat = row` |
| `AttributeError: 'tuple' object has no attribute 'append'` | Tried to change a tuple | Use a list, or build a new tuple |
| `TypeError: unhashable type: 'list'` | Used a list as a dict key or set member | Use a tuple or string as the key |
| A list changed when you edited "another" list | Two names, one list | `.copy()` when you need a separate list |

## Practice

<LessonQuiz
  question="catalog = {'RING-01': Decimal('5.00'), 'CHAIN-02': Decimal('11.6638038')}. What does catalog.get('BANGLE-09') return?"
  a="Decimal('0')"
  b="A KeyError"
  c="None"
  d="'BANGLE-09'"
  correct="c"
>

`get` returns `None` for a missing key unless you pass a default. `catalog['BANGLE-09']` with square brackets would raise `KeyError`.

</LessonQuiz>

Next: [Conditionals and loops](05-conditionals-and-loops).

<EvidenceCard
  command="uv run python counter.py"
  artifact="counter.py with a tray list, tuple unpacking, and a supported-karat set"
  invariant="SKUs are keys; karat is one of 14, 18, 22, 24"
/>

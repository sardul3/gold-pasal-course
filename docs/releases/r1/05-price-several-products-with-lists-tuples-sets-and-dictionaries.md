---
id: r1-05
title: "Price several products with lists, tuples, sets, and dictionaries"
release: r1
order: 5
prerequisites: [r1-04]
outcomes:
  - Index and loop a list of product names
  - Unpack a tuple of SKU and weight
  - Use a set for supported karats and a dict for unique SKU lookup
evidence: [commit, ci-run]
---

<LessonMission
  role="counter salesperson"
  problem="The tray has a ring and a chain. One name cannot hold both, and a dict of SKUs would silently drop a duplicate line."
  destination="You can loop two products, print names, and say when to use list vs dict."
/>

# Price several products with lists, tuples, sets, and dictionaries

The counter now has two pieces, not one.

- A **list** is an ordered, changeable sequence.
- A **tuple** is an ordered, fixed-length grouping.
- A **set** is an unordered collection of unique values.
- A **dictionary** maps unique keys to values.

## See the idea first

```python
products = ["22K Gold Ring", "22K Tilhari Necklace"]
products.append("18K Gold Bangle")
for name in products:
    print(name)
items = [("RING-01", "5.00"), ("CHAIN-02", "11.6638038")]
code, weight = items[0]
print(code, weight)
supported = {14, 18, 22, 24}
print(22 in supported)
weight_by_code = dict(items)
print(weight_by_code["CHAIN-02"])
```

You should see three names, then `RING-01 5.00`, then `True`, then `11.6638038`.

Unpacking assigns each tuple position to a name. Membership in a set does not preserve display order.

## Two 24K lines

Author a test with two 24K products at NPR 240,000 per tola, zero wastage, zero making:

```text
RING-01: 5.8319019 g → NPR 135,600 after 13% VAT
CHAIN-02: 11.6638038 g → NPR 271,200 after 13% VAT
ordered totals → [135600, 271200]
```

Assert both order and values. Run it red before adding a loop. Do not mutate the input list while iterating. Produce a result list.

If `[('RING-01', 5), ('RING-01', 7)]` becomes a dictionary, one key remains and one weight is lost. Do not silently deduplicate quote lines.

## Practice

Write a failing test with duplicate code `RING-01` before choosing a policy. Decide whether duplicate lines are valid or rejected.

<LessonQuiz
  question="If [('RING-01', 5), ('RING-01', 7)] becomes a dict, how many keys remain?"
  a="Two"
  b="One"
  c="Zero"
  d="Three"
  correct="b"
>

A dictionary keeps one value per key. A list of tuples is safer for quote lines when duplicate SKUs can mean two pieces.

</LessonQuiz>

## Check

```bash
uv run pytest -q -k products
./scripts/verify.sh
```

Next: [Small functions](06-extract-pricing-rules-into-small-functions).

<EvidenceCard
  command="uv run pytest -q -k products"
  artifact="ordered totals for two 24K lines; duplicate SKU policy is explicit"
  invariant="quote line order is preserved; dictionaries do not silently drop lines"
/>

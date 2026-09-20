---
id: r1-01
title: "Model a customer quote with Python values and names"
release: r1
order: 1
prerequisites: []
outcomes:
  - Bind Maya's quote facts to Python names
  - Print those names and check them by hand
  - Write a failing test for one tola of 24K before production code
evidence: [commit, ci-run]
---

<LessonMission
  role="counter salesperson"
  problem="Maya brings an 11.6638038 g ornament and asks why the NPR total is that amount. The facts live in someone's head, not in named values."
  destination="Each quote input has one Python name you can print and check by hand."
/>

# Model a customer quote with Python values and names

Maya is at the Patan counter. Give each fact one name before you write a calculator.

A **value** is a piece of data such as `22` or `"Maya"`. A **name** is the label your program binds to a value. `=` binds; it is not algebra.

## See the idea first

```python
customer_name = "Maya"
weight_grams = 11.6638038
karat = 22
rate_per_tola = 200000
print(customer_name, weight_grams, karat, rate_per_tola)
```

You should see:

```text
Maya 11.6638038 22 200000
```

Notice the names carry units (`weight_grams`, `rate_per_tola`). The number `200000` alone is ambiguous.

These first numbers are floats so you can practice naming. Money in later lessons uses `Decimal`. Do not treat this runner as a gold quote.

## Hand-check one tola of 24K

The [pricing contract](/reference/pricing-contract) uses `1 tola = 11.6638038 g`. Start with a tiny case:

```text
rate = NPR 240,000 / tola
weight = 11.6638038 g = 1 tola
karat = 24
wastage = 0%
making = NPR 0 / g
VAT = 13% of subtotal
expected total = NPR 271,200
```

Metal value is NPR 240,000. VAT is `240000 × 0.13 = 31200`. Total is NPR 271,200.

## Author the test first

In `gold-pasal`, create a test that fails because quote behavior does not exist yet:

```python
def test_one_tola_of_24k_with_no_charges_costs_the_rate() -> None:
    # Arrange the five inputs.
    # Act by requesting one quote.
    # Assert the total is NPR 271200.00.
    ...
```

Run only this test. A red test caused by a syntax error is not the intended failure. Then write the smallest production slice that names the inputs and returns enough for this one assertion.

Do not copy a solved application from this page. The CLI in later lessons is the destination, not this page's command.

## Practice

Write a second test first for `5.8319019 g`, 24K, no wastage, no making charge, NPR 240,000 per tola. Predict the total before you run it: half a tola → metal NPR 120,000 → VAT NPR 15,600 → total NPR 135,600.

<LessonQuiz
  question="What does weight_grams = 11.6638038 do?"
  a="It solves an algebra equation"
  b="It binds the name weight_grams to that number"
  c="It prints Maya's NPR total"
  d="It converts grams to tola"
  correct="b"
>

`=` binds a name to a value. Conversion and quoting come later.

</LessonQuiz>

## Check

From `gold-pasal`, keep `./scripts/verify.sh` green after your current slice. The public CLI need not exist yet.

Next: [Choose strings, integers, booleans, and Decimal](02-choose-strings-integers-booleans-and-decimal-for-jewelry-data).

<EvidenceCard
  command="uv run pytest -q -k one_tola_of_24k"
  artifact="a failing-then-passing test that names quote inputs"
  invariant="the same explicit inputs always produce the same itemized quote"
/>

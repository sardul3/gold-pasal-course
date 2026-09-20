---
id: r1-03
title: "Convert grams and tola without hiding rounding rules"
release: r1
order: 3
prerequisites: [r1-02]
outcomes:
  - Convert 11.6638038 g to 1 tola with Decimal
  - Round-trip half a tola back to grams
  - Keep full precision until displayed NPR is quantized
evidence: [commit, ci-run]
---

<LessonMission
  role="counter salesperson"
  problem="The rate card is per tola, the scale reports grams, and rounding the weight too early would change Maya's NPR total."
  destination="You can convert grams to tola, print the result, and say where rounding is allowed."
/>

# Convert grams and tola without hiding rounding rules

The Nepal rate card is per tola. The shop scale reports grams. R1 defines one tola as exactly `11.6638038` grams. Conversion changes representation, not physical mass.

## See the idea first

```python
from decimal import Decimal
GRAMS_PER_TOLA = Decimal("11.6638038")
weight_grams = Decimal("11.6638038")
tola = weight_grams / GRAMS_PER_TOLA
print(tola)
half = Decimal("5.8319019") / GRAMS_PER_TOLA
print(half)
print(half * GRAMS_PER_TOLA)
```

You should see:

```text
1
0.5
5.8319019
```

**Rounding** replaces a value with a nearby value at a chosen precision. **Quantize** rounds a Decimal to an increment such as `Decimal("0.01")` for displayed NPR. Do not round converted weight before pricing unless the contract says so. See the [pricing contract](/reference/pricing-contract).

## Write conversion tests first

```python
from decimal import Decimal

def test_course_tola_weight_converts_to_one_tola() -> None:
    assert grams_to_tola(Decimal("11.6638038")) == Decimal("1")


def test_half_course_tola_round_trips_to_grams() -> None:
    grams = Decimal("5.8319019")
    assert tola_to_grams(grams_to_tola(grams)) == grams
```

Run the focused file red because the functions are missing. Implement only those two functions. Do not quantize the returned tola to an integer. Half a tola is a valid mass.

## Practice

Write a red test for `23.3276076 g`. Predict `2` tola. Then, at NPR 200,000 per tola and 24K with zero charges, gold value is NPR 400,000 before display formatting.

<LessonQuiz
  question="If you round 0.5 tola to 0 decimal places before multiplying by NPR 240,000, what happens?"
  a="The price stays NPR 120,000"
  b="The tola value becomes 0 or 1 and the price is wrong"
  c="VAT disappears"
  d="Grams become tola automatically"
  correct="b"
>

Early rounding throws away half a tola. Keep full Decimal precision through the formula; round displayed money at the output boundary with `ROUND_HALF_UP`.

</LessonQuiz>

## Check

```bash
uv run pytest -q -k tola
./scripts/verify.sh
```

Next: [Karat choices](04-represent-karat-choices-with-conditionals-and-enums).

<EvidenceCard
  command="uv run pytest -q -k tola"
  artifact="grams_to_tola(11.6638038) == 1, half tola round-trips"
  invariant="weight is not rounded before pricing"
/>

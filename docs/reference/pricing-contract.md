---
title: R1 pricing contract
description: The fixed business formula and CLI output used by Gold Pasal release checks.
---

# R1 pricing contract

The quote desk needs one explicit policy so two correct-looking implementations do not disagree.

## Inputs

- `rate_per_tola`: NPR reference rate for one tola of 24K gold
- `weight_grams`: physical gold weight
- `karat`: one of `14`, `18`, `22`, or `24`
- `wastage_percent`: percentage of the purity-adjusted gold value
- `making_charge_per_gram`: NPR labor/design charge per gram

Use `1 tola = 11.6638038 grams` and a fixed VAT rate of `13%`.

## Formula

Keep full `Decimal` precision through the formula:

```text
purity_factor = karat / 24
gold_value = rate_per_tola × (weight_grams / 11.6638038) × purity_factor
wastage_charge = gold_value × (wastage_percent / 100)
making_charge = weight_grams × making_charge_per_gram
subtotal = gold_value + wastage_charge + making_charge
vat = subtotal × 0.13
total = subtotal + vat
```

Round displayed money to two decimal places with `ROUND_HALF_UP`. Calculate `total` from unrounded components, then round it; do not add already rounded display lines.

For the canonical R1 command, the displayed values are:

```text
Gold value: NPR 183333.33
Wastage: NPR 3666.67
Making charge: NPR 17495.71
VAT: NPR 26584.44
Total: NPR 231080.15
```

These labels and units are part of the CLI contract. Whitespace or richer terminal styling may differ, but the external release check must be able to identify each labelled amount.

---
title: "R1 — The gold-rate quote desk"
description: "A typed CLI that explains a Nepal jewelry quote in NPR."
---

# R1 — The gold-rate quote desk

**Release promise:** A typed CLI that explains a Nepal jewelry quote in NPR.

One fixed [pricing contract](/reference/pricing-contract): tola conversion, purity, wastage, making charge, VAT, rounding, and output labels.

Each lesson is a typed session. Stay on Maya's quote. Do not repeat the full CLI until the command exists.

<LessonMission
  role="counter salesperson"
  problem="A customer asks why an 11.6638038 g, 22K ornament has this NPR total."
  destination="The CLI prints a quote whose inputs and components can be checked by hand."
/>

## Lessons

1. [Model a customer quote with Python values and names](01-model-a-customer-quote-with-python-values-and-names)
2. [Choose strings, integers, booleans, and Decimal for jewelry data](02-choose-strings-integers-booleans-and-decimal-for-jewelry-data)
3. [Convert grams and tola without hiding rounding rules](03-convert-grams-and-tola-without-hiding-rounding-rules)
4. [Represent karat choices with conditionals and enums](04-represent-karat-choices-with-conditionals-and-enums)
5. [Price several products with lists, tuples, sets, and dictionaries](05-price-several-products-with-lists-tuples-sets-and-dictionaries)
6. [Extract pricing rules into small functions](06-extract-pricing-rules-into-small-functions)
7. [Validate bad weights, rates, and karat values with exceptions](07-validate-bad-weights-rates-and-karat-values-with-exceptions)
8. [Split the quote desk into modules and packages](08-split-the-quote-desk-into-modules-and-packages)
9. [Add type hints and let Pyright find a real defect](09-add-type-hints-and-let-pyright-find-a-real-defect)
10. [Use dataclasses for quote inputs and results](10-use-dataclasses-for-quote-inputs-and-results)
11. [Build a useful pricing CLI](11-build-a-useful-pricing-cli)
12. [Release gate: explain and reproduce an NPR quote by hand and in code](12-release-gate-explain-and-reproduce-an-npr-quote-by-hand-and-in-code)

## Release evidence

Run `uv run gold-pasal quote --rate-per-tola 200000 --weight-grams 11.6638038 --karat 22 --wastage-percent 2 --making-charge-per-gram 1500` and preserve a commit containing the CLI behavior and its printed quote. At the review, defend this
invariant: **the same explicit inputs always produce the same itemized quote.**

<ArchitectureTrail
  before="A customer asks why an 11.6638038 g, 22K ornament has this NPR total."
  decision="Introduce only the boundary and mechanism needed by this release."
  after="The CLI prints a quote whose inputs and components can be checked by hand."
/>

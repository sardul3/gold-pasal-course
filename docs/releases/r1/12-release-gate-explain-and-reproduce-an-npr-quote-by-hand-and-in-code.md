---
id: r1-12
title: "Release gate: explain and reproduce an NPR quote by hand and in code"
release: r1
order: 12
prerequisites: [r1-11]
outcomes:
  - Reproduce Maya's itemized quote by hand from the pricing contract
  - Run the canonical CLI and one --weight-grams 0 failure
  - Present commit SHA, application-ci URL, and ./scripts/verify.sh
evidence: [commit, ci-run, demo]
---

<LessonMission
  role="counter salesperson"
  problem="A green laptop is not enough. A reviewer must see the same NPR total from arithmetic and from the CLI on one SHA."
  destination="You can explain NPR 231080.15 by hand, run the CLI, and show a controlled zero-weight failure."
/>

# Release gate: explain and reproduce an NPR quote by hand and in code

This page is a demonstration you can repeat without reading the implementation. Formula: [pricing contract](/reference/pricing-contract).

## See the idea first

The mass is one tola because `11.6638038 / 11.6638038 = 1`.

22K metal value:

```text
NPR 200,000 × 22 / 24 = NPR 183,333.333...
```

Wastage 2% of metal:

```text
NPR 183,333.333... × 2 / 100 = NPR 3,666.666...
```

Making charge:

```text
11.6638038 g × NPR 1,500/g = NPR 17,495.7057
```

Subtotal ≈ NPR 204,495.7057. VAT 13% ≈ NPR 26,584.4417. Final-total rounding with `ROUND_HALF_UP` produces **NPR 231,080.15**. Keep full precision through the formula; round displayed money at the end.

Displayed lines:

```text
Gold value: NPR 183333.33
Wastage: NPR 3666.67
Making charge: NPR 17495.71
VAT: NPR 26584.44
Total: NPR 231080.15
```

## Run the public command

From `gold-pasal`:

```bash
uv run gold-pasal quote --rate-per-tola 200000 --weight-grams 11.6638038 --karat 22 --wastage-percent 2 --making-charge-per-gram 1500
```

Exit status `0`. Match the labels above.

Then the failure:

```bash
uv run gold-pasal quote --rate-per-tola 200000 --weight-grams 0 --karat 22 --wastage-percent 2 --making-charge-per-gram 1500
```

Non-zero exit. A message naming weight. No quote total. Rerun the valid command to prove failure handling did not mutate state.

## Practice

Black-box test first: `5.8319019 g`, 24K, zero wastage, zero making, NPR 240,000 per tola. Half a tola → metal NPR 120,000 → VAT NPR 15,600 → total NPR 135,600.00. Predict every printed component before you run it.

<LessonQuiz
  question="What displayed total should the canonical Maya command print?"
  a="NPR 200000.00"
  b="NPR 231080.15"
  c="NPR 183333.33"
  d="NPR 271200.00"
  correct="b"
>

NPR 231,080.15 is the contract total after 22K, wastage, making, and 13% VAT.

</LessonQuiz>

## Check

```bash
./scripts/verify.sh
git rev-parse HEAD
```

Present the commit SHA, GitHub Actions `application-ci` URL, valid command output, invalid command and non-zero status, and `./scripts/verify.sh`. Graduate only when those agree on one SHA.

<EvidenceCard
  command="uv run gold-pasal quote --rate-per-tola 200000 --weight-grams 11.6638038 --karat 22 --wastage-percent 2 --making-charge-per-gram 1500"
  artifact="hand arithmetic, CLI output, zero-weight failure, SHA plus CI URL"
  invariant="the same explicit inputs always produce the same itemized quote"
/>

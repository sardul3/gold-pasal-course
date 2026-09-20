---
id: r1-11
title: "Build a useful pricing CLI"
release: r1
order: 11
prerequisites: [r1-10]
outcomes:
  - Invoke uv run gold-pasal quote with the five public options
  - Print labelled Gold value, Wastage, Making charge, VAT, and Total
  - Return non-zero exit for --weight-grams 0
evidence: [commit, ci-run]
---

<LessonMission
  role="counter salesperson"
  problem="Sita cannot import a Python module at the counter. She needs one command that prints Maya's itemized NPR quote."
  destination="The exact quote command exits 0 and prints the contract labels."
/>

# Build a useful pricing CLI

A **CLI** (command-line interface) turns shell arguments into one observable quote. `gold-pasal` is the installed console command. `quote` is a subcommand. Each `--name value` pair is an option.

The CLI owns parsing, help, error presentation, and exit status. Pricing owns jewelry arithmetic. Do not put the formula inside argument callbacks.

## See the idea first

From `gold-pasal`:

```bash
uv run gold-pasal quote --rate-per-tola 200000 --weight-grams 11.6638038 --karat 22 --wastage-percent 2 --making-charge-per-gram 1500
```

You should see labels and amounts from the [pricing contract](/reference/pricing-contract) (whitespace may differ):

```text
Gold value: NPR 183333.33
Wastage: NPR 3666.67
Making charge: NPR 17495.71
VAT: NPR 26584.44
Total: NPR 231080.15
```

Exit status `0`.

## Test from the public seam first

Before registering the command, author a subprocess test that invokes that exact line. Assert exit `0`, stable labels, and the displayed total. Run it red because the entry point is missing. Then register the smallest command and delegate to existing pricing. Do not solve pricing again inside the CLI.

Write a second test first for `--weight-grams 0`. Assert non-zero status and a useful message on **standard error** (the diagnostic stream, not the quote stream).

```bash
uv run gold-pasal quote --help
```

You should see the five option names and units: `NPR/tola`, grams, percent, `NPR/gram`.

## Practice

If parsing succeeds but domain validation rejects zero weight, the process must not return `0`. Shell automation keys off the integer, not whether the text “looked like an error.”

<LessonQuiz
  question="Which five option names must appear in gold-pasal quote --help?"
  a="--rate, --grams, --k, --waste, --make"
  b="--rate-per-tola, --weight-grams, --karat, --wastage-percent, --making-charge-per-gram"
  c="--price, --sku, --vat, --customer, --shop"
  d="None; help is optional"
  correct="b"
>

Missing one makes the public contract impossible to invoke.

</LessonQuiz>

## Check

```bash
uv run gold-pasal quote --rate-per-tola 200000 --weight-grams 11.6638038 --karat 22 --wastage-percent 2 --making-charge-per-gram 1500
./scripts/verify.sh
```

Run this exact command, not a module shortcut.

Next: [Release gate](12-release-gate-explain-and-reproduce-an-npr-quote-by-hand-and-in-code).

<EvidenceCard
  command="uv run gold-pasal quote --rate-per-tola 200000 --weight-grams 11.6638038 --karat 22 --wastage-percent 2 --making-charge-per-gram 1500"
  artifact="exit 0, contract labels, help listing five options"
  invariant="the same explicit inputs always produce the same itemized quote"
/>

---
id: r2-08
title: "Release gate: pricing invariants"
release: r2
order: 8
prerequisites: [r2-07]
outcomes:
  - Show four sorted gold values at 5.00 g from the CLI and a rejected karat 19
  - Run the full unit suite, including Hypothesis, through ./scripts/verify.sh
  - Point at the value objects, policy, fake, and log line in one demo
evidence: [commit, ci-run, demo]
---

<LessonMission
  role="pricing policy owner"
  problem="A reviewer will not read domain.py. They will run the CLI at 5 grams four times, try karat 19, and ask what would have caught the 18K-above-22K bug."
  destination="Four gold lines rise with karat, karat 19 exits 2, Maya still prints 231080.15, and verify.sh is green with domain, invariant, policy, catalog, and logging tests."
/>

# Release gate: pricing invariants

A checklist. The work is done on the previous seven pages; this page shows it to a reviewer in the order they will ask for it.

## See the idea first

1. From `gold-pasal`, price 5.00 g at each supported karat:

```bash
for karat in 14 18 22 24; do
  uv run gold-pasal quote --rate-per-tola 200000 --weight-grams 5.00 --karat $karat --wastage-percent 2 --making-charge-per-gram 1500 | head -1
done
```

```text
Gold value: NPR 50012.27
Gold value: NPR 64301.49
Gold value: NPR 78590.71
Gold value: NPR 85735.32
```

Four lines, strictly increasing. This is the course's R2 check, done by hand. `head -1` keeps the gold line only.

2. Try a karat the shop does not sell:

```bash
uv run gold-pasal quote --rate-per-tola 200000 --weight-grams 5.00 --karat 19 --wastage-percent 2 --making-charge-per-gram 1500
echo "exit $?"
```

```text
error: karat must be one of 14, 18, 22, 24; got 19
exit 2
```

The word `karat` is in the message, the exit status is non-zero, and no `Total:` line printed.

3. Maya's canonical command must be unchanged from R1:

```bash
uv run gold-pasal quote --rate-per-tola 200000 --weight-grams 11.6638038 --karat 22 --wastage-percent 2 --making-charge-per-gram 1500
```

```text
Gold value: NPR 183333.33
Wastage: NPR 3666.67
Making charge: NPR 17495.71
VAT: NPR 26584.44
Total: NPR 231080.15
```

4. Show the audit line:

```bash
uv run gold-pasal -v quote --rate-per-tola 200000 --weight-grams 5.00 --karat 22 --wastage-percent 2 --making-charge-per-gram 1500 2>&1 | head -1
```

```text
INFO gold_pasal.pricing: quote priced weight=5.00 g purity=22K rate=NPR 200000.00 total=NPR 99058.66
```

`2>&1` merges stderr into stdout so `head` can see the log line.

5. The gate:

```bash
./scripts/verify.sh
```

`All checks passed!` from ruff, `0 errors` from pyright, and every test green. The count is around forty: R0's counter tests, R1's quote and CLI tests, and this release's domain, invariant, policy, catalog, lines, and logging tests. Coverage of `src/gold_pasal` should be above ninety percent; the missing lines are the `__main__` guards.

## Where each idea lives

Walk this list out loud with the files open. One sentence each.

| Idea | File | Show |
| --- | --- | --- |
| value objects | `src/gold_pasal/domain.py` | `Purity(19)` raising; `Money.__str__` rounding a copy |
| refactor kept behavior | `tests/test_quote.py` | same five numbers, read through `.rounded()` |
| test layout | `tests/unit/`, `tests/conftest.py` | `maya_result`, `catalog` fixtures; `integration` marker in `pyproject.toml` |
| invariants | `tests/unit/pricing/test_invariants.py` | the karat-order property; the falsifying example story |
| strategy | `src/gold_pasal/pricing.py` | `MakingChargePolicy`; the CLI's default is per-gram |
| port and fake | `src/gold_pasal/catalog.py` | `CatalogRepository`; `InMemoryCatalog` with no SQL |
| audit | `logger.info` in `price` | the `-v` output above |

The question a reviewer will ask: what would have caught 18K gold above 22K? Two answers. `test_gold_value_never_falls_as_karat_rises` runs a hundred rates and weights on every verify. And `Purity.factor` is the only place `karat / 24` is computed, so there is one line to get wrong instead of five.

## Failure drill

Break the formula on purpose and watch which test catches it. In `domain.py`, change `Purity.factor` to `Decimal(24) / Decimal(self.karat)`:

```bash
uv run pytest tests/unit -q -x
```

```text
FAILED tests/unit/pricing/test_invariants.py::test_gold_value_never_falls_as_karat_rises
1 failed, 17 passed in 1.06s
```

The karat-order property is the first to notice: with the factor inverted, 14K prices above 24K. Put the line back and rerun. A gate is only worth something if you have seen it go red.

## If it fails

| What you see | Cause | Fix |
| --- | --- | --- |
| Gold lines not increasing | Purity inverted or a karat hardcoded | `Purity.factor` is `karat / 24`; rerun the invariants |
| Karat 19 prints a Total | Validation lives only in a test | `Purity.__post_init__` raises; the CLI catches `PricingError` |
| Maya's total changed | A helper rounded early during the refactor | Only `Money.__str__` and `.rounded()` round |
| Hypothesis fails on the last digit | A property stated an identity, not the contract formula | Assert `vat == subtotal * 0.13` and `total == subtotal + vat` |
| `'integration' not found in markers` | Marker not registered | Add it under `[tool.pytest.ini_options] markers` |
| No INFO line with `-v` | `basicConfig` missing or logging to stdout without redirect | Configure in `main` with `stream=sys.stderr`; use `2>&1` to see it |

## Practice

<LessonQuiz
  question="At 5.00 g and the same rate, which karat must show the highest gold value, and which single test proves it for any rate and weight?"
  a="22K; test_maya_one_tola_22k_matches_the_contract"
  b="24K; test_gold_value_never_falls_as_karat_rises"
  c="24K; test_flat_fee_ignores_weight"
  d="18K; test_lines_start_with_the_five_contract_labels"
  correct="b"
>

24K is full purity, so it is the top of the order. The Hypothesis property checks the whole order across generated rates and weights; Maya's test checks one example at one karat.

</LessonQuiz>

R3 puts `CatalogRepository` and `price` behind HTTP: `POST /api/catalog/items` builds a `CatalogItem`, and a 19K body becomes a `422` problem document instead of an exit code.

<EvidenceCard
  command="./scripts/verify.sh"
  artifact="four sorted gold lines from the CLI, karat 19 rejected, one INFO audit line, full suite green"
  invariant="Purity order is visible on the CLI and proved by a property, not only in a private helper"
/>

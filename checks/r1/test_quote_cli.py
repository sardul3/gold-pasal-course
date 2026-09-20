from decimal import Decimal
import re


def _quote(run_app, *, karat: int = 22, weight: str = "11.6638038"):
    return run_app(
        "gold-pasal",
        "quote",
        "--rate-per-tola",
        "200000",
        "--weight-grams",
        weight,
        "--karat",
        str(karat),
        "--wastage-percent",
        "2",
        "--making-charge-per-gram",
        "1500",
    )


def _amount(label: str, output: str) -> Decimal:
    match = re.search(rf"^{label}:\s*NPR\s*([0-9]+(?:\.[0-9]+)?)$", output, re.MULTILINE)
    assert match, f"Missing itemized line '{label}: NPR …' in:\n{output}"
    return Decimal(match.group(1))


def test_given_one_tola_22k_when_quoted_then_total_is_itemized(run_app) -> None:
    result = _quote(run_app)

    assert result.returncode == 0, result.stdout + result.stderr
    assert _amount("Gold value", result.stdout) == Decimal("183333.33")
    assert _amount("Wastage", result.stdout) == Decimal("3666.67")
    assert _amount("Making charge", result.stdout) == Decimal("17495.71")
    assert _amount("VAT", result.stdout) == Decimal("26584.44")
    assert _amount("Total", result.stdout) == Decimal("231080.15")


def test_given_half_weight_when_quoted_then_gold_component_halves(run_app) -> None:
    half = _quote(run_app, weight="5.8319019")

    assert half.returncode == 0
    assert _amount("Gold value", half.stdout) == Decimal("91666.67")

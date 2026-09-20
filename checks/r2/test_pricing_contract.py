from decimal import Decimal
import re


def _gold_value(output: str) -> Decimal:
    match = re.search(r"^Gold value:\s*NPR\s*([0-9.]+)$", output, re.MULTILINE)
    assert match, output
    return Decimal(match.group(1))


def _quote(run_app, karat: int):
    return run_app(
        "gold-pasal",
        "quote",
        "--rate-per-tola",
        "200000",
        "--weight-grams",
        "5.00",
        "--karat",
        str(karat),
        "--wastage-percent",
        "2",
        "--making-charge-per-gram",
        "1500",
    )


def test_given_unsupported_karat_when_quoted_then_cli_rejects_it(run_app) -> None:
    result = _quote(run_app, 19)

    assert result.returncode != 0
    assert "karat" in (result.stdout + result.stderr).lower()


def test_given_same_inputs_when_purity_increases_then_gold_value_does_not_decrease(
    run_app,
) -> None:
    values = [_gold_value(_quote(run_app, karat).stdout) for karat in (14, 18, 22, 24)]

    assert values == sorted(values)

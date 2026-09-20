from pathlib import Path
from subprocess import run


def test_given_fresh_checkout_when_verified_then_workshop_is_reproducible(
    app_repo: Path,
) -> None:
    result = run(
        ["./scripts/verify.sh"],
        cwd=app_repo,
        capture_output=True,
        check=False,
        text=True,
        timeout=60,
    )

    assert result.returncode == 0, result.stdout + result.stderr


def test_given_starter_repository_then_secrets_and_virtualenv_are_ignored(
    app_repo: Path,
) -> None:
    ignore = (app_repo / ".gitignore").read_text()

    assert ".venv/" in ignore
    assert ".env" in ignore
    assert (app_repo / ".env.example").exists()

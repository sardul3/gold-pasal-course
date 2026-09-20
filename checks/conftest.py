from collections.abc import Iterator
import os
from pathlib import Path
from subprocess import CompletedProcess, run

import httpx
import pytest


def pytest_addoption(parser: pytest.Parser) -> None:
    parser.addoption("--app-repo", action="store", default="../gold-pasal")
    parser.addoption("--base-url", action="store", default="http://localhost:8000")


@pytest.fixture
def app_repo(request: pytest.FixtureRequest) -> Path:
    path = Path(request.config.getoption("--app-repo")).expanduser().resolve()
    if not (path / "pyproject.toml").exists():
        pytest.fail(f"--app-repo does not contain pyproject.toml: {path}")
    return path


@pytest.fixture
def run_app(app_repo: Path):
    def invoke(*arguments: str) -> CompletedProcess[str]:
        return run(
            ["uv", "run", *arguments],
            cwd=app_repo,
            capture_output=True,
            check=False,
            text=True,
            timeout=30,
        )

    return invoke


@pytest.fixture
def api(request: pytest.FixtureRequest) -> Iterator[httpx.Client]:
    with httpx.Client(
        base_url=request.config.getoption("--base-url"),
        timeout=5,
    ) as client:
        yield client


@pytest.fixture
def staff_headers() -> dict[str, str]:
    token = os.getenv("GOLD_PASAL_STAFF_TOKEN")
    return {} if token is None else {"Authorization": f"Bearer {token}"}


@pytest.fixture
def customer_headers() -> dict[str, str]:
    token = os.getenv("GOLD_PASAL_CUSTOMER_TOKEN")
    return {} if token is None else {"Authorization": f"Bearer {token}"}

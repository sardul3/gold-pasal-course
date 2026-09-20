import json
from pathlib import Path
from subprocess import run


def test_given_container_release_when_built_then_runtime_is_non_root(
    app_repo: Path,
) -> None:
    tag = "gold-pasal:course-acceptance"
    built = run(
        ["docker", "build", "--tag", tag, "."],
        cwd=app_repo,
        capture_output=True,
        check=False,
        text=True,
        timeout=180,
    )
    assert built.returncode == 0, built.stdout + built.stderr
    inspected = run(
        ["docker", "image", "inspect", tag],
        capture_output=True,
        check=False,
        text=True,
        timeout=30,
    )
    assert inspected.returncode == 0, inspected.stdout + inspected.stderr
    config = json.loads(inspected.stdout)[0]["Config"]

    assert config["User"] not in {"", "0", "root"}
    assert all("SECRET=" not in value and "PASSWORD=" not in value for value in config["Env"])


def test_given_compose_stack_when_rendered_then_configuration_is_valid(
    app_repo: Path,
) -> None:
    result = run(
        ["docker", "compose", "config", "--quiet"],
        cwd=app_repo,
        capture_output=True,
        check=False,
        text=True,
        timeout=30,
    )

    assert result.returncode == 0, result.stdout + result.stderr

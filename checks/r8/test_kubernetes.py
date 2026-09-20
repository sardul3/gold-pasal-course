from pathlib import Path
from subprocess import run

import yaml


def _documents(app_repo: Path) -> list[dict]:
    result = run(
        ["kubectl", "kustomize", "deploy/overlays/homelab"],
        cwd=app_repo,
        capture_output=True,
        check=False,
        text=True,
        timeout=30,
    )
    assert result.returncode == 0, result.stdout + result.stderr
    return [document for document in yaml.safe_load_all(result.stdout) if document]


def test_given_homelab_overlay_then_workload_has_operational_safety(
    app_repo: Path,
) -> None:
    deployment = next(
        document for document in _documents(app_repo) if document["kind"] == "Deployment"
    )
    pod_spec = deployment["spec"]["template"]["spec"]
    container = pod_spec["containers"][0]

    assert container["readinessProbe"] != container["livenessProbe"]
    assert container["startupProbe"]
    assert container["resources"]["requests"]
    assert container["resources"]["limits"]
    assert container["securityContext"]["runAsNonRoot"] is True
    assert pod_spec["securityContext"]


def test_given_committed_manifests_then_no_plaintext_secret_values_exist(
    app_repo: Path,
) -> None:
    for document in _documents(app_repo):
        if document["kind"] == "Secret":
            assert not document.get("data")
            assert not document.get("stringData")

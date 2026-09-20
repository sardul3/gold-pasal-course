import base64
import json
import os
from pathlib import Path
from subprocess import run
from urllib.request import urlopen

import yaml


def _image_subject() -> tuple[str, str]:
    image_ref = os.getenv("GOLD_PASAL_IMAGE_REF", "")
    name, separator, digest = image_ref.partition("@sha256:")
    assert separator and len(digest) == 64, (
        "Set GOLD_PASAL_IMAGE_REF to registry/name@sha256:<64 hex characters>"
    )
    return name, digest


def _provenance_statement(path: Path) -> dict:
    document = json.loads(path.read_text())
    if "payload" not in document:
        return document
    payload = base64.b64decode(document["payload"])
    return json.loads(payload)


def test_given_published_artifact_then_image_is_addressed_by_immutable_digest(
) -> None:
    name, digest = _image_subject()
    image_ref = f"{name}@sha256:{digest}"
    inspected = run(
        ["docker", "buildx", "imagetools", "inspect", image_ref],
        capture_output=True,
        check=False,
        text=True,
        timeout=60,
    )

    assert inspected.returncode == 0, inspected.stdout + inspected.stderr


def test_given_delivery_evidence_then_sbom_describes_the_release() -> None:
    name, digest = _image_subject()
    sbom_path = Path(os.getenv("GOLD_PASAL_SBOM_PATH", ""))
    assert sbom_path.is_file(), "Set GOLD_PASAL_SBOM_PATH to the downloaded CI artifact"
    sbom = json.loads(sbom_path.read_text())

    if sbom.get("spdxVersion"):
        described_ids = set(sbom.get("documentDescribes", []))
        subjects = [
            package
            for package in sbom.get("packages", [])
            if package.get("SPDXID") in described_ids
        ]
    else:
        assert sbom.get("bomFormat") == "CycloneDX"
        subjects = [sbom.get("metadata", {}).get("component", {})]
    assert subjects, "SBOM must identify its root image component"
    subject = json.dumps(subjects)
    assert name.rsplit("/", 1)[-1] in subject
    assert digest in subject


def test_given_delivery_evidence_then_provenance_names_the_promoted_digest() -> None:
    name, digest = _image_subject()
    provenance_path = Path(os.getenv("GOLD_PASAL_PROVENANCE_PATH", ""))
    assert provenance_path.is_file(), (
        "Set GOLD_PASAL_PROVENANCE_PATH to the downloaded provenance artifact"
    )
    statement = _provenance_statement(provenance_path)
    subjects = statement.get("subject", [])

    assert any(
        subject.get("name") == name
        and subject.get("digest", {}).get("sha256") == digest
        for subject in subjects
    )


def test_given_homelab_promotion_then_rendered_state_uses_the_approved_digest(
    app_repo: Path,
) -> None:
    name, digest = _image_subject()
    image_ref = f"{name}@sha256:{digest}"
    rendered = run(
        ["kubectl", "kustomize", "deploy/overlays/homelab"],
        cwd=app_repo,
        capture_output=True,
        check=False,
        text=True,
        timeout=30,
    )
    assert rendered.returncode == 0, rendered.stdout + rendered.stderr
    assert image_ref in rendered.stdout


def test_given_private_homelab_then_argocd_pulls_reviewed_state(app_repo: Path) -> None:
    applications = [
        document
        for path in (app_repo / "deploy/argocd").glob("*.yaml")
        for document in yaml.safe_load_all(path.read_text())
        if document
    ]
    application = next(document for document in applications if document["kind"] == "Application")

    assert application["spec"]["source"]["path"] == "deploy/overlays/homelab"
    assert application["spec"]["syncPolicy"]["automated"]["prune"] is True


def test_given_promoted_release_then_running_pod_and_health_match_evidence() -> None:
    _, digest = _image_subject()
    pods = run(
        [
            "kubectl",
            "get",
            "pods",
            "-l",
            "app=gold-pasal-api",
            "-o",
            "json",
        ],
        capture_output=True,
        check=False,
        text=True,
        timeout=30,
    )
    assert pods.returncode == 0, pods.stdout + pods.stderr
    pod_document = json.loads(pods.stdout)
    image_ids = [
        status["imageID"]
        for item in pod_document["items"]
        for status in item["status"].get("containerStatuses", [])
    ]
    assert image_ids and all(digest in image_id for image_id in image_ids)

    deployed_url = os.getenv("GOLD_PASAL_DEPLOYED_URL", "").rstrip("/")
    assert deployed_url.startswith("https://"), "Set GOLD_PASAL_DEPLOYED_URL to the HTTPS ingress"
    with urlopen(f"{deployed_url}/health", timeout=10) as response:
        assert response.status == 200
        assert response.headers["X-Gold-Pasal-Image-Digest"] in {
            digest,
            f"sha256:{digest}",
        }

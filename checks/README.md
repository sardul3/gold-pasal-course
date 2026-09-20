# External release checks

These checks belong to the course, not the learner application. They observe public commands, HTTP contracts, container artifacts, Kubernetes manifests, and MCP behavior without importing private helpers.

The learner still writes:

- the failing unit, slice, integration, contract, and evaluation tests taught by each lesson
- every production implementation
- migrations, images, manifests, ADRs, and runbooks

## Run a release gate

From `~/dev/gold-pasal`:

```bash
uv run --project ../gold-pasal-course/checks \
  pytest ../gold-pasal-course/checks/r1 \
  --app-repo "$PWD"
```

HTTP releases expect the learner’s API to be running:

```bash
uv run gold-pasal-api

uv run --project ../gold-pasal-course/checks \
  pytest ../gold-pasal-course/checks/r3 \
  --app-repo "$PWD" \
  --base-url http://localhost:8000
```

Authenticated checks read `GOLD_PASAL_STAFF_TOKEN` and `GOLD_PASAL_CUSTOMER_TOKEN`. Never commit those values.

R9 additionally reads:

- `GOLD_PASAL_IMAGE_REF`: the promoted `registry/name@sha256:…` reference
- `GOLD_PASAL_SBOM_PATH`: downloaded SPDX or CycloneDX JSON for that digest
- `GOLD_PASAL_PROVENANCE_PATH`: downloaded provenance for that digest
- `GOLD_PASAL_DEPLOYED_URL`: the HTTPS homelab ingress used by the smoke check

## Contract boundary

Checks may require a documented public path, command, status code, or protocol schema. They must not require a class name, internal package layout, ORM choice, or private helper. A release check that can pass while the customer-visible invariant is broken is incomplete.

from uuid import uuid4

import httpx


def test_given_running_service_when_health_is_requested_then_contract_is_visible(
    api: httpx.Client,
) -> None:
    health = api.get("/health")
    schema = api.get("/openapi.json")

    assert health.status_code == 200
    assert health.json()["service"] == "gold-pasal"
    assert schema.status_code == 200
    assert "/api/catalog/items" in schema.json()["paths"]


def test_given_valid_catalog_item_when_created_then_filter_can_find_it(
    api: httpx.Client,
    staff_headers: dict[str, str],
) -> None:
    sku = f"GP-RING-{uuid4().hex[:8].upper()}"
    created = api.post(
        "/api/catalog/items",
        headers=staff_headers,
        json={
            "sku": sku,
            "name": "Sajilo 22K Ring",
            "metal": "gold",
            "karat": 22,
            "weight_grams": "5.20",
        },
    )
    listed = api.get("/api/catalog/items", params={"karat": 22, "limit": 20})

    assert created.status_code == 201, created.text
    assert listed.status_code == 200, listed.text
    assert any(item["sku"] == sku for item in listed.json()["items"])


def test_given_invalid_purity_when_created_then_problem_details_explains_failure(
    api: httpx.Client,
    staff_headers: dict[str, str],
) -> None:
    response = api.post(
        "/api/catalog/items",
        headers=staff_headers,
        json={
            "sku": f"GP-RING-{uuid4().hex[:8].upper()}",
            "name": "Invalid purity ring",
            "metal": "gold",
            "karat": 19,
            "weight_grams": "5.20",
        },
    )

    assert response.status_code == 422
    assert response.headers["content-type"].startswith("application/problem+json")
    assert {"type", "title", "status", "detail"}.issubset(response.json())

from uuid import uuid4

import httpx


def test_given_authenticated_hold_when_checkout_replays_then_order_is_not_duplicated(
    api: httpx.Client,
    staff_headers: dict[str, str],
    customer_headers: dict[str, str],
) -> None:
    assert "Authorization" in staff_headers, "Set GOLD_PASAL_STAFF_TOKEN"
    assert "Authorization" in customer_headers, "Set GOLD_PASAL_CUSTOMER_TOKEN"
    suffix = uuid4().hex[:8].upper()
    stock_item_id = f"GP-B-{suffix}"

    seeded = api.post(
        "/api/inventory/items",
        headers=staff_headers,
        json={"stock_item_id": stock_item_id, "sku": f"GP-BANGLE-{suffix}"},
    )
    assert seeded.status_code == 201, seeded.text
    held = api.post(
        "/api/inventory/holds",
        headers=customer_headers,
        json={"stock_item_id": stock_item_id, "ttl_seconds": 900},
    )
    assert held.status_code == 201, held.text

    idempotency_key = f"checkout-{suffix}"
    request = {
        "hold_id": held.json()["hold_id"],
        "payment_reference": f"stub-{suffix}",
    }
    headers = {**customer_headers, "Idempotency-Key": idempotency_key}
    first = api.post("/api/orders", headers=headers, json=request)
    replay = api.post("/api/orders", headers=headers, json=request)

    assert first.status_code == 201, first.text
    assert replay.status_code in {200, 201}, replay.text
    assert replay.json()["order_id"] == first.json()["order_id"]


def test_given_customer_token_when_staff_write_is_attempted_then_it_is_forbidden(
    api: httpx.Client,
    customer_headers: dict[str, str],
) -> None:
    assert "Authorization" in customer_headers, "Set GOLD_PASAL_CUSTOMER_TOKEN"
    response = api.post(
        "/api/inventory/items",
        headers=customer_headers,
        json={"stock_item_id": "GP-N-DENIED", "sku": "GP-NECKLACE-DENIED"},
    )

    assert response.status_code == 403
    assert response.json()["type"].endswith("/forbidden")

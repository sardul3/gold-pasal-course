from concurrent.futures import ThreadPoolExecutor
from uuid import uuid4

import httpx


def test_given_one_physical_item_when_holds_race_then_exactly_one_commits(
    api: httpx.Client,
    staff_headers: dict[str, str],
    customer_headers: dict[str, str],
) -> None:
    suffix = uuid4().hex[:8].upper()
    stock_item_id = f"GP-N-{suffix}"
    seeded = api.post(
        "/api/inventory/items",
        headers=staff_headers,
        json={"stock_item_id": stock_item_id, "sku": f"GP-NECKLACE-{suffix}"},
    )
    assert seeded.status_code == 201, seeded.text

    def create_hold() -> httpx.Response:
        return api.post(
            "/api/inventory/holds",
            headers=customer_headers,
            json={"stock_item_id": stock_item_id, "ttl_seconds": 900},
        )

    with ThreadPoolExecutor(max_workers=2) as executor:
        responses = list(executor.map(lambda _: create_hold(), range(2)))

    statuses = sorted(response.status_code for response in responses)
    assert statuses == [201, 409]
    conflict = next(response for response in responses if response.status_code == 409)
    assert conflict.json()["type"].endswith("/reservation-conflict")

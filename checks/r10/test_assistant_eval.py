import httpx


def test_given_known_sku_when_assistant_answers_then_claim_is_grounded(
    api: httpx.Client,
) -> None:
    response = api.post(
        "/api/assistant/answers",
        json={"question": "Is GP-RING-001 22K? Cite the catalog record."},
    )

    assert response.status_code == 200, response.text
    answer = response.json()
    assert answer["grounded"] is True
    assert answer["sources"]
    assert any(source["record_id"] == "GP-RING-001" for source in answer["sources"])
    assert answer["prompt_version"]
    assert answer["model"]


def test_given_unknown_product_when_assistant_answers_then_it_admits_missing_evidence(
    api: httpx.Client,
) -> None:
    response = api.post(
        "/api/assistant/answers",
        json={"question": "Is GP-NOT-REAL available today?"},
    )

    assert response.status_code == 200, response.text
    answer = response.json()
    assert answer["grounded"] is False
    assert answer["sources"] == []
    assert any(
        phrase in answer["answer"].lower()
        for phrase in ("do not know", "don't know", "cannot verify", "no catalog")
    )

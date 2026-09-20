import httpx


def test_given_request_id_when_health_is_called_then_response_preserves_trace_key(
    api: httpx.Client,
) -> None:
    response = api.get("/health", headers={"X-Request-ID": "acceptance-trace-42"})

    assert response.status_code == 200
    assert response.headers["x-request-id"] == "acceptance-trace-42"


def test_given_missing_record_when_requested_then_failure_is_safe_problem_details(
    api: httpx.Client,
) -> None:
    response = api.get("/api/catalog/items/GP-DOES-NOT-EXIST")

    assert response.status_code == 404
    assert response.headers["content-type"].startswith("application/problem+json")
    problem = response.json()
    assert problem["status"] == 404
    assert "traceback" not in response.text.lower()
    assert "request_id" in problem


def test_given_openapi_contract_then_operational_endpoints_are_separate(
    api: httpx.Client,
) -> None:
    paths = api.get("/openapi.json").json()["paths"]

    assert "/health" in paths
    assert "/ready" in paths

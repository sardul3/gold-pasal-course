---
title: "R3 — API-first catalog"
description: "A documented FastAPI catalog contract with stable errors and tests."
---

# R3 — API-first catalog

**Release promise:** A documented FastAPI catalog contract with stable errors and tests.

<LessonMission
  role="catalog manager"
  problem="Staff and future clients need a stable way to create and find catalog items."
  destination="The documented HTTP contract validates input and returns consistent success and failure shapes."
/>

## Lessons

1. [Follow an HTTP request from client to response](01-follow-an-http-request-from-client-to-response)
2. [Design the catalog contract in OpenAPI before FastAPI code](02-design-the-catalog-contract-in-openapi-before-fastapi-code)
3. [Create the FastAPI application and health endpoint](03-create-the-fastapi-application-and-health-endpoint)
4. [Validate request and response data with Pydantic v2](04-validate-request-and-response-data-with-pydantic-v2)
5. [Add products with SKU, metal, purity, weight, and price inputs](05-add-products-with-sku-metal-purity-weight-and-price-inputs)
6. [Retrieve and list products with filtering, sorting, and pagination](06-retrieve-and-list-products-with-filtering-sorting-and-pagination)
7. [Return consistent Problem Details for expected failures](07-return-consistent-problem-details-for-expected-failures)
8. [Separate HTTP schemas from domain objects](08-separate-http-schemas-from-domain-objects)
9. [Inject repositories and services through explicit dependencies](09-inject-repositories-and-services-through-explicit-dependencies)
10. [Test routes in-process with HTTPX](10-test-routes-in-process-with-httpx)
11. [Detect accidental API changes with contract checks](11-detect-accidental-api-changes-with-contract-checks)
12. [Release gate: demo the API from docs, curl, and tests](12-release-gate-demo-the-api-from-docs-curl-and-tests)

## Release evidence

Run `uv run pytest tests/http -q` and preserve an OpenAPI diff, HTTP tests, and a curl transcript. At the review, defend this
invariant: **transport validation cannot bypass domain invariants or leak stack traces.**

<ArchitectureTrail
  before="Staff and future clients need a stable way to create and find catalog items."
  decision="Introduce only the boundary and mechanism needed by this release."
  after="The documented HTTP contract validates input and returns consistent success and failure shapes."
/>

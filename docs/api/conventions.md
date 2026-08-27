# REST API Conventions

**Status:** Accepted

## OpenAPI and Swagger

OpenAPI is the canonical machine-readable description of implemented Backend HTTP contracts, and Swagger UI is the canonical interactive documentation mechanism. The generated document must describe, where applicable, endpoint paths and methods, route and query parameters, request and response DTO schemas, relevant status codes, authentication and useful authorization requirements, stable API-visible error codes, and file-upload requirements.

OpenAPI output and examples must never expose secrets, credentials, tokens, environment variables, internal stack traces, or sensitive implementation details.

Swagger is available in development at a predictable route so developers can inspect and exercise documented services. `/api/docs` is the conceptual default until the API foundation selects a route consistent with the application prefix. Swagger must not be anonymously or publicly accessible in production. The exact production protection mechanism is **Open until deployment/security planning**; until an approved control is configured, production Swagger remains unavailable. See [ADR 0012](../architecture/adr/0012-use-openapi-swagger-for-api-documentation.md).

Any task that creates, removes, or changes an HTTP API contract updates Swagger/OpenAPI within that same task. Its task context declares **Swagger / OpenAPI Impact** as creating documentation, changing documentation, or having no documentation impact, as applicable; API-changing tasks add contract-specific Acceptance Criteria and Validation. The task is not Done until the generated documentation matches actual behavior and no documentation made stale by the change remains. This includes changes to endpoints, methods, parameters, DTOs, status codes, authentication, authorization, and API-visible errors.

Feature specifications own required observable behavior; this document owns general API/OpenAPI conventions; backend architecture and standards own implementation discipline. Swagger/OpenAPI is the generated interactive representation of the implemented contract. Do not duplicate complete endpoint specifications across unrelated documents, and do not load this context for work with no Backend HTTP API impact.

## URLs and operations

- Public REST endpoints begin with `/api/v1`.
- Use lowercase plural resource nouns and stable identifiers; use nested routes only when the child cannot be understood independently.
- `GET` reads, `POST` creates or invokes a non-idempotent command, `PUT` replaces when supported, `PATCH` partially updates, and `DELETE` removes/archives according to documented lifecycle.
- Do not encode verbs in resource URLs unless modeling an explicit command is clearer than false CRUD.

## Status codes

Use `200` for successful reads/updates, `201` for creation (with `Location` where useful), `204` for a successful response with no body, `400` for malformed requests, `401` for authentication failures identified by stable codes, `403` for authenticated but forbidden access, `404` for unavailable resources, `409` for state/uniqueness conflicts, `422` for semantically invalid input if adopted consistently, `429` for rate limits, and `5xx` for server failures. Resource-existence disclosure may require security-specific behavior.

## Collections

List endpoints use bounded pagination with a documented default/maximum. The initial choice between page/limit and cursor pagination is open per stability and scale needs. Responses include items and useful pagination metadata. Filters use explicit query fields; sorting uses allowlisted fields and deterministic tie-breaking, for example `sort=-createdAt,name`. Reject unsupported or unsafe parameters consistently.

## Contracts and errors

Use explicit request and response DTOs. Dates use ISO 8601 with timezone semantics; money must use a reviewed precision/currency representation, never implicit binary floats.

The initial error envelope is top-level and consistent:

```json
{
  "statusCode": 403,
  "code": "INSUFFICIENT_PERMISSION",
  "message": "شما دسترسی لازم برای انجام این عملیات را ندارید.",
  "details": []
}
```

`code` is a stable machine-readable English identifier such as `ACCESS_TOKEN_EXPIRED`, `INVALID_ACCESS_TOKEN`, `ACCOUNT_DISABLED`, `AUTHENTICATION_REQUIRED`, `REFRESH_TOKEN_INVALID`, `REFRESH_TOKEN_EXPIRED`, `REFRESH_TOKEN_REUSED`, or `INSUFFICIENT_PERMISSION`. A message intended for frontend display is Persian. Silent recovery such as `ACCESS_TOKEN_EXPIRED` needs no user-visible message. `REFRESH_TOKEN_REUSED` may carry a safe Persian re-authentication message but never technical security details. For silent internal authentication events, `message` may be empty, `null`, or omitted once the final serialization convention is chosen. `details` is optional. Responses never expose stack traces, SQL, tokens, cookies, or sensitive internals. OpenAPI documents approved endpoints and examples.

Only `401 ACCESS_TOKEN_EXPIRED` is eligible for silent reactive refresh. Other `401` codes require their documented cleanup/login behavior, and `403` never triggers refresh. See [authentication architecture](../security/authentication.md).

## Reliability and evolution

Appropriate retriable writes should accept an idempotency key with documented scope, expiry, fingerprint, concurrency, and replay response. The accepted minimum backend baseline carries or generates a request/correlation identifier that contains no sensitive data. Cross-service propagation, distributed tracing, and advanced telemetry remain future considerations. Breaking changes require an explicit version/evolution plan; adding fields should not break tolerant clients.

See [backend architecture](../architecture/backend-architecture.md), [authentication](../security/authentication.md), and [testing](../standards/testing.md).

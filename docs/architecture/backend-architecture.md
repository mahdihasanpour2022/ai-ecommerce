# Backend Architecture

## Shape

The Backend API is a strict-TypeScript NestJS Modular Monolith at `apps/api`. It contains the root application boundary, Admin authentication module, and catalog module with implemented protected Category, Product, Product Variant, Inventory, Product Image, and global price-display-setting contracts plus controlled public Image content and the setting's public read. Broader public catalog, order, and customer capabilities are added only by their approved tasks; this architecture is not a directive to create empty modules.

Each implemented module owns a cohesive capability and exposes narrow interfaces. NestJS dependency injection wires explicit dependencies; circular module relationships are a design signal. Use pragmatic domain modeling—do not add aggregates, generic repositories, or other DDD layers solely for pattern purity.

## Request flow and responsibilities

- **Controllers** translate HTTP input/output and remain thin.
- **DTOs/pipes** define and validate every external input; validation must reject or deliberately transform unknown/invalid data.
- **Guards/policies** authenticate and authorize before protected behavior.
- **Services/domain code** own business rules and orchestration.
- **Persistence adapters/Prisma access** execute intentional queries without leaking storage models into public contracts.
- **Exception handling** maps expected failures to the consistent API envelope; stack traces and sensitive internals never reach clients.

Frontend authorization is never trusted. Protected operations are enforced server-side, preferably default-deny, at the resource/action granularity required by the feature. Database entities must not be blindly serialized as responses; explicit response contracts reduce accidental disclosure and coupling.

## API documentation foundation

The NestJS application generates an OpenAPI description and exposes Swagger UI at `/api/docs` in development and test. Implemented authentication and Category/Product/Variant/Inventory/Product-Image/price-display-setting controllers publish their protected or explicit public contracts under `/api/v1`; each later module adds matching documentation with its controller and DTO implementation. Swagger maintenance is never deferred to a post-feature cleanup task. Production Swagger and generated document routes are unavailable unless protected by an explicitly approved access control, whose exact mechanism remains Open until deployment/security planning. Detailed content and completion rules live in [API conventions](../api/conventions.md) and the accepted [OpenAPI/Swagger ADR](adr/0012-use-openapi-swagger-for-api-documentation.md).

## Data integrity and integrations

Use transactions for atomic multi-step writes and define behavior for conflicts, retries, and external side effects. Keep transactions bounded. External integrations sit behind purpose-specific interfaces and define timeouts, safe retry/idempotency behavior, credential handling, and degradation. Do not hold database transactions open across unreliable network calls without a reviewed design.

The minimum observability baseline is structured logs, a request/correlation identifier, health/readiness capability, and useful error logging without secrets, tokens, cookies, or sensitive payloads. Validation, exception, logging, and OpenAPI behavior should be centralized consistently without hiding domain decisions. Prometheus, Grafana, complex tracing, and distributed telemetry are deferred until concrete operational requirements justify them.

See [backend standards](../standards/backend.md), [database](database.md), [authorization](../security/authorization.md), and the [security baseline](../security/baseline.md).

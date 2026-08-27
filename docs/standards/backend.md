# Backend Standards

- Preserve domain module boundaries; dependencies flow through explicit interfaces and do not bypass module ownership casually.
- Keep controllers thin and business rules in services/domain code.
- Validate and normalize all external input. Define explicit output contracts rather than exposing Prisma/database records blindly.
- Enforce authentication and authorization server-side with default-deny behavior for protected operations.
- Map errors to consistent safe responses; never expose stack traces, SQL, secrets, tokens, or sensitive internals.
- Use transactions for atomic multi-step writes; document isolation, retry, and external-side-effect implications where relevant.
- Emit structured, actionable logs with appropriate severity and context. Redact credentials, security-sensitive fields, personal data, and payloads by default.
- Carry or generate a request/correlation identifier and provide lightweight health/readiness behavior. Do not add a full telemetry stack without a concrete requirement.
- Consider idempotency for retried or financially/operationally sensitive writes; document the key scope and replay response.
- List endpoints must have bounded pagination. Filtering and sorting use allowlisted fields and deterministic ordering.
- Avoid N+1 queries, unbounded reads, and over-fetching. Review indexes/query plans for critical paths.
- Avoid raw SQL unless Prisma cannot safely or efficiently express the operation; justify, parameterize, review, and test it.
- Migrations must be human-reviewed before application, including data-loss, lock, compatibility, and recovery risk.
- State-changing cookie-authenticated browser requests require session-bound CSRF validation. Safe methods must not change state.
- Uploaded images are limited to approved WebP, JPEG/JPG, and PNG; uploaded SVG is forbidden. Follow the complete validation and storage requirements in the [security baseline](../security/baseline.md).
- Define timeouts and safe retry policies for integrations. Never retry non-idempotent operations blindly.

## API documentation definition of done

For any task that creates, removes, or changes a Backend HTTP API contract:

- `current.md` declares **Swagger / OpenAPI Impact** and includes contract-specific Acceptance Criteria and Validation.
- Swagger/OpenAPI is updated within the implementation task, not as later cleanup.
- Before the task moves to Done, verify the implementation meets its Acceptance Criteria, relevant checks pass, generated documentation matches the implemented path, method, parameters, DTOs, statuses, security requirements, and API-visible errors, and no documentation made stale by the task remains.
- Incomplete or inaccurate required Swagger/OpenAPI documentation blocks Done and prevents archival to `done.md`.

Tasks with no Backend HTTP API impact do not require Swagger/OpenAPI context or criteria. Detailed documentation content and exposure rules are canonical in [API conventions](../api/conventions.md).

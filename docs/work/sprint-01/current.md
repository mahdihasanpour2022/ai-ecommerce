# Current Task

## Task ID

S1-T05

## Title

Implement Backend Authentication and Login

## Status

Current

## Goal

Implement the backend Admin login contract: enumeration-safe credential/status/eligibility validation, accepted throttling, atomic session and initial credential creation, secure cookie issuance, CSRF bootstrap response, and matching Swagger/OpenAPI documentation.

## Why

The persisted Admin identity and trusted bootstrap command do not yet provide a browser authentication path. The Admin application needs one security-reviewed login endpoint that establishes the accepted server-authoritative session boundary without exposing identity state, credentials, or authorization claims.

## Required Context

The following is the Minimum Sufficient **Required Context** for this task:

- `docs/sprints/sprint-01.md`
- `docs/features/admin-auth/specification.md`
- `docs/security/authentication.md`
- `docs/security/authorization.md`
- `docs/security/baseline.md`
- `docs/work/sprint-01/s1-t02-schema-proposal.md`
- `docs/api/conventions.md`
- `docs/architecture/backend-architecture.md`
- `docs/development/prisma.md`
- `docs/environment.md`
- `docs/standards/backend.md`
- `docs/standards/testing.md`
- `docs/standards/execution.md`

This set owns the observable login/error contract, credential/cookie/JWT/session/throttle rules, authoritative RBAC lookup, persistence transactions, backend/OpenAPI conventions, environment inputs, and security-focused validation. Refresh rotation, general CSRF middleware, protected access, frontend behavior, and later endpoint implementation details are excluded except where the login response must establish their accepted initial credentials.

## Scope

- Add the Admin authentication module/controller/service/repository boundary required for `POST /api/v1/auth/login` only.
- Accept and validate the explicit JSON request `{ email, password }`; normalize email consistently without logging submitted identifiers or credentials.
- Enforce the accepted unauthenticated login Origin/Referer and Fetch Metadata boundary plus exact credentialed CORS behavior needed for the implemented route.
- Apply the accepted durable HMAC-keyed account/identifier throttle and single-instance process-local IP throttle, including configurable windows/delays, generic `429 AUTH_RATE_LIMITED`, `Retry-After`, safe concurrency, and reset after success.
- Perform materially equivalent Argon2id verification work for unknown identity, wrong password, disabled identity, and missing `admin.access`; return the same `401 INVALID_CREDENTIALS` contract and create no credential state for every failure.
- Rehash a successful password when approved Argon2 parameters have changed.
- On success, atomically create one `AuthSession`, its refresh-throttle row, one initial hashed opaque `RefreshToken`, and the 32-byte hash of a random session-bound CSRF token with the accepted fixed absolute expiry.
- Sign the Access JWT with the configured active Ed25519 key and exact approved header/claims; include identity/session claims only, never Roles/Permissions.
- Issue host-only HttpOnly Access and Refresh cookies with the accepted environment-aware `Secure`, `SameSite=Lax`, `/` path, expiry, and no `Domain`; return only `{ csrfToken }` with `Cache-Control: no-store`.
- Add stable safe error handling, focused unit/integration/API/e2e coverage, and generated Swagger/OpenAPI documentation for the exact implemented contract.
- Reconcile only configuration and documentation made stale by the login implementation.

## Out of Scope

- Refresh rotation/recovery/reuse handling, logout, `/auth/csrf`, `/auth/me`, protected-route guards, general unsafe-method CSRF middleware, disabled-session enforcement, or frontend behavior.
- Role/Permission administration, additional permissions, Customer authentication, password reset/change, MFA, SSO, social login, or security-event persistence.
- Distributed IP throttling, Redis, production secret-provider integration, public JWKS, Bearer authentication, authorization claims in JWTs, or a BFF.
- Schema/migration changes, cleanup scheduling, deployment operations, or S1-T06 and later implementation.

## Proposed HTTP Contract

- `POST /api/v1/auth/login`
- Request JSON: `{ email: string, password: string }`
- Success: `200`, response `{ csrfToken: string }`, Access and Refresh `Set-Cookie` headers, and `Cache-Control: no-store`
- Invalid DTO/origin/metadata: safe `400`/`403` contracts as applicable without credential processing or identity disclosure
- Authentication failure: `401 INVALID_CREDENTIALS` with the accepted generic Persian message and consistent envelope
- Throttled: `429 AUTH_RATE_LIMITED` with the accepted generic Persian message and `Retry-After`
- Unexpected failure: safe `5xx` envelope with no credential, key, SQL, stack, or internal detail

## Expected Changes

- Focused API authentication module/controller/service/persistence/security utilities and DTOs
- API environment validation and safe `.env.example` placeholders for implemented non-secret/key-shape contracts only
- Focused unit, PostgreSQL integration, and HTTP/API tests plus OpenAPI contract-drift assertions
- `apps/api/package.json` and `yarn.lock` only after separate approval of an exact JOSE dependency/version
- Narrow API/authentication/environment/onboarding documentation and Sprint execution records

## Architecture Impact

Adds the first runtime business module inside the existing NestJS Modular Monolith. Prisma remains adapter-backed and API-owned; login orchestration is separated from HTTP DTO/cookie handling, cryptographic utilities, and persistence transactions so later refresh/protected-access tasks can reuse accepted boundaries without premature generalization.

## Swagger / OpenAPI Impact

Creates documentation for `POST /api/v1/auth/login`, including request/response DTOs, cookie effects, no-store handling, `200`, validation/security failures, `401 INVALID_CREDENTIALS`, `429 AUTH_RATE_LIMITED` plus `Retry-After`, safe `5xx`, and secret-free examples. Swagger must match tested behavior before Done.

## Database / Prisma Impact

No schema or migration change. Login reads Admin/RBAC/throttle state and atomically inserts an `AuthSession`, `AuthSessionRefreshThrottle`, and initial `RefreshToken`; successful account-throttle reset participates in the accepted transaction boundary where required. Failed/throttled attempts must not create partial session/token rows.

## Security Impact

Security-critical. The implementation handles plaintext passwords, signing/recovery-independent key material, random browser credentials, credentialed cookies, submitted identifiers, enumeration resistance, brute-force throttling, login CSRF/origin defense, and transactional session creation. Secrets and identifiers must not reach logs, errors, OpenAPI examples, source defaults, snapshots, URLs, or frontend-readable token fields.

## Constraints

- Preserve the accepted S1-T01/S1-T02 contracts exactly; surface a required security/API design change as an Open Decision.
- Use installed Prisma/adapter-pg and Argon2 boundaries; do not change schema/migration or add a general repository abstraction without concrete reuse.
- Do not add a JOSE package until its exact package/version and lockfile impact receive explicit owner approval.
- Access JWTs hard-allow EdDSA and configured keys/issuer/audience; headers cannot supply trust material; Roles/Permissions never enter the token.
- Raw refresh/CSRF credentials are random 256-bit values, persisted only as SHA-256 hashes, never logged, and never returned except the CSRF token in the accepted success body.
- Backend eligibility is authoritative; UI state is irrelevant. No default credentials, plaintext fixtures, wildcard origins, arbitrary origin reflection, or permanent account lockout.
- Do not stage, commit, push, migrate, or change unrelated/later-task files.

## Acceptance Criteria

- The tested/generated OpenAPI contract exactly matches `POST /api/v1/auth/login`, its DTO, `200` body/cookies/no-store headers, stable errors/statuses, and `Retry-After` behavior without exposing secrets.
- A valid active Admin with effective `admin.access` receives one absolute-lifetime session, one initial refresh credential, one session throttle row, a valid approved Access JWT cookie, an opaque Refresh cookie, and a memory-bootstrap CSRF token; database rows contain only hashes and no Role/Permission JWT claims.
- Unknown identity, wrong password, disabled Admin, and missing eligibility are materially equivalent `401 INVALID_CREDENTIALS` outcomes with dummy/real Argon2 work, no identity disclosure, and no session/token creation.
- Durable account and process-local IP throttles enforce accepted limits/delays generically and concurrency-safely, return `429 AUTH_RATE_LIMITED` with `Retry-After`, and never permanently lock an account; successful login resets the account bucket.
- Invalid request/origin/fetch-metadata, malformed/untrusted key configuration, signing failure, and transaction failure fail closed without credentials or partial persistence.
- Cookies are host-only HttpOnly, `SameSite=Lax`, path `/`, environment-aware `Secure`, correctly expired, and inaccessible to response JSON; credential-bearing responses are `no-store`.
- Password rehash-on-success, exact JWT header/claims/TTL, random credential length/uniqueness, hash persistence, transaction rollback, concurrency, error redaction, and absence of plaintext material have focused automated coverage.
- API tests, PostgreSQL integration tests, typecheck, lint, build, formatting, Prisma checks, and Swagger/OpenAPI contract-drift validation pass with no unrelated schema/dependency/later-task changes.

## Testing Impact

Automated tests required

Focused unit, database integration, and HTTP/API coverage must exercise success, every enumeration-equivalent failure, validation/origin/metadata rejection, account/IP throttling and `Retry-After`, password rehash, JWT/cookie/CSRF/refresh properties, transaction rollback, concurrent attempts, redacted errors/output, no partial state, and generated OpenAPI parity.

## Validation

- Preflight isolated PostgreSQL test identity/state plus required process-only signing, throttle-HMAC, origin, TTL, and cookie configuration without printing secrets.
- Use Context7/current primary documentation for NestJS, the selected JOSE implementation, Prisma transactions, Argon2 rehash behavior, and Swagger decorators before code changes.
- Validate any proposed dependency/version and lockfile impact, then obtain separate owner approval before installation.
- Run focused unit and disposable-database integration tests plus HTTP/API and OpenAPI contract assertions.
- Inspect stored session/token/CSRF hashes, JWT protected header/claims/signature verification, cookie attributes/expiry, throttle state/reset, no-store responses, and failed-transaction cleanup without emitting usable credentials.
- Run affected API test, typecheck, lint, build, Prisma validate/generate, and repository formatting gates.
- Run local Markdown-link checks, `git diff --check`, secret/log/OpenAPI/fixture scan, dependency/lockfile and schema/migration scope inspection, generated-output-ignore checks, and read-only Git-index inspection.

## Documentation Impact

Document the implemented login contract, cookie names/attributes, required validated configuration, development `Secure` behavior, stable errors, throttle behavior, and remaining unimplemented refresh/CSRF/protected-access boundaries. Do not claim a complete authentication slice before later tasks.

## Open Decision

Select the exact maintained JOSE implementation/version compatible with the repository's Node matrix and Ed25519/EdDSA contract, then obtain explicit owner approval for its API manifest/lockfile change before installation.

## Approval State

Awaiting Implementation Approval

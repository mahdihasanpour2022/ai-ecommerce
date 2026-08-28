# Current Task

## Task ID

S1-T06

## Title

Implement CSRF, Minimum RBAC, and Protected Admin Access

## Status

Current

## Goal

Implement the backend current-session boundary needed after login: Access-cookie validation, authoritative Admin/session and minimum RBAC enforcement, session-bound CSRF validation infrastructure, `GET /api/v1/auth/csrf`, and `GET /api/v1/auth/me`, with exact safe errors and matching Swagger/OpenAPI contracts.

## Why

S1-T05 establishes a browser session but no endpoint can yet validate that session, reload the in-memory CSRF credential, or return current server-authoritative identity/authorization. The Admin frontend and later refresh/logout tasks require these boundaries before protected application access is safe.

## Required Context

The following is the Minimum Sufficient **Required Context** for this task:

- `docs/sprints/sprint-01.md`
- `docs/features/admin-auth/specification.md`
- `docs/security/authentication.md`
- `docs/security/authorization.md`
- `docs/security/baseline.md`
- `docs/api/conventions.md`
- `docs/architecture/backend-architecture.md`
- `docs/work/sprint-01/s1-t02-schema-proposal.md`
- `docs/development/admin-login.md`
- `docs/environment.md`
- `docs/standards/backend.md`
- `docs/standards/testing.md`
- `docs/standards/execution.md`
- `apps/api/src/authentication/`
- `apps/api/prisma/schema.prisma`

This set owns the observable CSRF/current-Admin behavior, Access JWT trust boundary, backend-authoritative status/RBAC rules, implemented login credentials, available persistence fields, error/OpenAPI conventions, and security-focused validation. Refresh rotation, logout, frontend behavior, role administration, and later hardening remain outside this task except where reusable guards must provide their accepted boundary.

## Scope

- Validate the Access cookie with the configured trusted Ed25519 public-key ring, hard-allowed `EdDSA`, exact `typ`, issuer, audience, `kid`, signature, expiry, and required `sub`/`sid`/`jti`/`iat`/`exp` claims; reject token-supplied trust material and malformed/unknown keys.
- Resolve the referenced `AuthSession` and `AdminUser` on every protected operation; enforce active/non-revoked/non-expired session and non-disabled Admin state before authorization.
- Resolve current effective Roles and Permissions from `AdminUserRole -> Role -> RolePermission -> Permission`; require `admin.access` for Admin application access and never treat JWT/frontend claims as authority.
- Implement reusable exact-Origin plus session-bound CSRF validation for unsafe cookie-authenticated requests, with timing-safe hash comparison, safe `403 CSRF_VALIDATION_FAILED`, and no credential logging.
- Implement `GET /api/v1/auth/csrf` using the separately resolved raw-token recovery decision, validating the Refresh cookie/current token and active session without refresh rotation and returning only `{ csrfToken }` with `Cache-Control: no-store`.
- Implement `GET /api/v1/auth/me` returning only `{ admin: { id, email, displayName }, authorization: { roles, permissions } }`, with sorted/deduplicated effective strings and no token/session secret.
- Add stable safe error mapping for missing/expired/invalid Access credentials, disabled Admin, invalid session, CSRF failure, insufficient permission, and unexpected failure without exposing existence or internals.
- Add focused unit, PostgreSQL integration, HTTP/API, JWT/CSRF/RBAC, concurrency/status-change, and OpenAPI contract-drift coverage.
- Reconcile only configuration and documentation made stale by this implementation.

## Out of Scope

- Refresh rotation/recovery/reuse classification, logout, cookie expiry operations, disabled-session cleanup/revocation writes, or S1-T07/S1-T08 behavior.
- Frontend login/bootstrap/protected shell, Axios interceptors, frontend authorization UX, or later Sprint tasks.
- Role/Permission administration, new permissions, authorization caching, Customer authentication, password flows, MFA, SSO, or social login.
- Schema/migration changes until the CSRF raw-token recovery Open Decision is explicitly resolved and any resulting persistence impact separately approved.
- Distributed caches/throttles, Redis, production secret-provider integration, public JWKS, Bearer headers, or authorization claims in JWTs.

## Proposed HTTP Contracts

- `GET /api/v1/auth/csrf`: validate the Refresh cookie/current token and active session without rotation; success `200 { csrfToken }` plus `Cache-Control: no-store`; stable authentication/session failures otherwise.
- `GET /api/v1/auth/me`: validate the Access cookie and current backend state; success `200 { admin, authorization }` with sorted effective Role/Permission strings; stable `401`/`403` failures otherwise.
- Unsafe cookie-authenticated endpoints use exact Origin plus `X-CSRF-Token`; this task establishes the reusable enforcement boundary even though refresh/logout remain later tasks.

## Expected Changes

- Extend the API authentication module with Access-cookie parsing/verification, current-session resolution, authoritative RBAC lookup, CSRF validation, focused Nest guards, `/auth/csrf`, and `/auth/me`.
- Focused DTOs, stable error mapping, cookie/CSRF utilities, and generated OpenAPI documentation.
- Focused unit, PostgreSQL integration, HTTP/API, and contract-drift tests.
- Configuration/schema changes only if explicitly approved after the Open Decision; no dependency change is currently expected.
- Narrow authentication/environment/onboarding and Sprint execution documentation.

## Architecture Impact

Extends the existing NestJS authentication module into the first protected-request boundary. HTTP extraction/error serialization remains separate from JWT/CSRF cryptography and Prisma-backed current-state/RBAC resolution. Backend database state remains authoritative, while reusable guards support later refresh/logout endpoints without premature generalization.

## Swagger / OpenAPI Impact

Creates exact generated documentation for `GET /api/v1/auth/csrf` and `GET /api/v1/auth/me`, including cookie requirements, no-store behavior, response DTOs, stable error/status codes, and secret-free examples. Documents the reusable CSRF header requirement only where an implemented unsafe endpoint consumes it.

## Database / Prisma Impact

Reads existing Admin, Role, Permission, AuthSession, and RefreshToken state. No schema/migration change is currently approved. The Open Decision may require a separately reviewed persistence/configuration change because a one-way CSRF hash cannot reproduce the existing raw token promised by the accepted reload-bootstrap contract.

## Security Impact

Security-critical. This task verifies signed browser credentials, prevents token-header trust injection, rechecks disabled/session/RBAC state before JWT expiry, validates synchronizer CSRF credentials and exact origins, and returns safe identity/authorization data. Raw cookies/tokens, submitted CSRF material, key material, database internals, and sensitive headers must never reach logs, errors, OpenAPI examples, snapshots, or frontend-readable fields beyond the explicitly approved CSRF response.

## Constraints

- Preserve S1-T01 through S1-T05 contracts unless the CSRF Open Decision explicitly changes one; persist that decision before implementation.
- Backend authorization is authoritative. Access JWTs contain no Roles/Permissions, `SUPER_ADMIN` has no bypass, and UI visibility is not enforcement.
- Trust only configured public keys selected by a validated `kid`; hard-allow `EdDSA` and reject token-supplied key URLs/material.
- Cookie authentication remains direct browser-to-API; do not add Bearer handling or a BFF.
- Do not add dependencies, change Prisma schema/migrations, or introduce new secrets without explicit owner approval.
- Do not stage, commit, push, migrate, or change unrelated/later-task files.

## Acceptance Criteria

- Generated OpenAPI exactly matches both implemented GET endpoints, their safe DTOs, cookie/no-store behavior, relevant statuses/stable codes, and secret-free examples.
- A valid Access cookie plus active session/Admin and effective `admin.access` returns only the accepted safe Admin identity and sorted/deduplicated current Roles/Permissions; changing backend status or authorization takes effect before JWT expiry.
- Missing, expired, malformed, wrongly signed, wrong-algorithm/type/issuer/audience, unknown-`kid`, incomplete-claim, and token-supplied-trust Access JWTs fail closed with stable safe errors and no state disclosure.
- Disabled Admin, expired/revoked/mismatched session, and missing `admin.access` are enforced from current database state with the accepted `401`/`403` distinctions.
- The resolved `/auth/csrf` design validates the opaque Refresh cookie/current token and active session without rotating it, returns the correct session-bound token only in a no-store body, and stores/logs/exposes no unauthorized raw credential.
- Unsafe cookie-authenticated CSRF validation requires both an allowed exact Origin and matching session credential, rejects missing/malformed/mismatched values safely and timing-safely, and never treats CORS or Fetch Metadata alone as CSRF authorization.
- Configuration/key failures, database failures, concurrent status/RBAC changes, and unexpected exceptions fail closed without credentials, stale authorization acceptance, partial writes, or internal detail.
- Focused API/unit/PostgreSQL tests, typecheck, lint, build, formatting, Prisma checks, OpenAPI drift validation, security scans, and scope inspection pass without unrelated dependency/schema/later-task changes.

## Testing Impact

Automated tests required.

Focused unit, database integration, and HTTP/API coverage must exercise valid and adversarial JWT headers/claims/signatures, cookie parsing, current session/Admin/RBAC changes, sorted/deduplicated authorization output, Refresh-cookie CSRF bootstrap, exact Origin and CSRF matching, stable errors, no-store/redaction, concurrency, and generated OpenAPI parity.

## Validation

- Preflight the isolated PostgreSQL test database and process-only Ed25519/origin/CSRF configuration without printing secrets.
- Resolve the CSRF raw-token recovery Open Decision and obtain any required schema/configuration approval before code changes in that area.
- Use Context7/current primary documentation for NestJS guards/decorators, JOSE verification, Prisma transactional/current-state queries, and Swagger decorators before implementation.
- Run focused unit, disposable-database integration, HTTP/API, JWT/CSRF/RBAC, and OpenAPI contract tests.
- Inspect current-state enforcement, timing-safe CSRF comparison, response redaction/no-store behavior, and absence of raw token/key persistence or output beyond the approved CSRF body.
- Run affected API tests, typecheck, lint, build, Prisma validate/generate, repository formatting, Markdown links, `git diff --check`, secret scans, dependency/schema/migration scope, generated-output-ignore checks, and read-only Git-index inspection.

## Documentation Impact

Document implemented protected-cookie validation, `/auth/csrf`, `/auth/me`, stable errors, current RBAC/status authority, CSRF usage, and any explicitly approved raw-token recovery/configuration choice. Continue to state that refresh, logout, frontend authentication, and later hardening are unimplemented.

## Open Decision

The accepted schema stores only `AuthSession.csrfTokenHash`, while the accepted `GET /auth/csrf` reload contract says to return the existing raw session-bound CSRF token. SHA-256 is intentionally one-way, so the Backend cannot reproduce that token after login. Before implementation, choose and separately approve one coherent design: persist a narrowly encrypted recoverable CSRF value with reviewed schema/key lifecycle impact, rotate the CSRF token/hash during bootstrap with explicitly revised multi-tab/session semantics, or revise token derivation/configuration while preserving required entropy and separation. No option is silently assumed.

## Approval State

Awaiting Implementation Approval

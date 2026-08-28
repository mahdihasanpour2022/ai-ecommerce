# Current Task

## Task ID

S1-T08

## Title

Implement Logout and Disabled Admin Enforcement

## Status

Current

## Goal

Implement secure current-session logout with exact Origin/CSRF validation, atomic affected-session revocation, recovery-material erasure, deterministic cookie expiry, safe idempotent behavior for the same known session, and matching Swagger/OpenAPI; complete backend verification that disabling an Admin immediately makes every independent session unusable.

## Why

S1-T05 through S1-T07 now establish, protect, and rotate independent browser sessions, but users cannot deliberately end the current session or clear its authentication cookies. Current-state checks already reject disabled Admins; this task closes the logout contract and proves that disabled status applies consistently across every implemented session endpoint without widening logout to other devices.

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
- `docs/standards/backend.md`
- `docs/standards/testing.md`
- `docs/standards/execution.md`
- `apps/api/src/authentication/`
- `apps/api/prisma/schema.prisma`

This set owns current-session versus Admin-wide semantics, existing Access/Refresh/CSRF/current-state behavior, session/token persistence, cookie/error/OpenAPI conventions, and required security validation. Admin management APIs, `logout-all`, frontend logout UX, and later hardening remain outside this task.

## Scope

- Implement `POST /api/v1/auth/logout` with no request body, exact Origin/Referer plus `X-CSRF-Token`, the Refresh cookie, `Cache-Control: no-store`, and exact host-only cookie expiry.
- Resolve a known Refresh-family credential to its owning session, validate the session-bound CSRF hash timing-safely, and revoke only that `AuthSession` plus its Refresh family atomically; erase every recovery-envelope field while preserving prior security timestamps.
- Return idempotent `204` and the same cookie-clearing headers when the same known session credential is repeated with a valid CSRF credential, including already-revoked/expired/disabled state; malformed/unknown credentials cannot establish a CSRF-bound session and fail safely.
- Expire both Access and Refresh cookies with the exact original name/path/host-only/SameSite/HttpOnly/production-Secure attributes, `Max-Age=0`, and a past `Expires`; never expose token values in a response body.
- Ensure disabled Admins can still perform this cleanup when a known session and valid CSRF credential are presented, without allowing disabled state to mint or refresh credentials.
- Verify every independent session for a disabled Admin is rejected immediately by protected access, CSRF bootstrap, and refresh, while normal logout and suspicious-reuse revocation remain current-session-only.
- Record only a safe structured logout/session-revocation event without credential material.
- Add focused unit, PostgreSQL integration, HTTP/API, concurrency/idempotency, cookie, disabled-session isolation, failure-path, and OpenAPI contract-drift coverage.
- Reconcile only documentation made stale by the implementation.

## Out of Scope

- An Admin disable/enable management endpoint, Role/User administration, or bulk-revocation command; disabled status is manipulated only by trusted test/setup paths until its owning feature exists.
- `logout-all`, other-device logout, session listing/device management, Customer authentication, password flows, MFA, or authorization administration.
- Frontend logout control/state/routing, Axios behavior, single-flight coordination, or UI messages; those belong to later frontend tasks.
- Schema/migration/dependency/configuration changes; existing session/token fields and cookie configuration are sufficient.
- Hard deletion, retention cleanup scheduling, distributed logging/throttling, Redis, or production secret-provider work.

## Proposed HTTP Contract

- `POST /api/v1/auth/logout`: no request body; requires a known Refresh-family cookie, exact trusted Origin/Referer, and matching `X-CSRF-Token`; success returns `204`, `Cache-Control: no-store`, and expired Access/Refresh `Set-Cookie` headers.
- A repeated request for the same known session with valid CSRF remains `204` and reissues the same clearing headers. Unknown/malformed/missing authentication returns a stable `401`; invalid Origin/CSRF returns `403 CSRF_VALIDATION_FAILED`; unexpected failures return safe `500` without clearing or claiming revocation.

## Expected Changes

- Extend the existing authentication repository/service/controller boundaries for known-family session resolution, atomic idempotent revocation, envelope erasure, safe logout events, and cookie expiry serialization.
- Reuse S1-T06 Origin/CSRF/current-state primitives and S1-T05/S1-T07 cookie names/attributes without adding abstractions beyond the logout boundary.
- Add exact Swagger/OpenAPI metadata and focused unit/PostgreSQL/HTTP/contract tests.
- Update narrow authentication/development/repository/Sprint documentation.

## Architecture Impact

Completes the backend current-session lifecycle within the existing NestJS authentication module. Logout authorization is based on the known opaque credential plus session-bound CSRF rather than an Access JWT, allowing safe cleanup after Access expiry or Admin disable while preserving backend authority and device isolation.

## Swagger / OpenAPI Impact

Adds exact generated documentation for `POST /api/v1/auth/logout`, including Refresh-cookie and CSRF-header requirements, no request/response body, no-store `204`, both clearing cookies, stable `401`/`403`/`500` failures, and secret-free examples.

## Database / Prisma Impact

Updates only existing `AuthSession.revokedAt` and its RefreshToken family fields transactionally. Logout preserves history and prior revocation timestamps, clears recovery-envelope fields, and requires no Prisma schema or migration change.

## Security Impact

Security-critical. Logout must resist cross-site logout, revoke only the intended browser session, remain safe after disable/expiry, prevent recovery after revocation, and never log or echo credentials. Unknown credentials cannot receive idempotent success based on an unverified session; database failure must not produce a false successful logout response.

## Constraints

- Preserve S1-T01 through S1-T07 contracts, fixed session lifetime, current-state enforcement, and affected-session-only semantics.
- Backend status remains authoritative. Disabled Admins receive no new credentials but may revoke and clear a known current session with valid CSRF.
- Cookie deletion must match the original host-only name/path/SameSite/HttpOnly/production-Secure attributes.
- Do not add dependencies, change environment configuration or Prisma schema/migrations, stage/commit/push, or modify unrelated/later-task behavior.

## Acceptance Criteria

- Generated OpenAPI exactly matches the implemented logout endpoint, cookie/CSRF requirements, no-body/no-store `204`, clearing-cookie headers, stable failures, and secret-free examples.
- A valid known session logout atomically revokes only that session/family, erases recovery material, clears both cookies, returns no body, and leaves other sessions for the same Admin usable.
- Repeating logout for the same known session with valid CSRF is idempotent and returns the same safe `204`/clearing-cookie contract without altering prior revocation timestamps or other sessions.
- Missing/malformed/unknown credentials fail safely; invalid/missing Origin or CSRF returns `CSRF_VALIDATION_FAILED`; database/concurrency failures do not claim success, issue live credentials, or partially revoke state.
- Disabled, expired, or already-revoked known sessions can be safely logged out/cleared with matching CSRF, but cannot access protected/CSRF-bootstrap/refresh endpoints or obtain new credentials.
- Disabling one Admin makes all of that Admin's independent sessions unusable before Access expiry, while normal logout affects only its selected current session and another active session remains usable.
- Focused unit/PostgreSQL/HTTP/concurrency/cookie/OpenAPI tests, typecheck, lint, build, formatting, Prisma checks, security scans, and dependency/schema scope inspection pass.

## Testing Impact

Automated tests required.

Focused unit, database integration, and HTTP/API coverage must exercise successful and repeated logout, stale rotated-family credentials, disabled/expired/revoked known sessions, unknown/malformed credentials, missing/mismatched CSRF/Origin, exact cookie deletion in development/production, affected-session isolation, all-session disabled enforcement across implemented endpoints, concurrency, transaction rollback, response redaction/no-store, safe events, and generated OpenAPI parity.

## Validation

- Preflight the isolated PostgreSQL test database and required authentication configuration without printing secrets.
- Use Context7/current primary documentation for NestJS response/cookie/OpenAPI behavior and Prisma transactional row locking before implementation.
- Run focused unit, disposable-database integration, HTTP/API, concurrency/idempotency, cookie, disabled-state, failure-path, and OpenAPI contract tests.
- Inspect exact Origin/CSRF enforcement, atomic affected-session revocation, recovery erasure, timestamp preservation, clearing-cookie attribute matching, status authority, response/event redaction, and absence of cross-session effects.
- Run affected API tests, typecheck, lint, build, Prisma format/validate/generate, repository formatting, Markdown links, `git diff --check`, secret scans, dependency/schema/migration scope, generated-output-ignore checks, disposable-data cleanup, and read-only Git-index inspection.

## Documentation Impact

Document the implemented logout endpoint, idempotent known-session behavior, cookie expiry, current-session scope, disabled-session cleanup/enforcement, safe failures, and explicit remaining frontend/Admin-management work.

## Approval State

Awaiting Implementation Approval

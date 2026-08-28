# Current Task

## Task ID

S1-T07

## Title

Implement Refresh Rotation and Reuse Handling

## Status

Current

## Goal

Implement the backend refresh boundary: atomically rotate current opaque Refresh credentials, issue a new Access credential, recover the exact latest Refresh credential for legitimate in-grace races/lost responses, classify suspicious reuse, revoke only the affected session family, enforce current state/CSRF/throttles, and publish the exact Swagger/OpenAPI contract.

## Why

S1-T05 establishes fixed-lifetime browser sessions and S1-T06 validates their current state, but an expired Access credential cannot yet be renewed safely. The approved architecture requires rotation plus a bounded authenticated recovery envelope so concurrent tabs and lost responses do not either create refresh storms or weaken replay detection.

## Required Context

The following is the Minimum Sufficient **Required Context** for this task:

- `docs/sprints/sprint-01.md`
- `docs/features/admin-auth/specification.md`
- `docs/security/authentication.md`
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

This set owns the observable refresh/reuse behavior, fixed session lifetime, accepted AES-256-GCM recovery model, current session/Admin/RBAC/CSRF boundaries, throttle contract, existing persistence invariants, cookie/error/OpenAPI conventions, and security-focused validation. Frontend single-flight handling, logout, Admin-disable bulk revocation, and later hardening remain outside this task.

## Scope

- Implement `POST /api/v1/auth/refresh` with exact Origin/Referer plus `X-CSRF-Token`, the opaque Refresh cookie, no request body, credentialed cookies, and `Cache-Control: no-store`.
- Validate the presented Refresh hash, owning session, fixed expiry, revocation/rotation state, Admin status, current `admin.access`, and session-bound CSRF hash before issuing credentials.
- Atomically lock and rotate the current token: mark it rotated, insert a new hashed opaque token capped at the unchanged session expiry, link the linear history, create the replacement recovery envelope, update session use/throttle state, and preserve the one-current-token invariant.
- Encrypt each newly current raw Refresh credential only in the approved short-lived AES-256-GCM recovery envelope using a separately configured active/retiring keyring, unique 12-byte nonce, 16-byte tag, authenticated context, stored key ID, and configuration-driven grace expiry.
- For a directly superseded token presented inside grace with the same active session and valid CSRF credential, authenticate/decrypt the exact latest current token and reissue that credential without another rotation or expiry extension.
- Treat reuse outside the narrow recovery rules—including an invalid/missing/expired envelope or a family that advanced beyond the recoverable state—as suspicious: issue no replacement, return stable `401 REFRESH_TOKEN_REUSED`, and atomically revoke only the affected session/token family.
- Enforce the accepted durable per-session and process-local per-IP refresh limits with generic `429 AUTH_RATE_LIMITED` and `Retry-After`, without making IP/user-agent similarity part of credential legitimacy.
- Issue replacement host-only HttpOnly Access/Refresh cookies with the accepted attributes; expose neither raw credentials nor recovery material in JSON, logs, errors, OpenAPI examples, or persistent plaintext.
- Add focused cryptography, unit, PostgreSQL transaction/concurrency, HTTP/API, throttle, failure-path, cookie, expiry, recovery/reuse, isolation, and OpenAPI contract-drift coverage.
- Reconcile only configuration and documentation made stale by this implementation.

## Out of Scope

- Frontend Axios retry/single-flight behavior, transport retry orchestration, protected routing, or UI state; those belong to S1-T10/S1-T11.
- Logout, cookie clearing on logout/reuse, Admin-disable bulk session writes, or S1-T08 behavior; current refresh must still reject disabled Admins authoritatively.
- Sliding sessions, refresh lifetime extension, cross-session revocation, `logout-all`, device management, Customer authentication, MFA, password flows, or role administration.
- Schema/migration changes; S1-T03 already implemented the approved history, recovery-envelope, throttle, and native current-token invariants.
- Cleanup scheduling, distributed/shared throttling, Redis, production secret-provider integration, or operational rotation runbooks.

## Proposed HTTP Contract

- `POST /api/v1/auth/refresh`: no request body; requires the Refresh cookie, exact trusted Origin/Referer, and `X-CSRF-Token`; success returns `204` with replacement Access/Refresh `Set-Cookie` headers and `Cache-Control: no-store`.
- A valid current token rotates once. A valid directly superseded in-grace token reissues the exact latest credential without another rotation. Stable failures include authentication/session codes, `403 CSRF_VALIDATION_FAILED`, `429 AUTH_RATE_LIMITED` with `Retry-After`, and `401 REFRESH_TOKEN_REUSED`; failures issue no normal replacement credentials.

## Expected Changes

- Extend the API authentication crypto/repository/service/controller boundaries for recovery-key parsing, AES-256-GCM envelopes, transactional current-token rotation/recovery/reuse revocation, and refresh throttling.
- Reuse the S1-T06 current-state and CSRF enforcement boundaries, S1-T05 cookie/JWT issuance, and existing Prisma models/constraints without schema work.
- Add exact Swagger/OpenAPI metadata and focused unit/PostgreSQL/HTTP/contract tests.
- Update the environment example and narrow authentication/development/Sprint documentation.

## Architecture Impact

Completes the backend token-renewal state machine within the existing NestJS authentication module. Cryptography remains separated from HTTP extraction and Prisma transactions; the database transaction and native partial index remain authoritative for linear token history, while a narrowly scoped authenticated envelope handles response ambiguity without treating a rotated token as generally valid.

## Swagger / OpenAPI Impact

Adds exact generated documentation for `POST /api/v1/auth/refresh`, including Refresh-cookie and CSRF-header requirements, no request body, no-store `204` success with cookie issuance, stable `401`/`403`/`429`/`500` responses, `Retry-After`, and secret-free examples.

## Database / Prisma Impact

Uses the existing `AuthSession`, `RefreshToken`, and `AuthSessionRefreshThrottle` fields and constraints. Rotation/recovery/reuse changes rows transactionally but requires no Prisma model or migration change. Session/token expiry stays absolute; replacement expiry never exceeds the owning session.

## Security Impact

Security-critical. The task handles replayable bearer credentials, authenticated encryption, concurrency, replay classification, CSRF, session isolation, and rate limits. Keys, raw tokens, cookies, CSRF values, recovery plaintext, ciphertext internals, and database errors must not reach logs or responses. Any cryptographic, transaction, configuration, or current-state uncertainty fails closed without partial credential issuance.

## Constraints

- Preserve S1-T01 through S1-T06 contracts and the owner-approved fixed-lifetime, ten-second-default grace/recovery model.
- AES-256-GCM recovery keys are independent from JWT, CSRF, login-throttle, password, and database material; only configured key IDs are trusted.
- The old credential is not generally valid during grace. Recovery requires the exact directly superseded relationship, active current token/session/Admin/RBAC, valid CSRF, valid authenticated envelope, and grace time.
- Reuse revokes only the affected session/token family; other sessions for the Admin remain valid.
- Do not add dependencies, change Prisma schema/migrations, stage/commit/push, or modify unrelated/later-task behavior.

## Acceptance Criteria

- Generated OpenAPI exactly matches the implemented refresh endpoint, cookie/CSRF requirements, no-body/no-store response, stable statuses/codes, `Retry-After`, and secret-free examples.
- A valid current Refresh credential rotates atomically exactly once, returns replacement cookies, preserves the session/CSRF identity and absolute expiry, hashes normal persistence, and leaves exactly one current token.
- Concurrent/current-token races cannot create forks or multiple current tokens; the losing legitimate request follows only the accepted recovery/reuse classification.
- A directly superseded token inside grace with valid current session/CSRF state decrypts and reissues the exact latest Refresh credential without another rotation, while expired/invalid/missing/tampered/wrong-key envelopes and advanced families cannot recover.
- Suspicious reuse returns `REFRESH_TOKEN_REUSED`, issues no replacement, atomically revokes only the affected session/family, and leaves other Admin sessions usable.
- Missing/malformed/expired/revoked credentials, expired/revoked sessions, disabled Admin, missing `admin.access`, invalid CSRF/Origin, throttle excess, database/crypto/configuration failure, and concurrent state changes fail closed with the accepted stable safe response.
- Per-session and per-IP refresh throttles enforce their configuration-driven limits without permanent lockout, state disclosure, or credential creation on rejection.
- Focused cryptography/unit/PostgreSQL/HTTP/concurrency/OpenAPI tests, typecheck, lint, build, formatting, Prisma checks, security scans, and schema/dependency scope inspection pass.

## Testing Impact

Automated tests required.

Focused unit, database integration, and HTTP/API coverage must exercise current rotation, exact hashes/envelope shapes, authenticated decryption, tamper/wrong-key/expiry failures, same-token and multi-step races, lost-response recovery, outside-grace reuse, session isolation/revocation, current Admin/RBAC changes, CSRF/Origin, session/IP throttles, cookie/no-store/redaction behavior, transaction rollback, and generated OpenAPI parity.

## Validation

- Preflight the isolated PostgreSQL test database and process-only JWT/origin/CSRF/recovery-key configuration without printing secrets.
- Use Context7/current primary documentation for Node cryptography, Prisma transactions/locking, NestJS guards/controllers, and Swagger decorators before implementation.
- Validate the independent AES-256-GCM active/retiring recovery keyring before dependent services start and test safe failure without printing values.
- Run focused cryptography, unit, disposable-database integration, HTTP/API, concurrency, throttle, recovery/reuse, cookie, and OpenAPI contract tests.
- Inspect atomic locking/history/current-token invariants, exact fixed expiries, envelope authentication/expiry, affected-session-only revocation, timing-safe credential handling, response redaction/no-store, and absence of raw persistent/logged credentials.
- Run affected API tests, typecheck, lint, build, Prisma format/validate/generate, repository formatting, Markdown links, `git diff --check`, secret scans, dependency/schema/migration scope, generated-output-ignore checks, disposable-data cleanup, and read-only Git-index inspection.

## Documentation Impact

Document the implemented refresh endpoint, success/error/cookie contract, atomic rotation, grace recovery, suspicious-reuse session scope, refresh throttling, recovery key configuration/lifecycle, safe failure behavior, and explicit remaining frontend/logout work.

## Approval State

Awaiting Implementation Approval

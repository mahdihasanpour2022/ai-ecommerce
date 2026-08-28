# Admin Authentication Specification

**Status:** Proposed

This document owns observable Admin Authentication behavior. Architectural mechanisms are canonical in the security and ADR documents below.

## Required Context

- [Authentication architecture](../../security/authentication.md)
- [Authorization](../../security/authorization.md)
- [Security baseline](../../security/baseline.md)
- [Authentication ADR](../../architecture/adr/0010-authentication-strategy.md)
- [Frontend architecture](../../architecture/frontend-architecture.md)
- [Database architecture](../../architecture/database.md)
- [Frontend standards](../../standards/frontend.md)
- [Backend standards](../../standards/backend.md)
- [Testing standards](../../standards/testing.md)
- [API conventions](../../api/conventions.md)

## Problem

Administrative capabilities need a secure identity boundary that recovers silently from normal access expiry without refresh storms, while immediately denying invalid, disabled, unauthenticated, or insufficiently authorized access.

## Goals

- Authenticate eligible Admin Users independently from future Customers.
- Protect Persian RTL Admin pages and API operations with Backend authority.
- Recover `ACCESS_TOKEN_EXPIRED` requests through one refresh operation per execution context.
- Rotate and revoke current-session refresh capability safely.
- Provide accessible Persian user feedback for actionable failures without leaking sensitive information.

## Non-Goals

Customer authentication, password recovery, MFA, SSO/social login, `logout-all`, full staff provisioning/role-management UI, BFF, final enterprise session management, or Redis without a concrete approved requirement.

## Actors

- **Eligible Admin User:** active staff identity with required Admin access.
- **Disabled/ineligible identity:** an identity that must not establish or continue Admin access.
- **Admin browser session:** one authenticated browser/device session; tabs in the same browser profile share cookies.
- **Backend API:** credential, session, Admin-status, and authorization authority.

## Functional Requirements

1. Successful login establishes the accepted Access, Refresh, and in-memory CSRF credentials and lets the client load `/auth/me`.
2. Unknown identity, invalid password, disabled/inactive identity, and missing Admin eligibility fail identically as `INVALID_CREDENTIALS` without creating a session or exposing which condition applied.
3. Disabled/inactive or ineligible identities cannot establish or continue Admin access; a previously authenticated session whose Admin is later disabled receives `ACCOUNT_DISABLED`.
4. A protected page without a recoverable session proceeds to login using an allowlisted return destination and without flashing protected content.
5. Normal logout revokes and clears only the current browser/device session; other device sessions remain active.
6. Every protected Backend operation checks current Admin/session status and required permission.
7. Login does not start a periodic refresh timer.
8. A trusted administrative CLI/script can explicitly provision the first Super Admin, uses no default or committed credential, and fails safely if initial provisioning already occurred.

## Security Requirements

Authentication cookies, opaque refresh hashing, CSRF, CORS, rotation, the configurable ten-second grace model, status enforcement, credential redaction, and first-Super-Admin constraints must follow the [authentication architecture](../../security/authentication.md). The Backend is default-deny. Frontend visibility is never authorization.

## API Requirements

Under `/api/v1`:

- `POST /auth/login`: validate credentials, status, and eligibility; establish accepted session cookies/CSRF credential.
- `GET /auth/csrf`: validate the Refresh cookie and active session without rotation; return the existing session-bound CSRF token in a no-store JSON response for frontend-memory bootstrap.
- `POST /auth/refresh`: validate the refresh cookie/session/CSRF as approved, rotate atomically, and issue replacement credentials.
- `POST /auth/logout`: revoke the current session refresh capability and expire its authentication cookies; repeated logout behavior must be safely defined.
- `GET /auth/me`: return `{ admin: { id, email, displayName }, authorization: { roles, permissions } }`, with sorted/deduplicated effective strings and no token/session secret. Sprint 1 introduces only the `SUPER_ADMIN` Role and `admin.access` Permission.

Errors follow [API conventions](../../api/conventions.md): stable English `code`, Persian `message` when user-display text is appropriate, and no sensitive internals.

Each endpoint's implementation task has Swagger/OpenAPI impact. Its generated contract must reflect the implemented method and path, request and response DTOs, relevant status codes and stable error codes, cookie/CSRF authentication requirements, and useful authorization requirements without exposing credentials, tokens, or sensitive internals. These updates are part of the endpoint task's Definition of Done, not a later documentation task.

## Frontend Behavior

Axios sends eligible cookies with `withCredentials: true`; JavaScript does not read either authentication token or construct a Bearer header. The default timeout is 20 seconds and may be overridden for a justified endpoint. The session-bound CSRF token is held only in memory, obtained from login JSON or `GET /auth/csrf` during bootstrap, and sent in `X-CSRF-Token` on every unsafe request. It is never stored in Web Storage or a cookie.

Return destinations are allowlisted application-relative paths only. Absolute/protocol-relative URLs, backslashes, control characters, and unknown routes fall back to the protected Admin home.

Authentication recovery, stable error-code routing, and user feedback are centralized rather than implemented independently by pages or feature components. Specific `401`, `403`, disabled-account, refresh, and network outcomes are canonical in **Failure Scenarios** below.

## Concurrency Behavior

When multiple requests return `401 ACCESS_TOKEN_EXPIRED`, exactly one refresh operation is active within that frontend execution context. Other eligible requests wait. After success, all retry once. After a definitive Backend authentication failure, every waiter fails consistently and auth state transitions accordingly. Login, refresh, non-eligible `401`, every `403`, network errors, and already retried requests cannot recursively trigger refresh.

Tabs share cookies but may have separate JavaScript execution contexts. Rotation must tolerate legitimate same-session races using the architecture's configuration-driven grace model. Separate browsers/devices are independent sessions and each requires login.

## Failure Scenarios

| Scenario | Required outcome |
| --- | --- |
| Successful login | Establish one browser/device session and enter protected Admin after safe bootstrap. |
| Any failed login | Unknown identity, wrong password, inactive/disabled identity, and ineligible identity return the same `401 INVALID_CREDENTIALS`, Persian message `اطلاعات ورود نادرست است.`, response shape, and materially equivalent password-verification path; no session is created. |
| Admin disabled after authentication | Protected/current-session behavior returns `ACCOUNT_DISABLED`; no refresh; clear state and require login. |
| Authentication throttled | Return generic `429 AUTH_RATE_LIMITED` with `Retry-After`; create no session/credential and do not reveal the limiting bucket. |
| CSRF bootstrap | With a valid Refresh cookie and active session, return the existing token without rotation and with no-store handling; otherwise fail without exposing credential details. |
| Missing/invalid CSRF | Reject unsafe authenticated requests with `403 CSRF_VALIDATION_FAILED`; issue no credentials and record a safe security event where appropriate. |
| Expired access token | Silent single-flight refresh and one retry. |
| Invalid access token | No refresh; cleanup and require login. |
| Successful refresh | Rotate credentials atomically, release waiters, and retry once. |
| Concurrent expired responses | One active refresh per execution context; all waiters settle without a storm. |
| Expired/revoked refresh credential | Definitive failure, clear current auth state, and require login. |
| Reuse within approved grace behavior | With the same active session and valid CSRF token, decrypt and return the exact latest current credential from the bounded recovery envelope without another rotation. |
| Suspicious reuse outside grace behavior | Return `REFRESH_TOKEN_REUSED`, issue no credentials, record a security event, revoke only the affected current session/token family, stop refreshing, and require login; other Admin sessions remain valid. |
| Current-session logout | Revoke that session and clear its cookies/state; other devices remain active. |
| AdminUser disabled | Reject protected calls from all of that Admin's sessions with `ACCOUNT_DISABLED`; do not refresh. |
| Protected page unauthenticated | Proceed to login without protected-content flash. |
| `403` | No refresh; display appropriate Persian error behavior. |
| Network failure during refresh | Retry exactly once for transport failure without a valid Backend auth response. If it also fails, stop, keep auth temporarily unresolved/recoverable, do not clear credentials or infer logout, and show a Persian connectivity message. |
| Lost refresh response | Do not assume whether the Backend rotated; tolerate the ambiguity through the approved recovery/grace design. |

## Acceptance Criteria

- Only `401 ACCESS_TOKEN_EXPIRED` starts refresh; all other documented `401` codes and every `403` do not.
- `N` concurrent eligible failures create one refresh operation per frontend execution context and at most one retry per original request; every queue branch settles.
- No periodic refresh timer exists.
- Both auth tokens remain inaccessible to JavaScript and are never logged; no Bearer header is constructed by the frontend.
- The CSRF token remains frontend-memory-only, is session-bound, bootstraps safely across reload/expired-access cases, and every unsafe authenticated request enforces it plus exact-origin credentialed CORS.
- Login and other unauthenticated authentication requests enforce the accepted exact-Origin/Fetch-Metadata boundary without pretending a pre-session CSRF token exists.
- Disabled Admin access is rejected before access-JWT expiry.
- Normal logout revokes only the current session; its refresh credential cannot obtain another access token.
- `AdminUser` disable makes every one of that Admin's sessions unusable before JWT expiry; this does not change normal current-session logout semantics.
- A refresh transport failure receives exactly one controlled retry; definitive Backend auth failures receive none. A second transport failure does not log out, clear authentication, or loop.
- Reuse outside valid grace behavior returns `REFRESH_TOKEN_REUSED` and revokes only the affected current session/token family.
- Runtime defaults are configuration-driven: access 15 minutes, refresh 7 days, and reuse grace 10 seconds.
- Access JWTs use the accepted Ed25519/EdDSA key ring and required header/claim validation; authorization data is not embedded.
- Password verification uses the accepted Argon2id parameters, equivalent failure work, and rehash-on-success behavior.
- Account/IP login and session/IP refresh throttles enforce the accepted configurable defaults, generic `429` behavior, and no permanent lockout.
- `/auth/me` returns only safe identity plus sorted effective Role/Permission strings; Sprint 1 eligibility requires `admin.access`, and Backend state remains authoritative.
- Initial Super Admin provisioning uses the accepted secure administrative CLI/script architecture and fails safely if initial provisioning already occurred.
- User-display messages are Persian and Admin UI is `fa-IR` RTL and accessible.
- Relevant contract, security, concurrency, integration, and critical-flow tests pass.
- Swagger/OpenAPI accurately documents all implemented authentication endpoints and their API-visible contracts, and no stale authentication contract remains.

## Accepted Persistence Contract

The owner-approved fields, relations, constraints, indexes, deletion/cleanup policies, 30-day terminal security-history retention, fixed session expiry, HMAC-keyed login throttling, and initial migration design are canonical in the [S1-T02 schema proposal](../../work/sprint-01/s1-t02-schema-proposal.md). They remain design-only until S1-T03 implements the reviewed Prisma schema/migration.

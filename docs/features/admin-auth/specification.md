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

1. Successful login establishes the accepted Access, Refresh, and CSRF credentials and lets the client load `/auth/me`.
2. Invalid credentials fail generically without account enumeration or creating a session.
3. Disabled/inactive or ineligible identities cannot establish or continue Admin access.
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
- `POST /auth/refresh`: validate the refresh cookie/session/CSRF as approved, rotate atomically, and issue replacement credentials.
- `POST /auth/logout`: revoke the current session refresh capability and expire its authentication cookies; repeated logout behavior must be safely defined.
- `GET /auth/me`: return a safe explicit Admin identity and effective authorization representation.

Errors follow [API conventions](../../api/conventions.md): stable English `code`, Persian `message` when user-display text is appropriate, and no sensitive internals.

Each endpoint's implementation task has Swagger/OpenAPI impact. Its generated contract must reflect the implemented method and path, request and response DTOs, relevant status codes and stable error codes, cookie/CSRF authentication requirements, and useful authorization requirements without exposing credentials, tokens, or sensitive internals. These updates are part of the endpoint task's Definition of Done, not a later documentation task.

## Frontend Behavior

Axios sends eligible cookies with `withCredentials: true`; JavaScript does not read either authentication token or construct a Bearer header. The default timeout is 20 seconds and may be overridden for a justified endpoint. State-changing requests include the frontend-readable CSRF credential in `X-CSRF-Token`.

Authentication recovery, stable error-code routing, and user feedback are centralized rather than implemented independently by pages or feature components. Specific `401`, `403`, disabled-account, refresh, and network outcomes are canonical in **Failure Scenarios** below.

## Concurrency Behavior

When multiple requests return `401 ACCESS_TOKEN_EXPIRED`, exactly one refresh operation is active within that frontend execution context. Other eligible requests wait. After success, all retry once. After a definitive Backend authentication failure, every waiter fails consistently and auth state transitions accordingly. Login, refresh, non-eligible `401`, every `403`, network errors, and already retried requests cannot recursively trigger refresh.

Tabs share cookies but may have separate JavaScript execution contexts. Rotation must tolerate legitimate same-session races using the architecture's configuration-driven grace model. Separate browsers/devices are independent sessions and each requires login.

## Failure Scenarios

| Scenario | Required outcome |
| --- | --- |
| Successful login | Establish one browser/device session and enter protected Admin after safe bootstrap. |
| Invalid credentials | Generic Persian authentication failure where appropriate; no new session. |
| Inactive/disabled Admin | Reject with `ACCOUNT_DISABLED`; no refresh; clear state and require login. |
| Ineligible Admin login | Deny access without leaking role details. |
| Expired access token | Silent single-flight refresh and one retry. |
| Invalid access token | No refresh; cleanup and require login. |
| Successful refresh | Rotate credentials atomically, release waiters, and retry once. |
| Concurrent expired responses | One active refresh per execution context; all waiters settle without a storm. |
| Expired/revoked refresh credential | Definitive failure, clear current auth state, and require login. |
| Reuse within approved grace behavior | Handle only as same-session race/recovery according to architecture; old credential is not generally valid. |
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
- CSRF and explicit credentialed CORS behavior match the accepted architecture.
- Disabled Admin access is rejected before access-JWT expiry.
- Normal logout revokes only the current session; its refresh credential cannot obtain another access token.
- `AdminUser` disable makes every one of that Admin's sessions unusable before JWT expiry; this does not change normal current-session logout semantics.
- A refresh transport failure receives exactly one controlled retry; definitive Backend auth failures receive none. A second transport failure does not log out, clear authentication, or loop.
- Reuse outside valid grace behavior returns `REFRESH_TOKEN_REUSED` and revokes only the affected current session/token family.
- Runtime defaults are configuration-driven: access 15 minutes, refresh 7 days, and reuse grace 10 seconds.
- Initial Super Admin provisioning uses the accepted secure administrative CLI/script architecture and fails safely if initial provisioning already occurred.
- User-display messages are Persian and Admin UI is `fa-IR` RTL and accessible.
- Relevant contract, security, concurrency, integration, and critical-flow tests pass.
- Swagger/OpenAPI accurately documents all implemented authentication endpoints and their API-visible contracts, and no stale authentication contract remains.

## Open Questions

- Final Prisma constraints, indexes, relations, deletion policies, and migration for the accepted `AuthSession`/`RefreshToken` conceptual model.
- Exact safe credential-recovery mechanics for legitimate reuse within grace after a lost rotated response.
- Final `/auth/me` permission representation and minimal Sprint 1 permission matrix.
- Exact error/message behavior for ineligible login where enumeration risk applies.
- Exact cross-origin CSRF value delivery/storage, login/bootstrap coverage, and session-binding implementation.

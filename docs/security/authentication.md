# Authentication Architecture

**Status:** Accepted

This document owns how Admin authentication is architecturally intended to work. Observable feature behavior is defined in the [Admin Authentication specification](../features/admin-auth/specification.md).

## Topology and credentials

The initial topology is direct browser-to-API communication:

```text
Admin Browser (admin.example.com)
  -> Axios, withCredentials: true
  -> NestJS API (api.example.com)
```

A BFF is **Deferred**. It may be reconsidered for a concrete future requirement, but it is not part of Sprint 0 or Sprint 1.

The API issues two separate host-only cookies. The `Domain` attribute is not set:

| Cookie | Credential | Accepted default TTL | HttpOnly | Secure | SameSite | Path |
| --- | --- | --- | --- | --- | --- | --- |
| Access cookie | Short-lived access JWT | `ACCESS_TOKEN_TTL=15m` | Yes | Yes in production | `Lax` | `/` |
| Refresh cookie | Longer-lived opaque random refresh token | `REFRESH_TOKEN_TTL=7d` | Yes | Yes in production | `Lax` | `/` |

Runtime lifetimes come from validated environment configuration; 15 minutes and 7 days are the accepted defaults, not values to hard-code throughout the application. Local development configuration may differ where HTTPS is unavailable, but production protections must not be weakened silently. Cookie names and exact development behavior belong to environment-aware implementation planning.

Frontend JavaScript reads neither authentication cookie. Axios does not construct `Authorization: Bearer ...` in the accepted architecture. With credentialed CORS and browser cookie rules satisfied, the browser attaches eligible cookies automatically. `withCredentials: true` enables eligible cookie transmission; it does not create an Authorization header.

The raw cryptographically secure opaque refresh token exists only in its HttpOnly cookie. Backend persistence stores a secure representation such as a hash, never the raw credential. Exact persistence schema is Open.

## CSRF and CORS

Cookie authentication requires CSRF protection for state-changing browser requests. The Backend issues a CSRF credential bound to the authenticated session. A frontend-readable host-only `csrf-token` cookie is conceptually:

```text
HttpOnly = false
Secure = true in production
SameSite = Lax
Path = /
Domain = not set
```

The frontend sends `X-CSRF-Token` on `POST`, `PUT`, `PATCH`, and `DELETE`. `GET`, `HEAD`, and `OPTIONS` must not change state. Validation must be bound to the current authenticated session and must not be a naive unsigned double-submit design.

With direct cross-origin API communication, a host-only cookie created by `api.example.com` cannot be read by JavaScript executing on `admin.example.com`. Therefore the accepted host-only attributes do not authorize a parent-domain cookie: the exact safe delivery/storage mechanism for the frontend-readable CSRF value, including login/bootstrap and refresh coverage, remains **Open** and must preserve session binding.

CORS uses an environment-configured explicit origin allowlist, conceptually including `https://admin.example.com` and `https://example.com` plus explicit development origins. Credentialed CORS is required. Never combine credentials with `Access-Control-Allow-Origin: *`.

## Refresh trigger and single flight

Refresh is reactive, not periodic. Login does not start a timer, and no `setInterval(refresh)` behavior is allowed. Refresh occurs only after an eligible response with HTTP `401` and code `ACCESS_TOKEN_EXPIRED`, or when a separately approved future feature deliberately invokes it.

Within one frontend execution context, exactly one refresh operation may be active. Concurrent requests failing with `ACCESS_TOKEN_EXPIRED` wait on that operation. After success, each eligible original request retries at most once using the newly issued cookies. A retry marker and endpoint exclusions prevent recursion; login and refresh requests never trigger the response interceptor's refresh flow.

Other authentication failures do not refresh:

- `INVALID_ACCESS_TOKEN`: clear authentication state, perform appropriate session cleanup, and require login.
- `ACCOUNT_DISABLED`: clear authentication state, require login, and show an appropriate Persian message when applicable.
- `AUTHENTICATION_REQUIRED`: ensure state is cleared and proceed to login.
- Any `403`, including `INSUFFICIENT_PERMISSION`: never refresh; handle the authorization error and show a Persian message when appropriate.

## Rotation, sessions, and logout

Admin authentication has three separate accepted concepts: `AdminUser`, `AuthSession`, and rotating `RefreshToken` history/family. Each browser/device login creates an independent `AuthSession`; rotation changes its RefreshToken while the logical session continues. Tabs in one browser profile share its cookie store, while Chrome, Firefox, another profile, and a phone are separate sessions and each requires login. The accepted conceptual fields live in [database architecture](../architecture/database.md); final Prisma details remain Open.

Refresh rotation is required: using `R1` produces `R2`, and `R1` becomes superseded. Legitimate races can arise from tabs, retries, or a lost response. A configuration-driven `REFRESH_REUSE_GRACE_SECONDS=10` is the accepted default. Within the approved grace logic, a recently rotated credential associated with the same legitimate session may be handled narrowly as concurrency/recovery rather than immediate theft. This does not make the old token normally valid for ten seconds.

Reuse outside valid grace/recovery behavior returns the English machine code `REFRESH_TOKEN_REUSED`, issues no normal replacement credentials, records a security event, and revokes only the affected current `AuthSession`/token family. Other sessions belonging to the Admin remain valid. The affected frontend session stops refreshing, clears its authentication state/cookies as appropriate, requires login, and may show a safe Persian message without technical security details.

Normal logout revokes only the current `AuthSession` and its refresh capability, clears Access and Refresh cookies and related frontend state, and requires login again in that browser. Other browser/device sessions remain active. `logout-all` is Deferred unless separately approved.

The Backend verifies relevant Admin and session status on protected operations. Disabling an `AdminUser` makes every one of that Admin's sessions unusable before access-JWT expiry and returns `401 ACCOUNT_DISABLED`; this differs from current-session logout. Access-token permission claims are not the permanent authorization source of truth; current authorization remains server-controlled.

## Network failures and timeout

Axios uses a default timeout of 20 seconds; justified endpoints such as future uploads may override it. A connection failure, timeout, or offline error does not prove the session invalid and must not automatically log out or clear cookies/authentication state. Show an appropriate Persian connectivity message, for example: `ارتباط با سرور برقرار نشد. لطفاً دوباره تلاش کنید.`

A failed network request may never have reached the Backend, or the Backend may have completed it and its response was lost. Refresh rotation and retry design must tolerate this ambiguity. A refresh request that fails only because of a connection failure, timeout, or equivalent transport failure with no valid Backend authentication response receives exactly one controlled automatic retry within the same single-flight operation; waiting requests do not create their own retries. If that retry also has a transport failure, automatic retries stop; authentication remains temporarily unresolved/recoverable, credentials/state are not automatically cleared, logout is not inferred, and a Persian connectivity message is shown. Unlimited retries are forbidden.

Definitive Backend responses such as `REFRESH_TOKEN_INVALID`, `REFRESH_TOKEN_EXPIRED`, `REFRESH_TOKEN_REUSED`, or `ACCOUNT_DISABLED` are different from network failure and are never automatically retried. They fail all waiting requests consistently and transition authentication state according to the stable error contract.

## Backend security behavior

- Access JWT validation includes the approved signature algorithm, key, issuer, audience, expiry, and required identity/session claims.
- Refresh validation covers secure comparison, expiry, session status, rotation state, revocation, and grace behavior; rotation is atomic.
- Access and Refresh lifetimes are configuration-driven with accepted defaults of `ACCESS_TOKEN_TTL=15m` and `REFRESH_TOKEN_TTL=7d`.
- Passwords use an approved adaptive hash; parameters remain Open. Tokens, cookies, passwords, CSRF credentials, and credential-bearing headers are never logged.
- Authentication endpoints require approved brute-force/abuse controls without assuming Redis.
- The first Super Admin is provisioned through a secure administrative CLI/script workflow from a trusted environment, conceptually `pnpm admin:create-super-admin` subject to final repository naming. It accepts credentials through a secure interactive prompt or protected environment configuration, hashes the password, is explicit/auditable, exposes no public bootstrap endpoint or default/committed credentials, stores no plaintext password, and fails safely if an initial Super Admin already exists.

## Open Decisions

- Access-JWT signing algorithm, key ownership, rotation, issuer, audience, and final claims.
- Final Prisma schema, constraints, indexes, relations, deletion policies, and retention for `AuthSession` and `RefreshToken`.
- Exact safe credential-recovery mechanics for legitimate reuse within the grace window, including how a lost rotated response is recovered without treating the superseded token as normally valid.
- Exact cross-origin delivery/storage, login/bootstrap coverage, and cryptographic/session-binding implementation for the frontend-readable CSRF credential.
- Password hash algorithm/parameters and authentication throttling thresholds.
- Future criteria for reconsidering BFF.

See [authorization](authorization.md), [security baseline](baseline.md), [API conventions](../api/conventions.md), and [ADR 0010](../architecture/adr/0010-authentication-strategy.md).

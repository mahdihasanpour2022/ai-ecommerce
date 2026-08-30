# Backend Admin Login

The Backend implements `POST /api/v1/auth/login`, `POST /api/v1/auth/refresh`, `POST /api/v1/auth/logout`, `GET /api/v1/auth/csrf`, `GET /api/v1/auth/me`, strict Access-cookie/current-state enforcement, and reusable unsafe-request CSRF validation. The Admin frontend implements login, reload bootstrap, protected-entry gating, a minimal protected shell, the centralized Axios transport boundary, and single-flight expired-Access recovery.

## Admin frontend

The Admin serves an accessible Persian RTL login at `/login` and protects `/`. Its client authentication boundary begins in an unresolved bootstrap state, requests `/auth/csrf` and then `/auth/me` through Axios with `withCredentials: true`, and reveals the protected shell only after both succeed. Authentication cookies remain HttpOnly and unreadable to JavaScript; the returned CSRF token exists only in the client-memory credential store owned by the provider boundary. The frontend creates no Bearer header and writes no credential to Web Storage, IndexedDB, URLs, logs, or server-rendered markup.

Login prevents duplicate submissions, clears the controlled password value immediately after submission, loads `/auth/me` before entering the protected shell, and exposes stable Persian invalid-credential, throttle, disabled/session-invalid, forbidden, CSRF, server, and connectivity outcomes. Transport uncertainty is a recoverable state and is not reported as a definitive logout.

All Admin API calls use the direct `axios@1.19.0` client configured with the validated public base URL, `withCredentials: true`, JSON acceptance, and a 20-second default timeout. Typed request policy marks CSRF handling, caller-versus-global failure routing, refresh eligibility, and whether one recovery replay has already been attempted. Safe methods never receive a CSRF header; login and CSRF bootstrap explicitly omit it; an unsafe request that requires CSRF fails closed unless the current provider-memory credential exists. Caller-supplied `Authorization` is rejected, and omitted-CSRF requests cannot smuggle a stale `X-CSRF-Token` value.

Only an explicitly eligible response with HTTP `401` and code `ACCESS_TOKEN_EXPIRED` joins recovery. One promise owns `POST /auth/refresh` within each JavaScript execution context, so concurrent failures wait without creating a refresh storm; separate tabs remain independent. Refresh has no body, carries cookies plus the current memory-only CSRF token, and is itself marked non-eligible. Success replays each waiting original request once with its original cancellation signal and a recursion marker. Login, CSRF bootstrap, refresh, non-eligible requests, other `401` codes, every `403`, canceled requests, and marked replays never enter recovery.

A refresh network/timeout failure is retried exactly once by that shared operation. A second transport failure settles all waiters, retains authentication and CSRF as unresolved/recoverable, and uses the existing Persian connectivity state without inferring logout. A Backend response is definitive and receives no automatic refresh retry; stable authentication codes flow through the existing provider policy to clear or transition state. S1-T12 still owns the final end-to-end authentication hardening, accessibility, contract-drift, and critical-flow verification matrix.

The response boundary normalizes stable HTTP envelopes while keeping timeout, cancellation, connection/network, and client-policy failures distinct. It preserves `Retry-After`, performs no implicit retry, and publishes only globally routed failures to the authentication boundary. Login/bootstrap/current-identity calls remain caller-routed so their existing page-specific state transitions stay deterministic. The CSRF store is cleared for definitive unauthenticated/disabled/forbidden outcomes but retained during recoverable network or timeout ambiguity.

Return navigation currently allowlists only the protected home `/`. Absolute and protocol-relative URLs, backslashes, control characters, and unknown paths fall back to `/`. The Admin API base is the public, non-secret build value `NEXT_PUBLIC_API_BASE_URL`, defaulting locally to `http://localhost:3002/api/v1`.

## Contract

Send JSON `{ "email": string, "password": string }` from an exact origin in `CORS_ALLOWED_ORIGINS`. Login requires a trusted `Origin`, or a trusted `Referer` only when `Origin` is absent, and rejects cross-site Fetch Metadata. Arbitrary origin reflection and wildcard credentialed CORS are not supported.

Success returns `200 { "csrfToken": string }` with `Cache-Control: no-store` and two host-only cookies:

| Cookie | Value | Attributes |
| --- | --- | --- |
| `admin_access_token` | Ed25519/EdDSA Access JWT | `HttpOnly`, `SameSite=Lax`, `Path=/`, absolute access expiry, `Secure` in production, no `Domain` |
| `admin_refresh_token` | Random opaque 256-bit credential | `HttpOnly`, `SameSite=Lax`, `Path=/`, absolute session expiry, `Secure` in production, no `Domain` |

The JSON body never contains either authentication token. The CSRF token is held only in frontend memory; an independent CSRF keyring derives it as HMAC-SHA-256 of the session ID at login/bootstrap, while the database stores only its SHA-256 hash. The JWT contains only `sub`, `sid`, `jti`, `iat`, `exp`, exact issuer/audience, and protected header `alg=EdDSA`, `typ=at+jwt`, and the configured `kid`; it contains no Role or Permission claims.

Unknown identity, wrong password, disabled identity, and missing effective `admin.access` all return the same `401 INVALID_CREDENTIALS` envelope and perform real or dummy Argon2id verification. Durable HMAC-keyed account throttling and process-local IP throttling return generic `429 AUTH_RATE_LIMITED` with `Retry-After`. Successful login atomically resets the account bucket and creates one session, refresh-throttle row, and initial hashed Refresh token.

## Current-session endpoints

`GET /api/v1/auth/csrf` accepts only a current opaque Refresh cookie whose token, session, Admin status, and effective `admin.access` remain valid. It performs no refresh rotation and returns the same session token with `Cache-Control: no-store`. `GET /api/v1/auth/me` strictly verifies the Access-cookie algorithm, exact header/claims, configured key/issuer/audience, signature, and expiry, then reloads current session/Admin/RBAC state. It returns only safe Admin identity plus sorted/deduplicated Roles and Permissions. Disabled state and authorization changes take effect before Access-token expiry.

`POST /api/v1/auth/refresh` has no request body and requires the Refresh cookie, exact trusted Origin/Referer, and `X-CSRF-Token`. A current credential rotates atomically and returns `204` with replacement host-only HttpOnly cookies and `Cache-Control: no-store`; the fixed session expiry never slides. A directly superseded credential inside the configured grace window may reissue the exact latest credential from its session/token-bound AES-256-GCM envelope without another rotation. Missing/tampered/expired recovery state or a family that advanced again returns `REFRESH_TOKEN_REUSED`, erases recovery material, and revokes only that browser session. Durable per-session and process-local per-IP limits return generic `429 AUTH_RATE_LIMITED` plus `Retry-After`.

`POST /api/v1/auth/logout` also has no request body and requires a known Refresh-family credential, exact trusted Origin/Referer, and `X-CSRF-Token`. It accepts stale, expired, or already-revoked credentials from the known family so the owning browser can clean up idempotently, including after the Admin is disabled. Success atomically revokes only that session, erases its recovery material, preserves prior revocation timestamps, returns `204` with `Cache-Control: no-store`, and expires both host-only authentication cookies. Other sessions remain unchanged. Unknown or malformed credentials return `401`; invalid origin or CSRF evidence returns `403` and does not clear cookies.

Unsafe cookie-authenticated endpoints use exact Origin/Referer validation plus the session token in `X-CSRF-Token`; Fetch Metadata remains defense in depth. Missing or mismatched tokens return `403 CSRF_VALIDATION_FAILED`. Refresh and logout both consume this reusable boundary.

## Required runtime configuration

The API validates configuration before Nest application creation. `DATABASE_URL`, `AUTH_JWT_PRIVATE_KEY`, `AUTH_JWT_PUBLIC_KEYS`, `AUTH_JWT_ACTIVE_KID`, `CORS_ALLOWED_ORIGINS`, `AUTH_LOGIN_THROTTLE_HMAC_KEY`, `AUTH_CSRF_HMAC_KEYS`, `AUTH_CSRF_ACTIVE_KID`, and `AUTH_REFRESH_RECOVERY_KEYRING` are required. The private key is Ed25519 PKCS#8 PEM; the public key ring is a JSON object mapping safe key IDs to Ed25519 SPKI PEM values; PEM newlines may be literal or encoded as `\n`. The active private/public key pair must match. HMAC keys are base64 for at least 32 random bytes. CSRF keys must be unique, independent from the login-throttle key, and retain retiring values until every session derived with them has expired. The recovery keyring is exact JSON with `activeKid` and a `keys` object; each key is an independent exact 32-byte base64 AES-256-GCM key, and retiring keys remain until every envelope using them is unusable.

Non-secret defaults and intentionally invalid secret placeholders are listed in `apps/api/.env.example`. Development cookies omit `Secure` for loopback HTTP; production cookies always include it. The API does not load `.env` files itself, so inject values through the invoking process or approved secret mechanism.

Generated OpenAPI is available at `/api/docs` and `/api/docs-json` in development/test only and documents the request, response headers, stable failures, and `Retry-After` behavior without credential examples.

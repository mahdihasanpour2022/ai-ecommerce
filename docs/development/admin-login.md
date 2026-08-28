# Backend Admin Login

The Backend implements `POST /api/v1/auth/login`, `POST /api/v1/auth/refresh`, `GET /api/v1/auth/csrf`, `GET /api/v1/auth/me`, strict Access-cookie/current-state enforcement, and reusable unsafe-request CSRF validation. Logout, the Admin frontend, and frontend single-flight/transport orchestration remain later work.

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

Unsafe cookie-authenticated endpoints use exact Origin/Referer validation plus the session token in `X-CSRF-Token`; Fetch Metadata remains defense in depth. Missing or mismatched tokens return `403 CSRF_VALIDATION_FAILED`. Refresh consumes this reusable boundary now; logout will consume it in its owning task.

## Required runtime configuration

The API validates configuration before Nest application creation. `DATABASE_URL`, `AUTH_JWT_PRIVATE_KEY`, `AUTH_JWT_PUBLIC_KEYS`, `AUTH_JWT_ACTIVE_KID`, `CORS_ALLOWED_ORIGINS`, `AUTH_LOGIN_THROTTLE_HMAC_KEY`, `AUTH_CSRF_HMAC_KEYS`, `AUTH_CSRF_ACTIVE_KID`, and `AUTH_REFRESH_RECOVERY_KEYRING` are required. The private key is Ed25519 PKCS#8 PEM; the public key ring is a JSON object mapping safe key IDs to Ed25519 SPKI PEM values; PEM newlines may be literal or encoded as `\n`. The active private/public key pair must match. HMAC keys are base64 for at least 32 random bytes. CSRF keys must be unique, independent from the login-throttle key, and retain retiring values until every session derived with them has expired. The recovery keyring is exact JSON with `activeKid` and a `keys` object; each key is an independent exact 32-byte base64 AES-256-GCM key, and retiring keys remain until every envelope using them is unusable.

Non-secret defaults and intentionally invalid secret placeholders are listed in `apps/api/.env.example`. Development cookies omit `Secure` for loopback HTTP; production cookies always include it. The API does not load `.env` files itself, so inject values through the invoking process or approved secret mechanism.

Generated OpenAPI is available at `/api/docs` and `/api/docs-json` in development/test only and documents the request, response headers, stable failures, and `Retry-After` behavior without credential examples.

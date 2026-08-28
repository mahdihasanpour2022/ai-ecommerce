# Backend Admin Login

S1-T05 implements only `POST /api/v1/auth/login`. Refresh, `GET /auth/csrf`, logout, `/auth/me`, access-token guards, general authenticated CSRF enforcement, and the Admin frontend remain later work.

## Contract

Send JSON `{ "email": string, "password": string }` from an exact origin in `CORS_ALLOWED_ORIGINS`. Login requires a trusted `Origin`, or a trusted `Referer` only when `Origin` is absent, and rejects cross-site Fetch Metadata. Arbitrary origin reflection and wildcard credentialed CORS are not supported.

Success returns `200 { "csrfToken": string }` with `Cache-Control: no-store` and two host-only cookies:

| Cookie | Value | Attributes |
| --- | --- | --- |
| `admin_access_token` | Ed25519/EdDSA Access JWT | `HttpOnly`, `SameSite=Lax`, `Path=/`, absolute access expiry, `Secure` in production, no `Domain` |
| `admin_refresh_token` | Random opaque 256-bit credential | `HttpOnly`, `SameSite=Lax`, `Path=/`, absolute session expiry, `Secure` in production, no `Domain` |

The JSON body never contains either authentication token. The CSRF token is held only in frontend memory; the database stores SHA-256 hashes of the CSRF and Refresh credentials. The JWT contains only `sub`, `sid`, `jti`, `iat`, `exp`, exact issuer/audience, and protected header `alg=EdDSA`, `typ=at+jwt`, and the configured `kid`; it contains no Role or Permission claims.

Unknown identity, wrong password, disabled identity, and missing effective `admin.access` all return the same `401 INVALID_CREDENTIALS` envelope and perform real or dummy Argon2id verification. Durable HMAC-keyed account throttling and process-local IP throttling return generic `429 AUTH_RATE_LIMITED` with `Retry-After`. Successful login atomically resets the account bucket and creates one session, refresh-throttle row, and initial hashed Refresh token.

## Required runtime configuration

The API validates configuration before Nest application creation. `DATABASE_URL`, `AUTH_JWT_PRIVATE_KEY`, `AUTH_JWT_PUBLIC_KEYS`, `AUTH_JWT_ACTIVE_KID`, `CORS_ALLOWED_ORIGINS`, and `AUTH_LOGIN_THROTTLE_HMAC_KEY` are required. The private key is Ed25519 PKCS#8 PEM; the public key ring is a JSON object mapping safe key IDs to Ed25519 SPKI PEM values; PEM newlines may be literal or encoded as `\n`. The active private/public key pair must match. The throttle HMAC key is base64 for at least 32 random bytes and must be independent of JWT/database material.

Non-secret defaults and intentionally invalid secret placeholders are listed in `apps/api/.env.example`. Development cookies omit `Secure` for loopback HTTP; production cookies always include it. The API does not load `.env` files itself, so inject values through the invoking process or approved secret mechanism.

Generated OpenAPI is available at `/api/docs` and `/api/docs-json` in development/test only and documents the request, response headers, stable failures, and `Retry-After` behavior without credential examples.

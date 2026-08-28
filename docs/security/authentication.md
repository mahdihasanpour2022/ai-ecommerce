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

Access JWTs use asymmetric `EdDSA` with Ed25519 keys. The protected header contains only the fixed `alg=EdDSA`, `typ=at+jwt`, and a validated `kid` that selects from the API's configured trusted key ring; token-supplied `jwk`, `jku`, `x5u`, or other key material is never trusted. Verification hard-allows only EdDSA and requires the configured issuer/audience plus `sub` (AdminUser ID), `sid` (AuthSession ID), `jti`, `iat`, and `exp`. Roles and permissions are deliberately absent because current Backend state remains authoritative.

Exactly one configured private key signs new tokens. Verification accepts its public key and explicitly configured retiring public keys until every token they signed has exceeded its short lifetime; unknown/invalid `kid`, algorithm, issuer, audience, type, signature, or required claim fails closed. Private and recovery keys are server secrets supplied by an approved secret mechanism, never source-controlled or exposed through public JWKS/headers in this single-issuer boundary.

Frontend JavaScript reads neither authentication cookie. Axios does not construct `Authorization: Bearer ...` in the accepted architecture. With credentialed CORS and browser cookie rules satisfied, the browser attaches eligible cookies automatically. `withCredentials: true` enables eligible cookie transmission; it does not create an Authorization header.

The raw cryptographically secure opaque refresh token normally exists only in its HttpOnly cookie. Backend persistence stores its SHA-256 hash, which is sufficient for a uniformly random 256-bit credential. Login creates the initial token and hash; the implemented refresh boundary rotates that history and stores replacement plaintext only inside the approved short-lived authenticated recovery envelope. Exact owner-approved columns and constraints are canonical in the [S1-T02 schema proposal](../work/sprint-01/s1-t02-schema-proposal.md) and are represented by the S1-T03 Prisma schema and reviewed migration. Plaintext is never persisted outside that bounded envelope.

## CSRF and CORS

Cookie authentication requires a synchronizer CSRF token bound to each `AuthSession`. The Backend derives a cryptographically pseudorandom 256-bit base64url token as HMAC-SHA-256 of the session UUID using an independent rotating CSRF keyring, stores only its SHA-256 hash on the session, and compares submitted values timing-safely. Login uses the active key; bootstrap tests every configured active/retiring key against the stored hash without persisting a key ID or raw token. Retiring keys remain configured for at least the maximum absolute session lifetime. The token remains stable only for that session and is neither an authentication token nor a parent-domain/double-submit cookie.

Successful login returns the CSRF token in a JSON response. On reload, the Admin obtains the same token from a no-store `GET /auth/csrf` bootstrap endpoint after the Backend validates the Refresh cookie and active session without rotating it. The frontend holds the token in memory only—never local/session storage, a URL, or a cookie—and sends it in `X-CSRF-Token` on `POST`, `PUT`, `PATCH`, and `DELETE`, including refresh and logout. Missing/mismatched credentials fail with `403 CSRF_VALIDATION_FAILED` and are security-event candidates. `GET`, `HEAD`, and `OPTIONS` never change application state.

The implemented bootstrap also validates that the Refresh token is current/unrevoked/unexpired, the session and Admin are active, effective `admin.access` still exists, and a configured CSRF key reproduces the persisted hash. A missing retiring key or database/configuration failure returns no credential and fails closed. This refinement preserves the approved hash-only schema and requires no migration.

Login has no authenticated session token yet, so it is protected by exact configured Origin validation, JSON/custom-header preflight behavior, and Fetch Metadata as defense in depth. Every other unsafe browser request requires both an allowed exact Origin and the session-bound token. If `Origin` is absent, a validated Referer fallback may be used; if neither is trustworthy, reject. Fetch Metadata does not replace Origin/token checks.

CORS uses an environment-configured exact origin allowlist, conceptually including `https://admin.example.com` and explicit development origins. Credentialed CORS is required; wildcard origins, broad subdomain regexes, reflected arbitrary origins, and `Access-Control-Allow-Origin: *` are forbidden. Responses carrying credentials or CSRF material use `Cache-Control: no-store` and never log that material.

## Refresh trigger and single flight

Refresh is reactive, not periodic. Login does not start a timer, and no `setInterval(refresh)` behavior is allowed. Refresh occurs only after an eligible response with HTTP `401` and code `ACCESS_TOKEN_EXPIRED`, or when a separately approved future feature deliberately invokes it.

Within one frontend execution context, exactly one refresh operation may be active. Concurrent requests failing with `ACCESS_TOKEN_EXPIRED` wait on that operation. After success, each eligible original request retries at most once using the newly issued cookies. A retry marker and endpoint exclusions prevent recursion; login and refresh requests never trigger the response interceptor's refresh flow.

Other authentication failures do not refresh:

- `INVALID_ACCESS_TOKEN`: clear authentication state, perform appropriate session cleanup, and require login.
- `ACCOUNT_DISABLED`: clear authentication state, require login, and show an appropriate Persian message when applicable.
- `AUTHENTICATION_REQUIRED`: ensure state is cleared and proceed to login.
- Any `403`, including `INSUFFICIENT_PERMISSION`: never refresh; handle the authorization error and show a Persian message when appropriate.

## Rotation, sessions, and logout

Admin authentication has three separate accepted concepts: `AdminUser`, `AuthSession`, and rotating `RefreshToken` history/family. Each browser/device login creates an independent `AuthSession`; rotation changes its RefreshToken while the logical session continues. Tabs in one browser profile share its cookie store, while Chrome, Firefox, another profile, and a phone are separate sessions and each requires login. The accepted conceptual boundary lives in [database architecture](../architecture/database.md), and its owner-approved Prisma/migration design lives in the [S1-T02 schema proposal](../work/sprint-01/s1-t02-schema-proposal.md).

Refresh rotation is required: using `R1` produces `R2`, and `R1` becomes superseded. Legitimate races can arise from tabs, retries, or a lost response. A configuration-driven `REFRESH_REUSE_GRACE_SECONDS=10` is the accepted default. Within the approved grace logic, a recently rotated credential associated with the same legitimate session may be handled narrowly as concurrency/recovery rather than immediate theft. This does not make the old token normally valid for ten seconds.

The implemented `POST /auth/refresh` enforces the Refresh cookie, exact Origin/Referer, session CSRF token, current session/Admin/`admin.access`, fixed expiry, and session/IP throttles. PostgreSQL locks the session, presented token, and durable throttle row; marking the old token, inserting/linking the replacement, persisting its envelope, and updating session/throttle state commit atomically. Signing/encryption or persistence failure issues no cookie and leaves no partial rotation.

The initial session lifetime is absolute: the accepted seven-day refresh/session expiry is set at login, and rotation never slides or extends it. Every replacement RefreshToken is capped at its owning session's `expiresAt`.

Each newly current refresh token has an AES-256-GCM recovery envelope containing its raw value for at most that ten-second grace period. Ciphertext, unique nonce, authentication tag, key ID, and expiry are stored; the versioned encryption key ring is injected separately from the database. The envelope is deleted or made unusable after expiry. Rotation and current-token selection are atomic.

The recovery implementation uses an exact 32-byte active/retiring keyring, a unique 12-byte nonce, 16-byte authentication tag, and additional authenticated data binding the envelope version, session ID, replacement token ID, and envelope expiry. Decryption also timing-safely verifies that recovered plaintext hashes to the exact current token row. Rotating a current token erases that token's obsolete envelope; suspicious reuse erases all envelope material in the affected family while preserving prior revocation timestamps.

If a superseded family token is presented within grace with the same active session and valid CSRF token, the Backend returns the exact latest current credential from its authenticated recovery envelope without creating another rotation. This makes concurrent/lost-response handling idempotent even when multiple tabs raced. IP address or user-agent similarity is not proof of legitimacy and is not required. A missing/invalid/expired envelope, revoked session, invalid CSRF credential, token outside grace, or reuse after the family advanced beyond recoverable state is suspicious reuse, not recovery.

Reuse outside valid grace/recovery behavior returns the English machine code `REFRESH_TOKEN_REUSED`, issues no normal replacement credentials, records a security event, and revokes only the affected current `AuthSession`/token family. Other sessions belonging to the Admin remain valid. The affected frontend session stops refreshing, clears its authentication state/cookies as appropriate, requires login, and may show a safe Persian message without technical security details.

The implemented `POST /auth/logout` accepts any known credential in the browser's Refresh family, including a stale, expired, or already-revoked token, after exact Origin/Referer and session CSRF validation. It atomically revokes only the owning `AuthSession` and its refresh capability, erases recovery material, preserves earlier revocation timestamps, and idempotently returns `204` for the same known session while expiring both authentication cookies. This cleanup remains available when the Admin is disabled; it never restores access or issues credentials. Unknown credentials fail with `401`, invalid origin/CSRF evidence fails with `403`, and neither failure clears cookies. Other browser/device sessions remain active. `logout-all` is Deferred unless separately approved.

The Backend verifies relevant Admin and session status on protected operations. Disabling an `AdminUser` makes every one of that Admin's sessions unusable before access-JWT expiry and returns `401 ACCOUNT_DISABLED`; this differs from current-session logout. Access-token permission claims are not the permanent authorization source of truth; current authorization remains server-controlled.

## Network failures and timeout

Axios uses a default timeout of 20 seconds; justified endpoints such as future uploads may override it. A connection failure, timeout, or offline error does not prove the session invalid and must not automatically log out or clear cookies/authentication state. Show an appropriate Persian connectivity message, for example: `ارتباط با سرور برقرار نشد. لطفاً دوباره تلاش کنید.`

A failed network request may never have reached the Backend, or the Backend may have completed it and its response was lost. Refresh rotation and retry design must tolerate this ambiguity. A refresh request that fails only because of a connection failure, timeout, or equivalent transport failure with no valid Backend authentication response receives exactly one controlled automatic retry within the same single-flight operation; waiting requests do not create their own retries. If that retry also has a transport failure, automatic retries stop; authentication remains temporarily unresolved/recoverable, credentials/state are not automatically cleared, logout is not inferred, and a Persian connectivity message is shown. Unlimited retries are forbidden.

Definitive Backend responses such as `REFRESH_TOKEN_INVALID`, `REFRESH_TOKEN_EXPIRED`, `REFRESH_TOKEN_REUSED`, or `ACCOUNT_DISABLED` are different from network failure and are never automatically retried. They fail all waiting requests consistently and transition authentication state according to the stable error contract.

## Backend security behavior

- Access JWT validation includes the approved signature algorithm, key, issuer, audience, expiry, and required identity/session claims.
- Refresh validation covers secure comparison, expiry, session status, rotation state, revocation, and grace behavior; rotation is atomic.
- Access and Refresh lifetimes are configuration-driven with accepted defaults of `ACCESS_TOKEN_TTL=15m` and `REFRESH_TOKEN_TTL=7d`.
- Passwords use Argon2id with 64 MiB memory (`m=65536 KiB`), three iterations, parallelism one, 32-byte output, library-generated unique salts, and Argon2 version 19. Successful verification rehashes when accepted parameters change. Deployment benchmarking may increase cost; reducing below OWASP's Argon2id minimum requires explicit security approval. No pepper is used initially because its independent secret lifecycle/recovery cost is not currently justified.
- Login uses equivalent password-verification work, including a maintained dummy Argon2id hash for nonexistent identities. Unknown identity, wrong password, disabled/inactive identity, and missing `admin.access` eligibility all return the same `401 INVALID_CREDENTIALS`, generic Persian message, response shape, and materially equivalent path. `ACCOUNT_DISABLED` is reserved for a previously authenticated session whose Admin becomes disabled.
- Configurable login protection allows five failed attempts per account in 15 minutes, then applies an escalating delay from 30 seconds up to 15 minutes; successful authentication resets that account counter. A coarse per-IP limit allows 20 login attempts per 15 minutes. Refresh allows 10 attempts per active session and 30 per IP per minute. Exceeding a limit returns generic `429 AUTH_RATE_LIMITED` with `Retry-After`, creates no session/credential, and never permanently locks the account.
- Login account/identifier throttling uses a durable PostgreSQL bucket keyed by HMAC-SHA-256 of the canonical email with a dedicated server secret. Existing and nonexistent identities therefore receive the same bucket/limit behavior without persisting submitted emails or exposing a throttle-based enumeration oracle. Per-session refresh throttling is a durable one-to-one session bucket. IP throttling may be per-process only for the current single-instance foundation; an approved shared/edge limiter is required before horizontal deployment. Proxy-derived client addresses are trusted only from explicitly configured proxies. CAPTCHA and Redis remain Deferred.
- Tokens, cookies, passwords, CSRF credentials, submitted login identifiers, credential-bearing headers, and recovery plaintext are never logged. Structured events use correlation IDs and minimum safe identifiers for login success/failure/throttle, session creation/revocation, CSRF rejection, grace recovery, suspicious reuse, and disabled-session rejection; retention remains an operational decision.
- The first Super Admin is provisioned through the implemented trusted-environment `yarn workspace @automotive-commerce/api admin:create-super-admin` command documented in [First Super Admin Provisioning](../development/admin-provisioning.md). It accepts no arguments, consumes one-shot protected process configuration, hashes the password, is explicit/auditable, exposes no public bootstrap endpoint or default/committed credentials, stores no plaintext password, and fails safely if an initial Admin already exists.

Safe post-login return destinations are application-relative allowlisted paths. Reject absolute URLs, protocol-relative values, backslashes, control characters, and unrecognized routes; fall back to the protected Admin home. Client input never selects an external redirect.

## Accepted persistence boundary and deferred decisions

- The owner-approved Prisma fields, relations, database constraints/indexes, referential actions, fixed expiry, throttle representation, cleanup, 30-day terminal security-history retention, and additive migration design are canonical in the [S1-T02 schema proposal](../work/sprint-01/s1-t02-schema-proposal.md). S1-T03 implemented and database-verified that persistence boundary; later tasks own runtime authentication behavior.
- Production secret-provider integration, long-term security-event retention, distributed throttling, and operational key-rotation runbooks remain release/deployment work; their absence does not permit source-controlled secrets or horizontal deployment with per-process-only limiting.
- BFF adoption remains Deferred until a concrete security, aggregation, deployment, or multi-client requirement justifies revisiting ADR 0010.

These decisions follow [JWT Best Current Practices (RFC 8725)](https://www.rfc-editor.org/rfc/rfc8725), [EdDSA for JOSE (RFC 8037)](https://www.rfc-editor.org/rfc/rfc8037), and OWASP guidance for [CSRF prevention](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html), [authentication](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html), and [password storage](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html).

See [authorization](authorization.md), [security baseline](baseline.md), [API conventions](../api/conventions.md), and [ADR 0010](../architecture/adr/0010-authentication-strategy.md).

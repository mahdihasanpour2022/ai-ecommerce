# 0010: Authentication Strategy

**Status:** Superseded in part by [ADR 0013](0013-adopt-admin-bff-authentication.md)

## Context

Admin needs secure browser sessions, short access-credential lifetime, refresh rotation, immediate status enforcement, concurrency-safe recovery, current-session logout, and backend authorization. The initial architecture favors direct visibility and educational clarity over an intermediary BFF.

## Decision

Use direct credentialed browser-to-NestJS API communication. Store an access JWT with configuration-driven default `ACCESS_TOKEN_TTL=15m` and a cryptographically secure opaque refresh token with default `REFRESH_TOKEN_TTL=7d` in two separate host-only HttpOnly cookies. Both are Secure in production, `SameSite=Lax`, `Path=/`, with no `Domain` attribute. Backend storage keeps a secure refresh representation such as a hash.

Sign access JWTs with Ed25519/`EdDSA` and rotate through an explicitly configured `kid` key ring. Verification pins the algorithm, type, issuer, audience, trusted key, and required identity/session claims; authorization is never embedded as durable JWT authority.

Cookie-authenticated state changes use a random session-bound synchronizer CSRF token stored hashed on the Backend, delivered in login/bootstrap JSON, held only in frontend memory, and returned in `X-CSRF-Token`. Exact-origin credentialed CORS, Origin validation, and Fetch Metadata provide complementary browser boundaries. Only `401 ACCESS_TOKEN_EXPIRED` triggers reactive single-flight refresh; other `401` codes and every `403` do not.

Refresh rotation includes configuration-driven `REFRESH_REUSE_GRACE_SECONDS=10`. The current raw refresh token may exist briefly only inside an AES-256-GCM recovery envelope so a valid same-session/CSRF retry can receive the exact latest credential without another rotation. Transport failures receive exactly one controlled refresh retry. Reuse outside recoverable grace behavior returns `REFRESH_TOKEN_REUSED` and revokes only the affected `AuthSession`/token family.

Model `AdminUser`, browser/device `AuthSession`, and rotating `RefreshToken` history as separate concepts. Normal logout revokes the current session; disabling the Admin makes every session unusable. Provision the first Super Admin only through a secure trusted administrative CLI/script that fails safely after initial provisioning. Backend authorization and Admin/session status remain current server-side authority.

Sprint 1 starts with only the `SUPER_ADMIN` Role and `admin.access` Permission. Failed login conditions are enumeration-safe and uniformly return `INVALID_CREDENTIALS`; post-authentication disablement returns `ACCOUNT_DISABLED`. Passwords use Argon2id with the accepted 64 MiB/three-iteration/parallelism-one baseline. Account/IP login and session/IP refresh throttles use the accepted configurable limits without permanent lockout or Redis dependence.

## Reasons

HttpOnly cookies keep both authentication tokens unavailable to browser JavaScript. Direct API communication is simpler to debug, exposes true Backend statuses/contracts in browser tools, and makes authentication mechanics visible for learning. Opaque refresh credentials minimize embedded authority and support hashed server persistence, rotation, revocation, and session control.

## Alternatives Considered

Frontend-managed Bearer access token plus refresh cookie; server-side opaque session cookie; and BFF-managed authentication. A BFF remains Deferred rather than permanently rejected.

## Consequences

Credentialed CORS, CSRF validation, secure cookie/key configuration, stable errors, atomic rotation, current authorization lookup, encrypted grace recovery, equivalent login-failure work, throttling, and security-event redaction are required. JavaScript reads neither authentication token and constructs no Bearer header. Final Prisma representation and deployment operations remain downstream work under the constraints in [authentication architecture](../../security/authentication.md).

# 0010: Authentication Strategy

**Status:** Accepted

## Context

Admin needs secure browser sessions, short access-credential lifetime, refresh rotation, immediate status enforcement, concurrency-safe recovery, current-session logout, and backend authorization. The initial architecture favors direct visibility and educational clarity over an intermediary BFF.

## Decision

Use direct credentialed browser-to-NestJS API communication. Store an access JWT with configuration-driven default `ACCESS_TOKEN_TTL=15m` and a cryptographically secure opaque refresh token with default `REFRESH_TOKEN_TTL=7d` in two separate host-only HttpOnly cookies. Both are Secure in production, `SameSite=Lax`, `Path=/`, with no `Domain` attribute. Backend storage keeps a secure refresh representation such as a hash.

Cookie-authenticated state changes use a session-bound CSRF credential readable by the frontend and sent in `X-CSRF-Token`. Only `401 ACCESS_TOKEN_EXPIRED` triggers reactive single-flight refresh; other `401` codes and every `403` do not. Refresh rotation includes configuration-driven `REFRESH_REUSE_GRACE_SECONDS=10`. Transport failures receive exactly one controlled refresh retry. Reuse outside valid grace behavior returns `REFRESH_TOKEN_REUSED` and revokes only the affected `AuthSession`/token family.

Model `AdminUser`, browser/device `AuthSession`, and rotating `RefreshToken` history as separate concepts. Normal logout revokes the current session; disabling the Admin makes every session unusable. Provision the first Super Admin only through a secure trusted administrative CLI/script that fails safely after initial provisioning. Backend authorization and Admin/session status remain current server-side authority.

## Reasons

HttpOnly cookies keep both authentication tokens unavailable to browser JavaScript. Direct API communication is simpler to debug, exposes true Backend statuses/contracts in browser tools, and makes authentication mechanics visible for learning. Opaque refresh credentials minimize embedded authority and support hashed server persistence, rotation, revocation, and session control.

## Alternatives Considered

Frontend-managed Bearer access token plus refresh cookie; server-side opaque session cookie; and BFF-managed authentication. A BFF remains Deferred rather than permanently rejected.

## Consequences

Credentialed CORS, CSRF validation, secure cookie configuration, stable error codes, atomic refresh rotation, current authorization lookup, and multi-tab/lost-response recovery are required. JavaScript does not read tokens or construct Bearer headers. Final signing/key policy, Prisma schema details, in-grace credential recovery mechanics, CSRF delivery/binding, and operational thresholds remain Open in [authentication architecture](../../security/authentication.md).

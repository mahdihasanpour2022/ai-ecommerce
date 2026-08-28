# Sprint 1: Admin Authentication

**Status:** Active

## Required Context

- [Admin Authentication specification](../features/admin-auth/specification.md)

The feature specification's **Required Context** list is the canonical routing source for Sprint 1 implementation.

## Goal

Deliver a complete accessible Admin authentication slice using the accepted direct browser-to-API, cookie-based architecture and backend-enforced RBAC foundation.

## Scope

### Admin frontend

- Persian RTL login and protected Admin entry experience.
- Authenticated-Admin bootstrap state and current-session logout.
- Central Axios client using credentialed cookies, CSRF header behavior, stable error codes, and a default 20-second timeout.
- Centralized authentication recovery and error behavior defined by the feature specification.
- Required login, disabled-account, forbidden, connectivity, session-expired, and loading states from the feature specification.

### Backend

- `POST /api/v1/auth/login`
- `POST /api/v1/auth/refresh`
- `POST /api/v1/auth/logout`
- `GET /api/v1/auth/me`
- Independent `AdminUser`, Role/Permission foundation, separate `AuthSession` and rotating `RefreshToken` history, adaptive password hashing, access JWT cookie, opaque refresh cookie with hashed persistence, and session-bound CSRF protection.
- Secure trusted-environment first-Super-Admin CLI/script provisioning; no bootstrap API or default credentials.
- Current Admin/session status enforcement, validated DTOs, stable error codes, Persian display messages, safe logging, explicit credentialed CORS, OpenAPI contracts, and proportionate brute-force protection.

## Out of Scope

Customer authentication, password reset, MFA, social login, SSO, `logout-all`, full user/role administration UI, catalog behavior, BFF, Redis without approved need, full observability infrastructure, and generalized SDK abstractions.

## Tasks

1. Resolve the blocking Open Decisions in the authentication architecture and feature specification.
2. Threat-model credentials, CSRF, XSS, replay, enumeration, brute force, redirects, CORS, concurrency, and logging.
3. Translate the accepted Admin identity/Role/Permission/AuthSession/RefreshToken concepts into a proposed schema and migration impact for separate approval before schema work.
4. Define endpoint DTOs, cookies, CSRF contract, stable error codes, Persian display messages, and OpenAPI.
5. Implement and test the approved backend session, rotation/revocation, current-status authorization, and current-session logout behavior.
6. Implement and test frontend bootstrap, protected routing, error behavior, and refresh coordination.
7. Validate accessibility, RTL UX, security logging/redaction, and end-to-end behavior.

## Acceptance Criteria

- All accepted behavior in the [feature specification](../features/admin-auth/specification.md) is satisfied.
- The implementation conforms to the architecture and API contracts routed by that specification.
- Login, authenticated bootstrap, protected access, refresh recovery, and current-session logout form a complete tested vertical slice.
- Relevant unit, integration, API/e2e, frontend integration, accessibility, and critical-flow tests pass.

## Definition of Done

The approved specification and security decisions are met; schema/migrations and contracts were reviewed; typecheck, lint, build, and relevant tests pass; logs redact security-sensitive data; documentation/OpenAPI match behavior; and no unrelated or unapproved Git/dependency changes exist.

## Risks / Open Questions

S1-T01 resolves the blocking authentication security and contract decisions. S1-T02 must still produce and receive explicit approval for final Prisma schema/migration details before persistence implementation; deployment secret providers, distributed throttling, and broader authorization/operational policy remain downstream or Deferred as documented canonically.

# Current Task

## Task ID

S1-T09

## Title

Implement Admin Login and Protected Frontend Shell

## Status

Current

## Goal

Implement an accessible Persian RTL Admin login experience, memory-only authenticated bootstrap, safe protected entry shell, allowlisted return routing, and explicit loading/error/unauthenticated states against the stable backend authentication contracts.

## Why

The backend now provides login, CSRF bootstrap, current-Admin identity, refresh, and current-session logout, but the Admin application remains a static foundation. This task establishes the first user-facing authentication boundary and protected shell without prematurely implementing the centralized Axios interceptor or single-flight refresh orchestration owned by S1-T10 and S1-T11.

## Required Context

The following is the Minimum Sufficient **Required Context** for this task:

- `docs/sprints/sprint-01.md`
- `docs/features/admin-auth/specification.md`
- `docs/architecture/frontend-architecture.md`
- `docs/security/authentication.md`
- `docs/security/authorization.md`
- `docs/security/baseline.md`
- `docs/api/conventions.md`
- `docs/environment.md`
- `docs/standards/frontend.md`
- `docs/standards/testing.md`
- `docs/standards/execution.md`
- `docs/development/admin-login.md`
- `apps/admin/`
- Relevant installed Next.js 16.3.2 App Router guides under `node_modules/next/dist/docs/`, especially layouts/pages, Server and Client Components, authentication, redirecting, environment variables, CSS, and selected testing guidance.

This set owns the observable login/protected-entry behavior, cookie and memory-only CSRF model, safe redirects, current endpoint contracts, Persian RTL/accessibility expectations, and the installed framework's current conventions. Backend implementation internals, refresh concurrency, and unrelated product UI are outside this task.

## Scope

- Replace the static Admin foundation entry with a distinct login route and a minimal protected Admin home/shell in Persian (`fa-IR`) and RTL.
- Add a client-side authentication boundary/state model with explicit bootstrapping, authenticated, unauthenticated, and recoverable/error states; never render protected content before bootstrap resolves.
- On reload, use the backend CSRF bootstrap and current-Admin endpoints to recover the session-bound CSRF value into memory and load safe Admin identity/authorization data without reading authentication cookies in JavaScript.
- Submit email/password to the backend login endpoint, prevent duplicate submission, keep the password transient, retain the returned CSRF value only in memory, load `/auth/me`, and enter the protected shell only after successful identity bootstrap.
- Map the endpoint-local stable outcomes needed by this screen to accessible Persian feedback, including invalid credentials, throttling, disabled/session-invalid state, forbidden state, generic safe server failure, and connectivity/retry behavior.
- Accept only explicitly allowlisted application-relative return destinations; reject absolute/protocol-relative URLs, backslashes, control characters, and unknown routes, falling back to the protected Admin home.
- Provide semantic labels, descriptions, focus/error behavior, keyboard operation, sufficient visible state, logical RTL layout, responsive presentation, and no protected-content flash.
- Add focused tests for authentication state transitions, login interaction, bootstrap routing, safe return destinations, Persian RTL/accessibility semantics, duplicate-submit prevention, and representative backend/network failures.
- Reconcile only documentation made stale by the implementation.

## Out of Scope

- The centralized credentialed Axios client, general request interceptors, cross-feature error routing, and default-timeout infrastructure owned by S1-T10.
- Single-flight refresh, replaying failed protected requests, refresh transport retry, tab coordination, or refresh-loop prevention owned by S1-T11.
- Final authentication hardening/end-to-end matrix owned by S1-T12.
- Backend endpoint, OpenAPI, cookie, CORS, CSRF derivation, authorization, Prisma schema/migration, or database changes.
- Frontend `logout-all`, other-device/session management, password reset, MFA, staff/Role management, catalog/business UI, or Storefront work.
- Persisting authentication or CSRF data in Web Storage, IndexedDB, URLs, non-HttpOnly cookies, or server-rendered markup.

## Expected Changes

- Introduce Admin login and protected route segments/components, an authentication provider/boundary, a narrow typed endpoint adapter for login/bootstrap/current identity, safe return-destination validation, and reusable accessible status/error presentation.
- Extend Admin styles and metadata only as required for the Persian RTL authentication experience and protected shell.
- Add a safe public API-origin environment value/example if the existing Admin configuration has no suitable backend base URL; it must contain no credential or secret.
- Add focused Admin tests and only the minimum test/tooling configuration justified by the approved validation contract. Any new runtime or test dependency requires separate explicit owner approval before installation.
- Update narrow Admin-authentication/repository documentation and Sprint execution records.

## Architecture Impact

Adds the first client-owned Admin authentication state boundary inside the existing Next.js App Router application. Backend session and authorization state remain authoritative; the browser owns only safe Admin display data and an in-memory CSRF credential. The narrow endpoint adapter must remain replaceable by S1-T10's centralized Axios layer without page-level request duplication.

## API Impact

Consumes the existing `POST /api/v1/auth/login`, `GET /api/v1/auth/csrf`, and `GET /api/v1/auth/me` contracts with credentialed requests. No backend route or OpenAPI change is planned. Refresh and logout may be represented as later-capability boundaries but are not orchestrated in this task.

## Database Impact

None. The Admin frontend does not access Prisma or PostgreSQL and introduces no schema, migration, seed, or persistence behavior.

## Security Implications

Security-sensitive. Authentication cookies remain HttpOnly and unreadable to JavaScript; no Bearer header is constructed. The CSRF token and password remain memory-only/transient and must never enter storage, URLs, logs, server markup, or error telemetry. Bootstrap must avoid protected-content disclosure, return routing must reject open redirects, backend authorization remains authoritative, and network uncertainty must not be misreported as definitive logout.

## Edge Cases

- Reload with valid Refresh and Access cookies, valid Refresh with unusable Access, no cookies, disabled/revoked/expired state, or backend/network failure.
- Login double-click/Enter submission, invalid fields, generic invalid credentials, rate limiting with `Retry-After`, delayed/stale completion, and component unmount.
- Direct navigation to login while authenticated and to a protected route while unauthenticated.
- Malicious or malformed return destinations, including encoded absolute/protocol-relative values, backslashes, control characters, and unknown routes.
- Narrow/mobile layouts, long Persian messages, mixed-direction email text, keyboard-only use, focus placement, and assistive-technology announcements.

## Constraints

- Read the relevant installed Next.js 16.3.2 guides before writing frontend code and use Context7 for current React/Next.js API details.
- Preserve the direct browser-to-API, credentialed-cookie, session-bound memory-only CSRF architecture and stable backend contracts.
- Keep transport logic narrow and replaceable; do not pull S1-T10 centralized Axios or S1-T11 refresh coordination into this task.
- Do not add/remove/upgrade dependencies without separate explicit approval, and do not change backend code, Prisma schema/migrations, stage/commit/push, or modify unrelated application behavior.

## Acceptance Criteria

- The Admin application provides an accessible Persian RTL login and protected home shell with correct language/direction metadata and responsive logical layout.
- A successful login prevents duplicate submission, retains no password, keeps CSRF only in memory, loads `/auth/me`, and reveals the protected shell only after authenticated bootstrap succeeds.
- Reload bootstrap recovers the CSRF credential and safe Admin identity through the existing endpoints without reading authentication cookies or flashing protected content.
- Unauthenticated/definitive invalid states reach login with a safe allowlisted return destination; malicious/unknown destinations fall back to the protected Admin home.
- Invalid credentials, throttling, disabled/invalid session, forbidden, safe server, connectivity, loading, and retry states have deterministic accessible Persian presentation without sensitive details.
- No token is stored in browser persistence, exposed in markup/logs, or placed in a Bearer header; frontend visibility never substitutes for backend authorization.
- Focused frontend state, component/integration, routing/redirect, RTL/accessibility, and failure-path tests pass with relevant Admin typecheck, lint, build, formatting, dependency/config scope, and security inspections.

## Testing Impact

Automated tests required.

Focused tests must cover login success/failure, duplicate submission, memory-only CSRF handling, reload bootstrap, protected-content gating, safe return-destination parsing, authenticated/unauthenticated direct navigation, disabled/forbidden/throttled/network states, retry behavior, Persian labels/messages, document direction/language, keyboard/focus behavior, and no credential persistence or logging. Browser-level coverage may be proportionate here, with the complete critical-flow/accessibility matrix remaining in S1-T12.

## Validation

- Preflight the Admin Workspace, installed Next.js guide set, required safe API-origin configuration, backend/test availability needed by the chosen integration boundary, and whether task-required test/UI dependencies are already installed.
- Use Context7 and the installed Next.js 16.3.2 App Router documentation for relevant React/Next APIs before implementation.
- Run focused pure-state, component/integration, route/redirect, RTL/accessibility, and representative network/backend failure tests.
- Inspect the rendered flow for no protected-content flash, responsive RTL layout, keyboard/focus behavior, safe Persian errors, duplicate-submit prevention, and mixed-direction email handling.
- Inspect for Web Storage/IndexedDB/non-HttpOnly cookie/Bearer use, unsafe return redirects, credential logging/markup, accidental server serialization of CSRF/passwords, and task-boundary leakage into refresh orchestration.
- Run Admin typecheck, lint, build, repository formatting, relevant root regression checks, local Markdown links, `git diff --check`, added-line secret scan, dependency/config scope, generated-output-ignore behavior, and read-only Git-index inspection.

## Documentation Impact

Document the implemented Admin login/bootstrap/protected-shell behavior, safe API-origin setup, memory-only state, Persian user-visible outcomes, and explicit remaining Axios/refresh/hardening work.

## Approval State

Awaiting Implementation Approval

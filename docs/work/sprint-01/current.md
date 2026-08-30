# Current Task

## Task ID

S1-T10

## Title

Implement Axios Cookie, CSRF, and Error Behavior

## Status

Current

## Goal

Replace the S1-T09 bootstrap adapter with one centralized typed Axios client that consistently applies the public API base URL, credentialed cookies, the memory-only session CSRF header on unsafe authenticated requests, the accepted default timeout, stable error normalization/routing, and transport-failure classification without yet implementing refresh replay or single-flight coordination.

## Why

S1-T09 established the user-facing authentication state boundary with a deliberately narrow Fetch adapter. The remaining Admin application needs one reusable transport boundary before S1-T11 can safely add eligible access-expiry recovery without duplicating cookie, CSRF, timeout, and error behavior across features.

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
- Current Axios documentation through Context7 and relevant installed Next.js 16.3.2 App Router/environment/testing guides.

This set owns direct browser-to-API transport, credentialed-cookie and memory-only CSRF behavior, stable error codes, timeout/network distinctions, frontend ownership boundaries, and the current S1-T09 adapter/provider seams. Backend internals, refresh concurrency, and unrelated UI remain outside this task.

## Scope

- Add one typed, centralized Axios instance for the Admin application with the validated public API base URL, `withCredentials: true`, JSON defaults, and an accepted 20-second default timeout.
- Attach the current in-memory session CSRF value as `X-CSRF-Token` only to unsafe authenticated requests that require it; never source it from persistence, cookies, markup, logs, or URLs.
- Replace S1-T09's narrow Fetch adapter without scattering Axios calls through pages/components or changing observable login/bootstrap/protected-entry behavior.
- Normalize stable backend error envelopes and distinguish definitive HTTP responses from connection, timeout, cancellation, and other transport failures.
- Centralize the S1-T10-owned routing/state notifications for invalid access, disabled account, authentication-required, forbidden, CSRF failure, throttling, server failure, and connectivity outcomes while preserving the backend as authorization authority.
- Provide endpoint/request metadata needed for S1-T11 to identify eligible refresh behavior later, but do not refresh, queue, replay, or recursively retry requests in this task.
- Add focused tests for configuration, credentials, CSRF injection/exclusion, timeout/cancellation/network classification, stable error normalization/routing, and S1-T09 regression behavior.
- Reconcile only documentation made stale by the implementation.

## Out of Scope

- Single-flight refresh, waiting-request queues, replay, refresh transport retry, rotation-race recovery, tab coordination, or loop prevention owned by S1-T11.
- Final authentication hardening and critical-flow/accessibility matrix owned by S1-T12.
- Backend endpoint/OpenAPI, cookie, CORS, CSRF derivation, authorization, Prisma schema/migration, or database changes.
- Logout UI, `logout-all`, session management, business APIs/UI, Storefront work, or a generalized generated SDK.
- Persisting tokens or CSRF data, reading HttpOnly cookies, constructing Bearer headers, or inferring logout from network uncertainty.

## Expected Changes

- Add Axios as an exact approved Admin runtime dependency if it is not already directly available; dependency installation requires separate explicit owner approval before mutation.
- Introduce the centralized Axios instance, typed request metadata, memory-only CSRF bridge, normalized error types, and narrow auth-state notification boundary.
- Adapt the existing S1-T09 auth API/provider to use the client while keeping page/components transport-agnostic.
- Add focused tests/configuration using existing tooling unless a separately approved test dependency is genuinely required.
- Update narrow Admin authentication/environment/development documentation and Sprint execution records.

## Constraints

- Use Context7 for current Axios APIs and read relevant installed Next.js 16.3.2 guides before writing framework-specific code.
- Preserve direct browser-to-API credentialed cookies and session-bound memory-only CSRF; no Bearer header, token persistence, cookie reads, or credential logging.
- Keep S1-T11 refresh coordination entirely deferred and ensure the client cannot recurse or retry implicitly.
- Do not add/remove/upgrade a dependency without separate explicit approval, and do not change backend code, OpenAPI, Prisma schema/migrations, or unrelated behavior.

## Acceptance Criteria

- One typed Axios client owns the Admin API base URL, `withCredentials: true`, and a default 20-second timeout, and S1-T09 auth calls use it without observable regression.
- Unsafe authenticated requests receive the current session CSRF header from memory; safe/unauthenticated requests and requests without a session credential do not receive fabricated or stale CSRF values.
- Stable backend envelopes and HTTP statuses normalize predictably; invalid/disabled/unauthenticated, forbidden/CSRF, throttled, server, cancellation, timeout, and connectivity outcomes remain distinguishable and map to safe Persian behavior where user-visible.
- Network/timeout ambiguity does not clear auth state, infer logout, or trigger refresh; no automatic retry, replay, queue, periodic timer, or refresh orchestration is introduced.
- No token enters Web Storage, IndexedDB, URLs, markup, logs, a JavaScript-readable cookie, or an Authorization/Bearer header.
- Focused transport/state/regression tests and relevant Admin/root typecheck, lint, build, formatting, documentation, dependency/configuration, and security inspections pass.

## Testing Impact

Automated tests required.

Focused unit/integration coverage must prove Axios base/timeout/credentials behavior, request-method CSRF rules, credential lifecycle updates, endpoint exclusions, stable response/error normalization, cancellation versus timeout/network behavior, no implicit retry/refresh, no persistence/Bearer/logging, and regression of S1-T09 login/bootstrap/protected gating and localized outcomes.

## Validation

- Preflight the Admin Workspace, direct Axios availability/version, install authority, public API-origin configuration, existing test tooling, and whether a live Backend is necessary for the chosen integration boundary.
- Resolve and review current Axios documentation through Context7 plus relevant installed Next.js 16.3.2 guides.
- Run focused Axios configuration/interceptor/error/state tests and S1-T09 frontend regressions.
- Inspect credential inclusion, unsafe-method CSRF attachment, safe/login/bootstrap exclusions, timeout/cancellation/network classification, and absence of retry/refresh behavior.
- Inspect for storage/cookie reads, Bearer construction, credential logging/markup/serialization, stale CSRF reuse, unsafe redirects, and task-boundary leakage into S1-T11.
- Run Admin typecheck, lint, build, repository formatting, relevant root regression checks, local Markdown links, `git diff --check`, added-line secret scan, dependency/configuration scope, generated-output-ignore behavior, and read-only Git-index inspection.

## Documentation Impact

Document the centralized Axios configuration, public base URL, credentials/CSRF rules, stable error/transport classification, S1-T09 migration, and explicit remaining S1-T11 refresh work.

## Approval State

Awaiting Implementation Approval

# Current Task

## Task ID

S1-T11

## Title

Implement Single-Flight Refresh Recovery

## Status

Current

## Goal

Extend the centralized Admin Axios/authentication boundary so only eligible `401 ACCESS_TOKEN_EXPIRED` responses join one refresh operation per frontend execution context, settle every waiter, retry each original request at most once after success, and stop safely on definitive or repeated transport failure without loops, storms, or false logout.

## Why

S1-T10 now centralizes credentials, CSRF, timeout, request metadata, and HTTP/transport classification. The Admin still treats an expired Access cookie as unauthenticated even when its Refresh session remains valid. This task completes the approved reactive recovery mechanism against the implemented rotation/recovery backend while preserving explicit distinctions between expiry, invalid authentication, authorization failure, and network ambiguity.

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
- Current Axios interceptor/cancellation documentation through Context7 and relevant installed Next.js 16.3.2 App Router/testing guides.

This set owns the implemented refresh contract, frontend concurrency and failure semantics, memory-only CSRF/client boundary, stable error codes, and S1-T10 request metadata. Backend internals beyond the public contract, cross-tab coordination, and unrelated UI are outside this task.

## Scope

- Intercept only HTTP `401` with stable code `ACCESS_TOKEN_EXPIRED` from requests explicitly marked refresh-eligible.
- Maintain exactly one active refresh promise per JavaScript execution context; concurrent eligible failures wait on that operation rather than sending their own refresh requests.
- Call no-body `POST /auth/refresh` with credentialed cookies and the current memory-only `X-CSRF-Token`, while marking refresh itself non-eligible and recursion-proof.
- On refresh success, release waiters and replay each eligible original request once with a retry marker; preserve original request cancellation and prevent a second refresh/replay cycle.
- On a refresh transport failure without a valid Backend response, retry the refresh request exactly once inside the shared operation. Stop after a second transport failure, keep authentication recoverable/unresolved, retain credentials, and show the accepted Persian connectivity behavior.
- On definitive refresh/authentication failures, settle every waiter consistently, clear/transition state according to the stable contract, and never retry automatically.
- Ensure login, CSRF bootstrap, refresh, non-eligible requests, non-expiry `401`, every `403`, cancellations, and already-replayed requests never start refresh.
- Add focused concurrency, failure-path, replay, cancellation, recursion, and S1-T09/S1-T10 regression tests.
- Reconcile only documentation made stale by the implementation.

## Out of Scope

- Cross-tab locks, BroadcastChannel coordination, shared workers, or distributed frontend single flight; separate tabs remain separate execution contexts and rely on backend grace recovery.
- Periodic/proactive refresh, sliding session lifetime, changes to backend rotation/grace/reuse behavior, or additional automatic request retries.
- Final authentication hardening/critical-flow/accessibility matrix owned by S1-T12.
- Backend endpoint/OpenAPI, cookie, CORS, CSRF derivation, authorization, Prisma schema/migration, or database changes.
- Logout UI, `logout-all`, session management, business APIs/UI, Storefront work, or new dependencies without explicit approval.

## Expected Changes

- Add a narrowly owned refresh coordinator/single-flight state inside the centralized HTTP/auth layer.
- Extend typed Axios request metadata with a one-time replay marker and wire the response interceptor to the coordinator without circular retries.
- Add the refresh endpoint adapter and provider/global failure transitions needed for success, definitive failure, and unresolved transport failure.
- Add deterministic deferred-promise/concurrency tests using the existing Admin test tooling; no new dependency is expected.
- Update narrow Admin authentication/development/repository documentation and Sprint execution records.

## Constraints

- Use Context7 for current Axios interceptor/cancellation APIs and read relevant installed Next.js 16.3.2 guides before framework-specific changes.
- Preserve direct browser-to-API credentialed cookies and session-bound memory-only CSRF; no Bearer header, token persistence, cookie reads, or credential logging.
- Refresh is reactive only. No timer, unbounded retry, implicit Axios retry plugin, or refresh attempt for codes/statuses outside the exact eligibility rule.
- Every waiting branch must settle, every original request may replay at most once, and refresh/replay markers must prevent recursion.
- Do not add/remove/upgrade dependencies without explicit approval, and do not change backend code, OpenAPI, Prisma schema/migrations, or unrelated behavior.

## Acceptance Criteria

- `N` concurrent eligible `401 ACCESS_TOKEN_EXPIRED` responses create exactly one active refresh request per execution context, and every waiter settles.
- Successful refresh replays each eligible original request exactly once and returns its own replay result; no request can refresh or replay twice.
- Refresh itself, login, CSRF bootstrap, non-eligible calls, other `401` codes, every `403`, cancellation, and already-replayed requests do not refresh.
- A refresh-only transport failure is retried exactly once within the shared operation; a second transport failure stops recovery, retains auth/CSRF as unresolved, triggers no logout, and produces safe Persian connectivity behavior.
- Definitive backend refresh failures receive no retry, fail all waiters consistently, clear/transition authentication according to stable codes, and never loop.
- No periodic refresh, token persistence, cookie read, credential log/markup, Authorization/Bearer header, or cross-tab coordination is introduced.
- Focused concurrency/replay/failure/regression tests and relevant Admin/root typecheck, lint, build, formatting, documentation, dependency/configuration, and security inspections pass.

## Testing Impact

Automated tests required.

Focused coverage must prove one refresh for multiple simultaneous eligible failures, all waiter success/failure settlement, one replay per request, refresh transport retry exactly once, definitive failure without retry, second transport failure preserving recoverable state, exact eligibility exclusions, cancellation behavior, retry/recursion markers, memory-only CSRF, and regression of S1-T09/S1-T10 login/bootstrap/error behavior.

## Validation

- Preflight the Admin Workspace, installed Axios version, public API-origin configuration, existing test tooling, and whether a live Backend is necessary for the selected deterministic interceptor boundary.
- Review current Axios interceptor/cancellation documentation through Context7 and relevant installed Next.js 16.3.2 guidance.
- Run focused coordinator/interceptor concurrency, replay, failure, cancellation, and auth-state tests plus S1-T09/S1-T10 regressions.
- Inspect exact eligibility, one shared refresh, one controlled transport retry, one original replay, all waiter settlement, and recursion/loop prevention.
- Inspect for timers, broad retries, storage/cookie reads, Bearer construction, credential logging/markup/serialization, stale CSRF handling, and unauthorized task expansion.
- Run Admin typecheck, lint, build, frozen dependency verification, repository formatting, relevant root regression checks, local Markdown links, `git diff --check`, added-line secret scan, dependency/configuration scope, generated-output-ignore behavior, and read-only Git-index inspection.

## Documentation Impact

Document the single-flight ownership, exact refresh eligibility/exclusions, replay marker, one controlled refresh transport retry, definitive versus ambiguous failure transitions, tab boundary, and explicit remaining S1-T12 hardening work.

## Approval State

Awaiting Implementation Approval

# Current Task

## Task ID

S1-T12

## Title

Complete Authentication Verification and Hardening

## Status

Current

## Goal

Close the remaining accepted Admin Authentication vertical-slice gaps and prove the complete login, bootstrap, protected access, refresh recovery, current-session logout, authorization, failure-state, accessibility, security, and OpenAPI behavior before Sprint 1 completion.

## Why

S1-T01 through S1-T11 established the approved persistence, provisioning, Backend contracts, frontend login/protected shell, centralized Axios policy, and single-flight recovery boundaries. Sprint exit now requires cross-layer verification of those independently implemented pieces, correction of any in-scope contract or security gaps found, and completion of the remaining user-facing current-session flow without introducing later product scope.

## Required Context

The following is the Minimum Sufficient **Required Context** for this task:

- `docs/sprints/sprint-01.md`
- `docs/features/admin-auth/specification.md`
- `docs/security/authentication.md`
- `docs/security/authorization.md`
- `docs/security/baseline.md`
- `docs/architecture/frontend-architecture.md`
- `docs/api/conventions.md`
- `docs/standards/backend.md`
- `docs/standards/frontend.md`
- `docs/standards/testing.md`
- `docs/standards/execution.md`
- `docs/development/admin-login.md`
- `apps/api/src/authentication/`
- `apps/api/test/`
- `apps/admin/app/`
- `apps/admin/test/`
- Relevant generated Swagger/OpenAPI and installed Next.js 16.3.2 testing/accessibility guidance; use Context7 for current library APIs when implementation requires them.

This task spans the implemented authentication slice, so its verification context is intentionally cross-Workspace but excludes unrelated catalog, Storefront, deployment, and future authorization-management work.

## Scope

- Audit every accepted Admin Authentication scenario and trace it to implemented behavior and meaningful automated coverage.
- Complete the frontend current-session logout interaction against the implemented no-body `POST /auth/logout`, including CSRF, pending, success, failure, credential clearing, redirect, and accessible Persian RTL behavior.
- Add or strengthen the smallest missing unit, integration, API/e2e, frontend integration, and critical-flow coverage needed for login, bootstrap, protected access, refresh, logout, disable enforcement, authorization, concurrency, cancellation, and failure distinctions.
- Verify Backend authentication/authorization enforcement, cookie and CSRF contracts, rotation/recovery/reuse behavior, throttling, safe failure envelopes, and credential/log redaction against the accepted specification.
- Verify Swagger/OpenAPI matches every implemented authentication HTTP contract and contains no affected drift.
- Verify frontend accessibility, focus/keyboard behavior, loading/error/retry states, mixed-direction content, safe return routing, and no protected-content flash.
- Fix only authentication-slice defects or stale documentation discovered by the audit, with regression coverage proportionate to risk.
- Run the Sprint completion validation and reconcile canonical documentation with implemented reality.

## Out of Scope

- Customer authentication, password reset, MFA, SSO/social login, `logout-all`, session-management UI, full Role/Permission administration, or business/catalog UI.
- New auth architecture, cross-tab refresh coordination, proactive refresh, distributed throttling, Redis, observability platforms, deployment infrastructure, or Storefront work.
- Dependency changes, Prisma schema/migrations, cookie/CSRF/signing contract changes, or broad refactors unless a concrete acceptance-blocking defect requires a separately surfaced owner decision.
- Test-count or coverage-percentage work that does not protect meaningful accepted behavior.

## Expected Changes

- Add the narrow Admin logout adapter/provider/UI path and focused user-observable tests if the audit confirms the existing gap.
- Strengthen existing Backend/Admin test suites and contract-drift assertions only where accepted scenarios lack sufficient proof.
- Correct any small authentication-slice implementation defect found during verification without expanding architecture.
- Reconcile Sprint/authentication/development documentation and produce the final Sprint completion record when all exit criteria pass.

## Constraints

- Backend authorization remains authoritative; frontend visibility is never authorization.
- Preserve direct credentialed cookie authentication, memory-only session CSRF, exact origin enforcement, stable codes, and current cookie/rotation contracts.
- Preserve exact refresh eligibility, single-flight/replay bounds, definitive-versus-ambiguous failure distinctions, and no token persistence, cookie reads, Bearer construction, credential logging, or periodic refresh.
- Preflight PostgreSQL/Docker and required environment configuration before database-backed verification; do not install system software or alter infrastructure without approval.
- Do not add/remove/upgrade dependencies, modify Prisma schema/migrations, or change HTTP contracts without explicit owner approval.
- Prefer focused gap closure and existing patterns over new abstractions; record any genuine acceptance-blocking Open Decision and stop only for that decision.

## Acceptance Criteria

- Login, reload bootstrap, protected access, eligible refresh recovery, current-session logout, and post-logout denial form a complete tested vertical slice with no protected-content flash or false authentication state.
- Backend tests prove accepted positive, negative, concurrency, throttling, rotation/recovery/reuse, disabled-Admin, authorization, CSRF/origin, cookie, redaction, and current-session logout behavior.
- Frontend tests prove stable Persian RTL login/logout and failure states, accessibility/keyboard behavior, safe redirects, memory-only credential lifecycle, exact refresh distinctions, bounded retry, cancellation, and protected routing.
- Every implemented authentication endpoint's generated Swagger/OpenAPI contract matches tested status, body, cookie, header, security, and stable-error behavior.
- Security inspection finds no credential persistence/read/logging/markup, unsafe redirect, broad retry, refresh recursion, authorization bypass, stale CSRF misuse, or secret material.
- Sprint 1 Acceptance Criteria and Definition of Done are traceably satisfied; relevant tests, typecheck, lint, build, formatting, documentation, configuration, database, dependency, and repository-scope checks pass.
- No unrelated or unapproved dependency, schema/migration, Backend contract, Storefront, catalog, Git-index, or generated-output change is introduced.

## Testing Impact

Automated tests required.

Use the existing unit, database integration, API/e2e, frontend component/integration, and critical-flow suites. Add or update only meaningful coverage needed to close verified gaps, with particular attention to the frontend logout flow and cross-layer authentication transitions.

## Validation

- Preflight exact dependency versions, Admin API-origin configuration, authentication environment completeness, PostgreSQL/Docker health and isolated test database, required CLIs, and generated OpenAPI availability before broad execution.
- Build an acceptance-to-test trace for the feature specification and inspect existing coverage before adding tests.
- Run focused Backend/Admin suites for every changed or newly verified gap, then the complete authentication and Sprint-relevant regression suites.
- Verify generated Swagger/OpenAPI drift for login, refresh, logout, CSRF bootstrap, and current Admin endpoints.
- Run API/Admin and repository-wide typecheck, lint, build, frozen dependency verification, and formatting.
- Inspect accessibility/RTL semantics, exact auth-state transitions, cookies/CSRF/origin/authorization, refresh bounds, redaction, secrets, timers/retries, storage/cookie reads, safe redirects, dependency/schema/configuration scope, generated-output ignore behavior, local Markdown links, `git diff --check`, and the read-only Git index.
- Verify every Sprint exit criterion before marking Sprint 1 Completed; if it is final and passes, clear `current.md`, mark the Sprint Completed, and identify the next roadmap Sprint without activating it.

## Documentation Impact

Reconcile only authentication, development, API/security, repository-status, and Sprint documentation made stale by final gap closure or verification. Record actual validation and any Deferred follow-up without duplicating implementation detail.

## Approval State

Awaiting Implementation Approval

# Current Task

## S2-T10 — Complete Catalog Foundation Verification

## Goal

Audit the complete implemented Sprint 2 catalog foundation against its accepted specification, persistence design, security rules, API/OpenAPI contracts, testing requirements, and Sprint exit criteria; close only confirmed in-scope gaps and produce an evidence-backed readiness handoff for Sprint 3 and Sprint 4 consumers.

## Why

All planned Sprint 2 implementation slices are complete. A final integrated verification is required to catch cross-slice drift that focused tasks may not expose, confirm the Backend and persistence contracts are coherent as one foundation, and ensure the Sprint is genuinely complete before activation moves to later Admin and Storefront work.

## Minimum Sufficient Required Context

- [Sprint 2 plan](../../sprints/sprint-02.md), especially scope, accepted decisions, Out of Scope, Definition of Done, and Exit Criteria.
- [Clothing Catalog specification](../../features/catalog/specification.md), treated as the canonical observable behavior and contract map for the complete Sprint 2 slice.
- [Implemented S2-T02 persistence design](s2-t02-schema-proposal.md), narrowed to accepted models, constraints, indexes, triggers, transaction rules, permissions, Image cleanup, and test strategy.
- Sprint 2 [queue](queue.md) and [done records](done.md) for implemented-slice traceability and validations already executed.
- Implemented catalog/authentication/environment/application code and focused tests under `apps/api/src/` and `apps/api/test/`, plus the two reviewed migrations.
- [Testing standards](../../standards/testing.md), [security baseline](../../security/baseline.md), [authorization](../../security/authorization.md), [Backend standards](../../standards/backend.md), [Backend architecture](../../architecture/backend-architecture.md), and [API conventions](../../api/conventions.md), narrowed to Sprint exit verification, public/protected separation, media safety, data integrity, safe failures, and OpenAPI drift.

Frontend/Next.js guides, Admin/Storefront UI, Sprint 3/4 implementation, new catalog features, deployment, later commerce domains, and unrelated completed-Sprint internals are not required unless a concrete regression reveals a direct dependency.

## Scope

- Build a concise traceability audit from Sprint 2 requirements/exit criteria to implemented persistence, runtime contracts, tests, and documentation.
- Verify Category, Product/Variant, Inventory, Product Image/cleanup, price-display-setting, permission, and minimum public-read behavior together, including cross-slice lifecycle and authorization invariants.
- Verify Prisma schema and both reviewed migrations still match the approved persistence proposal, native constraints/triggers/indexes, singleton/reference state, and additive/no-unapproved-data-loss requirements.
- Verify protected/public separation, exact permissions, CSRF/current-session enforcement, safe projections, stable errors, and production Swagger/media-storage fail-closed behavior.
- Verify generated Swagger/OpenAPI has no path/method/security/parameter/schema/status drift across every Sprint 2 route.
- Exercise meaningful complete-suite PostgreSQL, concurrency, media security/cleanup, authentication-regression, typecheck, lint, build, formatting, scope, cleanup, and Git checks.
- Close only confirmed gaps already required by accepted Sprint 2 behavior, using the smallest coherent changes and focused regression tests.
- Update Sprint/project reality and complete the Sprint only after all exit criteria pass.

## Out of Scope

- New Product, Variant, Category, Inventory, Image, price, public-discovery, or permission behavior beyond the accepted Sprint 2 specification.
- Admin Panel or Storefront catalog UI, final slugs/URLs/SEO, search, descendant browsing, selectable sorting, galleries, recommendations, Cart, Checkout, Orders, Payments, or customer identity.
- Production object-storage/CDN provider selection, image transformation, generic jobs/outbox, reservations/history/locations, role-management UI, deployment, or observability expansion.
- Refactoring for style, generalized abstractions, broad renaming of legacy identifiers, or speculative performance infrastructure.
- Prisma schema/migration/reference-data or dependency changes unless the audit proves a blocking mismatch and the owner separately approves the required boundary.
- Staging, committing, pushing, merging, rebasing, branching, or destructive database/storage reset without separate authorization.

## Expected Changes

- Primarily verification evidence and narrow Sprint/project documentation.
- Focused API code/test/OpenAPI corrections only if a concrete accepted-requirement gap is reproduced.
- Sprint 2 queue/current/done and roadmap/project status transition only when every exit criterion passes.

No feature expansion, dependency, Prisma schema/migration, reference-data, Admin, or Storefront change is expected.

## Constraints

- Treat planned documentation as requirements, not evidence; verify executable behavior and generated contracts directly.
- Reuse valid prior focused tests but run the complete real-PostgreSQL suite and required quality gates after any correction.
- Preserve exact Backend authorization as authoritative, public lifecycle filtering, optimistic concurrency, Product aggregate invariants, canonical rial storage, and Product Image safety/cleanup semantics.
- Do not weaken a test or acceptance criterion to make the audit pass; reproduce and fix in-scope defects at their owning boundary.
- Keep database/storage checks isolated to the approved disposable local test environment and leave no fixtures or temporary objects.
- Surface any genuine persistence/dependency/Product/architecture mismatch requiring new approval rather than silently crossing its boundary.

## Acceptance Criteria

- Every Sprint 2 exit criterion and accepted specification section maps to implemented code/persistence plus meaningful passing automated evidence, with no unexplained gaps or stale implementation claims.
- Prisma schema/migrations expose exactly the approved catalog models, relations, constraints, triggers, indexes, singleton setting, permissions, and explicit `SUPER_ADMIN` grants, with development/test identity isolation intact.
- Category/Product/Variant/Inventory/Image/setting mutations preserve their atomicity, lifecycle, normalization, uniqueness, version, cleanup, and exact-permission rules under representative failures and races.
- Protected reads require current authentication and exact permissions; unsafe requests require CSRF/origin; public reads require neither and expose only Active/allowlisted data.
- Product Image validation/storage/content/compensation/retry behavior remains strict and leak-free; production remains fail-closed without an approved provider.
- Public and protected Product/Category/Image/setting projections, paging/filtering/order, price/availability, not-found indistinguishability, and safe error envelopes match the specification.
- Generated Swagger/OpenAPI exactly matches every Sprint 2 implemented path, method, input, response schema/status, protected security, mutation CSRF, public absence of cookie security, and production exposure rule.
- Complete API real-PostgreSQL tests and relevant Sprint 1 regressions pass, along with API/root typecheck, lint, build, formatting, Prisma validation/generation as applicable, database identity/cleanup, `git diff --check`, scope, generated-artifact, and clean Git-index checks.
- Sprint 2 documentation reflects implemented reality without claiming later Admin/Storefront or commerce behavior, and the Sprint is marked Completed only after its exit criteria pass.

## Testing Impact

Full Backend and repository verification required.

- Run the complete API test suite against the isolated real PostgreSQL test database, including all catalog persistence/concurrency, protected/public HTTP, authorization/current-state/CSRF, Image security/storage/cleanup, stable-error, and OpenAPI suites.
- Add only focused regression tests for reproduced cross-slice gaps not already covered.
- Run Prisma validate/generate checks if their outputs can be verified without creating unapproved tracked artifacts; inspect reviewed migration/schema/reference-data drift directly.
- Run API and repository typecheck, lint, build, and formatting gates at the breadth required by changed areas.
- Verify database fixture cleanup, Product Image temporary storage cleanup, no unintended generated artifacts, no prohibited scope, and no staged/index mutation.

## Swagger / OpenAPI Impact

Verification required. No new route is expected. Audit every implemented Sprint 2 protected/public operation for exact paths, methods, parameters, DTO schemas, response statuses, stable visible failures, cookie security, CSRF headers, and production documentation disablement. Correct only reproduced drift within accepted contracts.

## Validation

- Preflight PostgreSQL/Docker identity and isolation before the complete suite.
- Create a requirement-to-evidence checklist from the Sprint plan/specification, then inspect code/tests/generated OpenAPI and native schema/migration definitions for each boundary.
- Run focused checks for any reproduced gap, then the complete API PostgreSQL suite after the final source change.
- Run Prisma validate/generate, API/root typecheck, lint, build, and formatting according to repository tooling and changed scope.
- Run changed-document local-link validation, `git diff --check`, prohibited-scope/dependency/schema/migration/frontend/generated-artifact, database/storage cleanup, and read-only Git-index inspections.
- Record only validations actually executed and their real results.

## Documentation Impact

On success, append the concise S2-T10 completion record, clear `current.md`, verify and mark Sprint 2 Completed, and identify Sprint 3 as the next intended roadmap Sprint without activating it. If Sprint 3 lacks an approved detailed plan/queue, stop and ask whether to plan Sprint 3 from the roadmap.

## Approval State

Awaiting Implementation Approval

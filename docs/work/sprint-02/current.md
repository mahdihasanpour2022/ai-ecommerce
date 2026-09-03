# Current Task

## S2-T06 — Implement Minimum Inventory Contracts

## Goal

Implement the minimum authenticated Admin Inventory contract: preserve exact Inventory reads in protected Product detail and add an optimistic-version absolute on-hand update that is atomic, non-negative, lifecycle-aware, permission/CSRF protected, stable under concurrency, and synchronized with Swagger/OpenAPI.

## Why

S2-T05 established one Inventory row per retained Variant and exposes its exact quantity/version through Product detail. The Admin needs one safe write boundary before Sprint 3 can manage stock without last-write-wins behavior or pulling reservations, history, warehouses, or Checkout semantics into the catalog foundation.

## Minimum Sufficient Required Context

- [Clothing Catalog specification](../../features/catalog/specification.md), narrowed to Inventory state/availability/update semantics, Product lifecycle interaction, protected Inventory route/DTO, authorization, stable failures, transactions, Swagger/OpenAPI, and Inventory tests.
- [Sprint 2 plan](../../sprints/sprint-02.md), especially Inventory decisions, authorization, Out of Scope, and Exit Criteria.
- [Implemented S2-T02 persistence design](s2-t02-schema-proposal.md), narrowed to Inventory fields/checks/version trigger, one-to-one Variant relation, Product aggregate locking, guarded absolute update algorithm, concurrency behavior, and failure mapping.
- Implemented Product/Variant/catalog and authentication patterns in `apps/api/src/catalog/`, `apps/api/src/authentication/`, `apps/api/src/application.ts`, and `apps/api/src/database/prisma.service.ts`.
- [Backend standards](../../standards/backend.md), [Backend architecture](../../architecture/backend-architecture.md), [Authorization](../../security/authorization.md), and [Testing standards](../../standards/testing.md), narrowed to protected HTTP behavior, optimistic concurrency, safe errors, OpenAPI, and PostgreSQL integration coverage.

Frontend/Next.js guides, Inventory history/reservations/locations, Checkout stock behavior, Product Image operations, display settings, public catalog, later commerce domains, and future Role composition are not required.

## Scope

- Reuse the S2-T05 Product detail DTO as the exact protected Inventory read boundary; do not add a redundant standalone read route without an accepted requirement.
- Implement `PUT /api/v1/admin/catalog/variants/{variantId}/inventory` with exactly `onHandQuantity` and last-read `version`.
- Require `inventory.update` plus session-bound CSRF and current Sprint 1 authentication for the mutation.
- Lock the owning Product, reject Archived Product mutation, then issue one version-matched absolute Inventory update that increments version exactly once.
- Distinguish missing Variant/Inventory from stale version without exposing the current value on conflict and without automatic retry.
- Enforce non-negative database-range quantity and positive database-range version validation, stable errors, explicit response DTO projection, and matching Swagger/OpenAPI.
- Add focused unit, real-PostgreSQL integration, authorization, rollback, concurrency, and OpenAPI tests.
- Update only narrow Inventory/API documentation required by implemented reality.

## Out of Scope

- Inventory reservations, available/reserved split, adjustment/event history, audit log, multiple locations/warehouses, allocation, Redis/distributed locking, or bulk updates.
- Checkout decrement/release, Cart availability guarantees, Order/Payment failure behavior, or oversell policy.
- Product/Variant lifecycle or content contract changes beyond enforcing the accepted Archived mutation boundary.
- Product Image, display-setting, public catalog, Admin Panel, or Storefront work.
- Prisma schema/migration/reference-data changes, dependency changes, environment changes, production infrastructure, or unrelated catalog/authentication refactors.
- Staging, committing, pushing, rebasing, branching, or destructive database reset without separate authorization.

## Expected Changes

- Focused Inventory DTO/error/service/repository/controller additions under `apps/api/src/catalog/`, reusing the existing Product aggregate and catalog guard boundaries where coherent.
- Minimal catalog module registration and CORS addition for `PUT`.
- Focused `apps/api/test/` Inventory validation, PostgreSQL HTTP/concurrency, authorization, and OpenAPI coverage.
- Generated OpenAPI is verified through tests rather than committed unless an existing tracked workflow requires it.
- Narrow catalog/API documentation and Sprint execution records only.

No Prisma schema, migration, package manifest, lockfile, Admin, or Storefront change is expected.

## Relevant Existing Architecture

- The API is a NestJS Modular Monolith with one API-owned Prisma client and PostgreSQL database.
- S2-T03 implemented one-to-one Inventory, non-negative quantity, positive/version-step constraints, and deferred Product aggregate validation.
- S2-T05 creates Inventory atomically with every Variant, exposes exact quantity/version in Product detail, and serializes aggregate mutations through a Product row lock.
- The catalog guard already enforces current authentication, exact permission metadata, and session-bound CSRF for unsafe methods.

## API Changes

- Add `PUT /api/v1/admin/catalog/variants/{variantId}/inventory` requiring `inventory.update` and CSRF.
- Accept exactly `{ "onHandQuantity": <non-negative integer>, "version": <positive integer> }` within PostgreSQL integer bounds.
- Return `200` with exactly `{ "onHandQuantity": <integer>, "version": <incremented integer> }`.
- Use `400 VALIDATION_FAILED`, existing authentication failures, `403 INSUFFICIENT_PERMISSION`/`CSRF_VALIDATION_FAILED`, `404 PRODUCT_VARIANT_NOT_FOUND`, `409 PRODUCT_LIFECYCLE_CONFLICT`, and `409 INVENTORY_VERSION_CONFLICT` as applicable.

## Database Changes

None. Use the implemented S2-T03 Inventory table, one-to-one foreign key, checks, version trigger, and Product aggregate constraints. No schema, migration, seed, or reference-data change is authorized.

## Security Implications

- Backend `inventory.update` enforcement is authoritative; `catalog.manage`, UI visibility, or possession of an Admin cookie is insufficient.
- The mutation requires the trusted Origin/session-bound CSRF boundary.
- Variant UUID, quantity, and version are strictly validated; responses and conflicts omit current stock on stale writes and never expose database internals.
- Product locking excludes concurrent lifecycle/Variant mutations from producing an invalid final aggregate.
- The service does not retry stale writes, preventing an outdated caller from silently overwriting newer stock.

## Edge Cases

- Malformed/non-canonical Variant UUID, unknown or missing body fields, booleans/floats/strings, negative or out-of-range quantity, zero/negative/out-of-range version.
- Missing Variant or missing Inventory versus stale expected version.
- Successful zero quantity, unchanged absolute quantity with a matching version, and maximum accepted integer values.
- Version increments exactly once; a failed/stale/Archived request changes neither quantity nor version.
- Concurrent requests with the same expected version select exactly one winner and never produce a negative quantity or version jump.
- Archived owning Product rejects mutation; Draft and Active Products permit zero or positive quantity without changing lifecycle.
- Missing authentication, wrong exact permission, invalid CSRF/origin, disabled/revoked sessions, and safe unexpected failures.

## Constraints

- Preserve exact Variant-owned Inventory, absolute-set, optimistic-version, non-negative quantity, and no-auto-retry semantics.
- Lock the owning Product before the guarded update and perform classification reads inside the same bounded transaction.
- Do not return the current quantity/version on `INVENTORY_VERSION_CONFLICT`.
- Reuse existing catalog authorization, Product aggregate, error-envelope, Prisma, and Swagger patterns without speculative abstractions.
- Do not modify S2-T03 persistence or pull reservations, Checkout, public, media, settings, or UI work forward.
- No dependency, environment, or generated-artifact changes without separate approval.

## Acceptance Criteria

- Protected Product detail continues to return exact Inventory `{ onHandQuantity, version }` for every retained Variant without exposing persistence internals.
- The Inventory `PUT` route implements the exact method, path, status, `inventory.update`/CSRF boundary, strict request validation, and minimal response DTO.
- One matching version atomically sets the absolute non-negative quantity and increments version exactly once.
- Missing Variant/Inventory, stale version, and Archived lifecycle cases map to the accepted stable errors; failed requests do not mutate Inventory.
- Concurrent same-version updates produce one success and one `INVENTORY_VERSION_CONFLICT`, with stored state matching only the winner.
- Authentication, exact permission, CSRF/origin, disabled/revoked state, and safe error-envelope behavior match existing API conventions.
- Meaningful unit and real-PostgreSQL integration/concurrency tests pass, including zero/max values, validation, authorization, lifecycle, rollback, and race cases.
- Generated Swagger/OpenAPI exactly documents the path, UUID, request/response ranges, cookie authorization, CSRF header, statuses, and stable failures; production documentation exposure remains unchanged.
- Relevant Sprint 1 and S2-T03 through S2-T05 regressions, API typecheck/lint/build/test, formatting, scope, and Git checks pass.

## Testing Impact

Full Backend HTTP and PostgreSQL behavior testing required.

- Unit-test strict Inventory request parsing and error classification where isolated logic is meaningful.
- Add real-PostgreSQL API coverage for successful absolute updates, zero/max values, version increment, stale rollback, missing state, Archived rejection, exact permission, and CSRF.
- Add an independent-request same-version race proving exactly one update succeeds and persisted state/version reflect only that winner.
- Run relevant authentication, Category, Product/Variant, and catalog persistence regressions.

## Swagger / OpenAPI Impact

Required. Add the exact protected Inventory operation, cookie authentication, `inventory.update` and CSRF descriptions, UUID path parameter, bounded integer request/response schemas, success status, and stable error responses. Generated OpenAPI must match tested behavior and remain disabled in production.

## Validation

- Preflight the approved PostgreSQL test identity before integration work; no reset without separate approval.
- Run focused Inventory unit/integration/concurrency/OpenAPI tests and relevant authentication/catalog regressions.
- Run API Prisma generation only if required by ignored generated output, then API test, typecheck, lint, and build gates.
- Run repository formatting, local Markdown-target, `git diff --check`, prohibited-scope, dependency/lockfile/environment/schema/migration/frontend, generated-artifact, database-cleanup, and read-only Git-index inspections.
- Record only checks actually executed and their real results.

## Documentation Impact

Update catalog/API implementation reality and Sprint records only after executable verification passes. On success, archive S2-T06 and automatically prepare S2-T07; stop before display-setting implementation.

## Approval State

Awaiting Implementation Approval

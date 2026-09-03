# Current Task

## S2-T04 — Implement Protected Nested-Category Contracts

## Goal

Implement the authenticated protected Admin Category contract: complete bounded tree retrieval plus create, rename/atomic-move, and eligible empty-leaf deletion with exact authorization, CSRF, normalization, stable errors, concurrency safety, and synchronized Swagger/OpenAPI.

## Why

Products require a valid Category, and later Admin/Public catalog slices need one authoritative hierarchy service. Implementing Category behavior directly over the verified S2-T03 persistence boundary prevents later Product/UI tasks from duplicating hierarchy validation or weakening database-backed race safety.

## Minimum Sufficient Required Context

- [Clothing Catalog specification](../../features/catalog/specification.md), narrowed to Category hierarchy/normalization, protected Category routes and DTOs, authorization, stable failures, transaction requirements, Swagger/OpenAPI, and Category tests.
- [Sprint 2 plan](../../sprints/sprint-02.md), especially Category scope, authorization, Out of Scope, and Exit Criteria.
- [Implemented S2-T02 persistence design](s2-t02-schema-proposal.md), narrowed to Category fields, null-equal sibling uniqueness, hierarchy trigger/advisory lock, restrictive relations, failure mapping, and transaction rules.
- Existing API authentication/authorization/error/OpenAPI patterns in `apps/api/src/authentication/`, `apps/api/src/application.ts`, `apps/api/src/app.module.ts`, and `apps/api/src/database/prisma.service.ts`.
- [Backend standards](../../standards/backend.md), [Backend architecture](../../architecture/backend-architecture.md), [Authorization](../../security/authorization.md), and [Testing standards](../../standards/testing.md), narrowed to protected HTTP behavior, transactions, safe errors, OpenAPI, and meaningful integration coverage.

Frontend/Next.js guides, Product/Variant/Inventory/Image/settings/public-catalog implementation details, future Role composition, and later commerce specifications are not required.

## Scope

- Add the smallest coherent catalog/Category module boundary using the existing API-owned Prisma client and authentication infrastructure.
- Implement `GET /api/v1/admin/catalog/categories` for the complete deterministic tree, capped by the persisted 1,000-Category invariant.
- Implement `POST /api/v1/admin/catalog/categories` with normalized required name and optional nullable `parentId`.
- Implement `PATCH /api/v1/admin/catalog/categories/{categoryId}` with at least one of name/nullable parent, supporting atomic rename and subtree move.
- Implement `DELETE /api/v1/admin/catalog/categories/{categoryId}` for eligible empty leaves only.
- Enforce `catalog.read` for retrieval and `catalog.manage` plus session CSRF for mutations through the existing Backend-authoritative guards.
- Acquire the catalog advisory transaction lock before hierarchy validation reads/writes; map known constraints/trigger failures and operation context to stable Category errors without leaking database details.
- Add exact DTO validation, response projection, deterministic tree construction, focused unit/integration/concurrency tests, and matching generated Swagger/OpenAPI assertions.
- Update only narrow Category/API documentation required by implemented reality.

## Out of Scope

- Product, Product Variant, Inventory, Product Image, cleanup, price-display setting, or public catalog routes/services.
- Admin Panel or Storefront UI, forms, navigation, or frontend API integration.
- Category publication/archive, slugs, search, selectable sorting, descendant-inclusive Product filtering, multi-category Product membership, or hard-delete cascade behavior.
- Prisma schema/migration/reference-data changes, dependency changes, environment changes, production infrastructure, or unrelated authentication refactors.
- Staging, committing, pushing, rebasing, branching, or destructive database reset without separate authorization.

## Expected Changes

- Focused `apps/api/src/catalog/` Category module/controller/service/repository/DTO/error files, reusing existing cross-cutting infrastructure.
- Minimal API module registration changes.
- Focused `apps/api/test/` Category unit/integration/concurrency/OpenAPI tests.
- Generated client remains reproducible and ignored; generated OpenAPI is verified through tests rather than committed unless an existing tracked workflow requires it.
- Narrow catalog/API documentation and Sprint execution records only.

No Prisma schema, migration, package manifest, lockfile, Admin, or Storefront change is expected.

## Relevant Existing Architecture

- The API is a NestJS Modular Monolith with one API-owned Prisma client and PostgreSQL database.
- S2-T03 implemented Category UUID/name/name-key/parent/timestamps, null-equal sibling uniqueness, restrictive child/Product foreign keys, a 1,000-row cap, six-level/cycle-safe trigger, and shared advisory lock `pg_advisory_xact_lock(1120002, 1)`.
- Sprint 1 authentication resolves current session/role/permission state from PostgreSQL; Backend guards and session-bound CSRF remain authoritative.
- Existing controllers use explicit DTOs, safe stable error envelopes, no-store behavior where applicable, and exact Swagger metadata.

## API Changes

- Add `GET /api/v1/admin/catalog/categories` requiring `catalog.read`; return the complete nested Category tree.
- Add `POST /api/v1/admin/catalog/categories` requiring `catalog.manage` and CSRF; return `201` with the normalized Category DTO.
- Add `PATCH /api/v1/admin/catalog/categories/{categoryId}` requiring `catalog.manage` and CSRF; return `200` with the normalized Category DTO.
- Add `DELETE /api/v1/admin/catalog/categories/{categoryId}` requiring `catalog.manage` and CSRF; return `204`.
- Use `400 VALIDATION_FAILED`, `401` existing authentication failures, `403 INSUFFICIENT_PERMISSION`/`CSRF_VALIDATION_FAILED`, `404 CATEGORY_NOT_FOUND`, and the approved `409` Category conflict codes.

## Database Changes

None. Use the implemented S2-T03 Category table, indexes, foreign keys, trigger, and advisory lock. No schema, migration, seed, or reference-data change is authorized.

## Security Implications

- Backend permission checks are authoritative; route visibility or possession of an Admin cookie is insufficient.
- Every mutation requires the existing trusted Origin/session-bound CSRF boundary; reads do not mutate or issue credentials.
- UUID/name/parent inputs are validated and normalized before persistence. Raw Prisma/PostgreSQL errors, SQL, internal name keys, and stack details never enter responses.
- Advisory locking and in-transaction rechecks prevent concurrent moves/renames/deletes from bypassing hierarchy invariants.
- Response DTOs expose only approved Category fields; persistence-only normalized keys remain internal.

## Edge Cases

- Empty/whitespace/overlong names, unknown fields, malformed UUIDs, and empty PATCH bodies.
- Root versus non-root normalized sibling conflicts, case/Unicode-equivalent names, and same name under different parents.
- Missing parent/Category, self-parent, descendant cycle, six-level success, seventh-level/subtree overflow, and no-op/combined rename-move semantics.
- Category cap at 1,000, deterministic complete-tree ordering, and safe construction without recursion failure.
- Delete with direct children or any Product lifecycle reference; no cascade.
- Concurrent sibling creates/renames, opposing moves, move versus delete, and stable domain-error classification.
- Missing authentication, insufficient permission, invalid CSRF/origin, disabled/revoked sessions, and safe unexpected failures.

## Constraints

- Preserve the accepted routes, fields, normalization semantics, error codes, Category cap, six-level root-at-one model, and persisted permission names exactly.
- Acquire the approved advisory lock before hierarchy reads in every mutation transaction; service prechecks alone are insufficient.
- Reuse the existing authentication, CSRF, error-envelope, Prisma, and Swagger patterns without speculative shared abstractions.
- Do not modify the S2-T03 schema/migration or pull Product/public/UI work forward.
- No dependency, environment, or generated-artifact changes without separate approval.

## Acceptance Criteria

- All four protected Category routes implement the exact methods, paths, statuses, permission/CSRF boundaries, request validation, and response DTOs.
- Tree retrieval returns every Category once in a deterministic complete nested tree with correct immutable IDs, names, nullable parents, levels, and children; persistence-only keys are absent.
- Create/rename/move normalize consistently and enforce root/non-root sibling uniqueness, parent existence, Category cap, cycles, and six-level subtree depth under concurrency.
- Delete succeeds only for an empty leaf and maps child/Product references to `CATEGORY_NOT_EMPTY` without cascade.
- Known uniqueness/FK/trigger outcomes map to the approved stable errors; unexpected database details remain internal.
- Authentication, permission, CSRF/origin, disabled/revoked state, and safe error-envelope behavior match existing API conventions.
- Meaningful unit/integration/concurrency tests pass against PostgreSQL, including success, validation, conflict, authorization, rollback, and race cases.
- Generated Swagger/OpenAPI exactly documents routes, schemas, UUIDs, nullable parent, authorization, CSRF requirements, success statuses, and stable failures; production documentation exposure remains unchanged.
- Relevant Sprint 1 and S2-T03 regressions, API typecheck/lint/build/test, formatting, scope, and Git checks pass.

## Testing Impact

Full Backend HTTP and PostgreSQL behavior testing required.

- Unit-test deterministic normalization/tree mapping/error classification where isolated logic is meaningful.
- Add real-PostgreSQL integration/API coverage for all routes, transaction rollback, hierarchy depth/cycle/cap, restrictive deletion, permission/CSRF, and stable envelopes.
- Add independent-connection races for sibling uniqueness and conflicting hierarchy mutation where existing S2-T03 persistence tests do not already prove the service/HTTP boundary.
- Run relevant authentication and catalog persistence regressions.

## Swagger / OpenAPI Impact

Required. Add exact protected Category path/operation metadata, cookie authentication, permission and CSRF descriptions, request/response schemas, UUID/nullable-parent constraints, statuses, and stable error responses. Generated OpenAPI must match tested behavior and remain disabled in production.

## Validation

- Preflight the approved PostgreSQL test identity before integration work; no reset without separate approval.
- Run focused Category unit/integration/concurrency/OpenAPI tests and the relevant existing authentication/persistence regressions.
- Run API Prisma generation if required by ignored generated output, then API test, typecheck, lint, and build gates.
- Run repository formatting, local Markdown-target, `git diff --check`, prohibited-scope, dependency/lockfile/environment/schema/migration/frontend, generated-artifact, database-cleanup, and read-only Git-index inspections.
- Record only checks actually executed and their real results.

## Documentation Impact

Update the catalog/API implementation reality and Sprint records only after executable verification passes. On success, archive S2-T04 and automatically prepare S2-T05; stop before Product/Variant implementation.

## Approval State

Awaiting Implementation Approval

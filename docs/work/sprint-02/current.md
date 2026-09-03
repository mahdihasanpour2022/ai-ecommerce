# Current Task

## S2-T05 — Implement Protected Product and Variant Contracts

## Goal

Implement the authenticated protected Admin Product and Product Variant contracts: bounded retrieval, atomic Draft creation with initial Variants and Inventory, Product updates and lifecycle transitions, Variant creation/update/reactivation, exact normalization and invariants, stable errors, concurrency safety, and synchronized Swagger/OpenAPI.

## Why

Product and Variant are the catalog's customer-facing and sellable identity boundaries. Their protected contracts must establish canonical Category membership, lifecycle, SKU, option-mode, price, and Inventory ownership behavior before later Inventory, Product Image, Admin UI, and public-catalog tasks can build on them safely.

## Minimum Sufficient Required Context

- [Clothing Catalog specification](../../features/catalog/specification.md), narrowed to shared validation, Product/Product Variant behavior, canonical pricing, protected routes and DTOs, authorization, stable failures, transaction requirements, Swagger/OpenAPI, and Product/Variant tests.
- [Sprint 2 plan](../../sprints/sprint-02.md), especially Product/Variant decisions, protected capabilities, authorization, Out of Scope, and Exit Criteria.
- [Implemented S2-T02 persistence design](s2-t02-schema-proposal.md), narrowed to Product, Product Variant, Inventory creation, Category relation, normalized keys, uniqueness, lifecycle/aggregate constraints, Product row locking, failure mapping, and indexes.
- Existing Category/catalog and authentication patterns in `apps/api/src/catalog/`, `apps/api/src/authentication/`, `apps/api/src/application.ts`, and `apps/api/src/database/prisma.service.ts`.
- [Backend standards](../../standards/backend.md), [Backend architecture](../../architecture/backend-architecture.md), [Authorization](../../security/authorization.md), and [Testing standards](../../standards/testing.md), narrowed to protected HTTP behavior, atomic aggregates, safe errors, OpenAPI, and meaningful integration coverage.

Frontend/Next.js guides, Inventory mutation, Product Image file lifecycle/content routes, display-setting behavior, public catalog behavior, later commerce domains, and future Role composition are not required.

## Scope

- Extend the existing catalog module with focused Product/Variant controller, service, repository, DTO, and error boundaries.
- Implement protected deterministic page-bounded Product summaries with accepted defaults, exact Category/status filters, and fixed ordering; implement protected Product detail with all retained Variants, exact Inventory, ready Image metadata/order, and explicit DTO projection.
- Implement atomic Product creation as server-owned `DRAFT`, requiring a valid Category and one or more valid initial Variants, with exactly one Inventory row per Variant and accepted optional initial quantity.
- Implement Product field updates and only accepted lifecycle transitions, including in-transaction completeness checks for every Active-state transition or mutation.
- Implement Variant creation plus Inventory and Variant updates/reactivation while preserving immutable Product/Variant identities and Variant ownership.
- Enforce normalized Product text, global normalized SKU uniqueness, within-Product normalized size/color uniqueness, default-versus-named active mode, canonical safe-integer rial price, retained-Variant, and Archived immutability rules.
- Enforce `catalog.read` for reads and `catalog.manage` plus session CSRF for mutations through the existing Backend-authoritative catalog guard.
- Lock/recheck the Product aggregate and relevant Category, Variant, Inventory, and ready-main-Image state within bounded transactions; map known persistence failures to stable Product/Variant errors without leaking database details.
- Add exact validation, response projection, focused unit/integration/concurrency tests, and matching generated Swagger/OpenAPI assertions.
- Update only narrow Product/Variant/API documentation required by implemented reality.

## Out of Scope

- Inventory update contracts, Product Image upload/content/reorder/replacement/removal, display-setting contracts, or public catalog routes.
- Admin Panel or Storefront UI, forms, navigation, or frontend API integration.
- Product hard delete, Variant hard delete, multi-category membership, Brand, slugs, search, selectable sorting, descendant Category filtering, generic attributes/options, price history, discounts, tax, reservations, or inventory history.
- Creating a shortcut around activation completeness because Product Image upload is implemented later; tests may arrange persisted ready Image fixtures through the approved database boundary.
- Prisma schema/migration/reference-data changes, dependency changes, environment changes, production infrastructure, or unrelated Category/authentication refactors.
- Staging, committing, pushing, rebasing, branching, or destructive database reset without separate authorization.

## Expected Changes

- Focused Product/Variant files under `apps/api/src/catalog/`, reusing existing catalog authorization and Category/database infrastructure.
- Minimal catalog module/controller registration and CORS method adjustment only if an implemented method requires it.
- Focused `apps/api/test/` Product/Variant unit, integration, concurrency, and OpenAPI tests.
- Generated client remains reproducible and ignored; generated OpenAPI is verified through tests rather than committed unless an existing tracked workflow requires it.
- Narrow catalog/API documentation and Sprint execution records only.

No Prisma schema, migration, package manifest, lockfile, Admin, or Storefront change is expected.

## Relevant Existing Architecture

- The API is a NestJS Modular Monolith with one API-owned Prisma client and PostgreSQL database.
- S2-T03 implemented Product, Product Variant, Inventory, Category, ready Product Image metadata, lifecycle, normalized uniqueness, Product aggregate constraints, and row-locking-compatible persistence invariants.
- S2-T04 implemented the catalog module, exact permission/CSRF guard, DTO/error conventions, and protected Category contracts.
- Sprint 1 authentication resolves current session/role/permission state from PostgreSQL; Backend guards remain authoritative.

## API Changes

- Add `GET /api/v1/admin/catalog/products` requiring `catalog.read`; accept only `page`, `pageSize`, optional exact `categoryId`, and optional lifecycle `status`.
- Add `GET /api/v1/admin/catalog/products/{productId}` requiring `catalog.read`; return the explicit protected Product detail DTO.
- Add `POST /api/v1/admin/catalog/products` requiring `catalog.manage` and CSRF; atomically create a Draft Product, initial Variants, and Inventory; return `201`.
- Add `PATCH /api/v1/admin/catalog/products/{productId}` requiring `catalog.manage` and CSRF; update fields and/or perform one accepted lifecycle transition; return `200`.
- Add `POST /api/v1/admin/catalog/products/{productId}/variants` requiring `catalog.manage` and CSRF; create a retained Variant plus Inventory; return `201`.
- Add `PATCH /api/v1/admin/catalog/variants/{variantId}` requiring `catalog.manage` and CSRF; update/reactivate a retained Variant; return `200`.
- Use accepted validation, authentication, permission, CSRF, not-found, lifecycle, activation, SKU, combination, and mode error codes.

## Database Changes

None. Use the implemented S2-T03 Product, Product Variant, Inventory, Category, and ready Product Image persistence boundaries. No schema, migration, seed, or reference-data change is authorized.

## Security Implications

- Backend permission checks are authoritative; possession of an Admin cookie or UI visibility is insufficient.
- Every mutation requires the existing trusted Origin/session-bound CSRF boundary.
- IDs, filters, text, SKU, option labels, status, price, and quantity are validated/normalized before persistence. Raw Prisma/PostgreSQL errors, normalized keys, and internal storage/cleanup fields never enter responses.
- Product aggregate locks and in-transaction rechecks prevent concurrent Product/Variant mutations from bypassing lifecycle, mode, or completeness invariants.
- Explicit response DTOs expose exact protected Inventory and approved ready Image metadata but never cleanup state, storage keys/paths, credentials, or database rows.

## Edge Cases

- Empty/whitespace/overlong text, control characters, unknown fields, malformed UUIDs/query values, unsafe pagination, empty PATCH bodies, and invalid enums/ranges.
- Missing Category/Product/Variant, immutable Product/Variant IDs and Variant ownership, and same Category assignment no-ops.
- Global case-normalized SKU conflicts across active/inactive Variants and concurrent Products.
- Default unnamed versus named Variant shape, normalized nullable size/color combination conflicts, mixed active modes, and reactivation of retained rows.
- Positive safe-integer `priceRial` divisible by 10; non-negative safe initial Inventory quantity with initial version 1.
- Draft/Active/Archived transition matrix, Archived mutation rejection, activation completeness, same-request completeness restoration, last-active-Variant protection, and zero Inventory remaining valid for Active state.
- Product creation rollback when any Variant/Inventory fails; concurrent aggregate updates and persistence-trigger failure classification.
- Deterministic page ordering/tie-breaks, empty pages, exact Category/status filters, and response allowlists.
- Missing authentication, insufficient permission, invalid CSRF/origin, disabled/revoked sessions, and safe unexpected failures.

## Constraints

- Preserve accepted routes, fields, pagination defaults/bounds/order, normalization, lifecycle, error codes, canonical rial semantics, and persisted permission names exactly.
- Acquire the Product row lock before aggregate validation/mutation and keep all Product/Variant/Inventory writes in the required bounded transaction.
- Activation must enforce the persisted ready-main-Image and complete active-Variant state even though Product Image HTTP mutations arrive in S2-T08.
- Reuse the existing authentication, CSRF, catalog guard, error-envelope, Prisma, and Swagger patterns without speculative shared abstractions.
- Do not modify the S2-T03 schema/migration or pull Inventory mutation, Product Image, public, settings, or UI work forward.
- No dependency, environment, or generated-artifact changes without separate approval.

## Acceptance Criteria

- All six protected Product/Variant routes implement the exact methods, paths, statuses, permissions/CSRF boundaries, request/query validation, and explicit response DTOs.
- Product listing is deterministically page-bounded with only accepted filters; Product detail returns all retained Variants with exact Inventory and only approved ready Image metadata.
- Product creation atomically persists one Draft Product, valid initial Variants, and exactly one Inventory per Variant, rolling back the entire aggregate on any failure.
- Product updates and lifecycle transitions enforce the accepted transition matrix, Archived immutability, Category existence, and Active completeness under concurrency.
- Variant create/update/reactivation preserve immutable identity/ownership and enforce SKU, normalized combination, active default/named mode, canonical price, Inventory, and last-active-Variant invariants.
- Known uniqueness/FK/trigger outcomes map to approved stable errors; unexpected database details remain internal.
- Authentication, permission, CSRF/origin, disabled/revoked state, and safe error-envelope behavior match existing API conventions.
- Meaningful unit/integration/concurrency tests pass against PostgreSQL, including success, validation, conflicts, authorization, rollback, lifecycle, and race cases.
- Generated Swagger/OpenAPI exactly documents routes, pagination/filter parameters, UUIDs/enums/nullability, request/response schemas, authorization, CSRF, statuses, and stable failures; production documentation exposure remains unchanged.
- Relevant Sprint 1 and S2-T03/S2-T04 regressions, API typecheck/lint/build/test, formatting, scope, and Git checks pass.

## Testing Impact

Full Backend HTTP and PostgreSQL behavior testing required.

- Unit-test normalization, pagination/query parsing, lifecycle transition logic, DTO projection, and error classification where isolated logic is meaningful.
- Add real-PostgreSQL integration/API coverage for all routes, atomic create rollback, Category existence, lifecycle/completeness, Variant mode/uniqueness/price, retained rows, authorization/CSRF, and stable envelopes.
- Add independent-connection races for global SKU and conflicting Product aggregate mutations where existing S2-T03 persistence tests do not already prove the service/HTTP boundary.
- Run relevant authentication, Category, and catalog persistence regressions.

## Swagger / OpenAPI Impact

Required. Add exact protected Product/Variant paths and operation metadata, cookie authentication, permission and CSRF descriptions, pagination/filter parameters, request/response schemas, UUID/enums/nullability/ranges, statuses, and stable error responses. Generated OpenAPI must match tested behavior and remain disabled in production.

## Validation

- Preflight the approved PostgreSQL test identity before integration work; no reset without separate approval.
- Run focused Product/Variant unit/integration/concurrency/OpenAPI tests and relevant authentication/Category/persistence regressions.
- Run API Prisma generation only if required by ignored generated output, then API test, typecheck, lint, and build gates.
- Run repository formatting, local Markdown-target, `git diff --check`, prohibited-scope, dependency/lockfile/environment/schema/migration/frontend, generated-artifact, database-cleanup, and read-only Git-index inspections.
- Record only checks actually executed and their real results.

## Documentation Impact

Update catalog/API implementation reality and Sprint records only after executable verification passes. On success, archive S2-T05 and automatically prepare S2-T06; stop before Inventory implementation.

## Approval State

Awaiting Implementation Approval

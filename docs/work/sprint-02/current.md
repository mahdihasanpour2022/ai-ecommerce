# Current Task

## S2-T03 — Implement Approved Catalog Persistence

## Goal

Implement and PostgreSQL-verify exactly the Owner-approved Clothing Catalog schema/migration proposal: seven Prisma models, three enums, required constraints/indexes/triggers, singleton display-setting state, five Permission rows, and five explicit `SUPER_ADMIN` grants. Do not implement catalog runtime services, controllers, DTOs, storage behavior, Admin UI, or Storefront UI.

## Why

Sprint 2's later protected and public catalog contracts require one durable persistence foundation whose Category hierarchy, Product/Variant completeness, Inventory concurrency, Image ordering/cleanup, pricing, singleton setting, and authorization reference data cannot drift across separate feature tasks. Implementing the approved proposal as one reviewed additive migration prevents those later tasks from inventing incompatible storage semantics.

## Minimum Sufficient Required Context

- [Accepted S2-T02 schema/migration proposal](s2-t02-schema-proposal.md), which is authoritative for every model, field, enum, constraint, index, trigger, transaction invariant, reference UUID, migration risk, and database-test case in this task.
- [Clothing Catalog specification](../../features/catalog/specification.md), narrowed to domain invariants, transaction/consistency requirements, persistence tests, and authorization registry. It owns observable behavior; do not redesign its HTTP contracts here.
- [Sprint 2 plan](../../sprints/sprint-02.md), especially Scope, Out of Scope, Dependencies, and Exit Criteria.
- [Prisma Development and Migration Workflow](../../development/prisma.md) and [Local PostgreSQL Development](../../development/local-postgresql.md), including create-only review, isolated database usage, and forward-repair rules.
- Existing [Prisma schema](../../../apps/api/prisma/schema.prisma), [Sprint 1 migration](../../../apps/api/prisma/migrations/20260828000000_add_admin_identity_and_sessions/migration.sql), and [rollback-only constraint suite](../../../apps/api/prisma/tests/admin-identity-constraints.sql) as the exact implemented conventions to preserve.
- [Database Architecture — Design principles](../../architecture/database.md#design-principles), [Backend Architecture — Data integrity and integrations](../../architecture/backend-architecture.md#data-integrity-and-integrations), and [Authorization](../../security/authorization.md) for persistence ownership, bounded transactions, and explicit grants.
- [Testing Standards — Backend and API behavior](../../standards/testing.md#backend-and-api-behavior) and [Task Execution — Database and persistence preflight](../../standards/execution.md#database-and-persistence-preflight).

Frontend/Next.js guides, later Sprint task designs, full authentication runtime internals, and future commerce specifications are not required.

## Scope

- Re-run cheap PostgreSQL/Docker/Prisma preflight before any schema or migration work; stop early if the approved disposable databases are unavailable or not isolated.
- Add exactly the approved three enums and seven mapped models/relations/index declarations to `apps/api/prisma/schema.prisma`, preserving every Sprint 1 model unchanged except formatter-required layout.
- Run Prisma format/validate/generate, then create one descriptive migration with the repository's approved create-only workflow against disposable development only.
- Inspect every generated statement before application and customize the migration with explicit `BEGIN`/`COMMIT`, named CHECK constraints, PostgreSQL 18 `NULLS NOT DISTINCT` indexes, the deferrable Product Image position constraint, explicit referential actions, narrow PL/pgSQL functions/triggers, singleton/reference inserts, and explicit idempotent grants exactly as approved.
- Add a rollback-only PostgreSQL catalog invariant suite covering schema/reference structure, scalar/relational/cross-row constraints, hierarchy depth/cycles/cap, Variant/Inventory completeness, lifecycle/mode completeness, Image ordering/count/version, singleton behavior, and coexistence with Sprint 1 state.
- Add only focused source-level or two-connection integration tests needed to prove migration-managed definitions and concurrency behavior that a single rollback-only SQL connection cannot prove.
- Apply/reapply the reviewed migration only to approved disposable development/test databases under the documented workflow; verify clean-from-empty application, repeat deploy status, catalog introspection, reference rows/grants, and relevant Sprint 1 persistence regression.
- Update narrow database/Prisma/Sprint documentation from approved design to implemented-and-verified reality.

## Out of Scope

- Category/Product/Variant/Inventory/Image/settings repositories, services, controllers, DTOs, guards, error mapping, routes, Swagger/OpenAPI, or other runtime catalog code.
- Admin Panel or Storefront components, forms, React Hook Form behavior, image gallery UX, or any frontend change.
- Actual image decoding/upload/filesystem operations or production object storage; only the approved metadata/cleanup persistence exists here.
- Brand, multi-category joins, generic attributes/EAV, Variant images, Product/Variant deletion/history, slug/SEO/search/filtering, exact public stock, discount/tax/price history, inventory reservations/locations/history, Cart/Order/Payment, additional Roles, generalized audit/outbox/jobs/media, or production deployment infrastructure.
- Changing the accepted proposal, Sprint 1 authentication/session semantics, existing reference identities, dependencies, environment contracts, or unrelated legacy automotive technical identifiers.
- Staging, committing, pushing, rebasing, branching, or destructive database reset without separate authorization.

## Expected Changes

- `apps/api/prisma/schema.prisma`
- `apps/api/prisma/migrations/<timestamp>_add_clothing_catalog_foundation/migration.sql`
- `apps/api/prisma/tests/catalog-constraints.sql`
- Focused `apps/api/test/` Prisma/migration test files only if required for source or concurrency assertions.
- Narrow updates to `docs/architecture/database.md`, `docs/development/prisma.md`, and Sprint 2 execution records.
- Reproducible ignored Prisma client output may be regenerated for validation but is not edited or committed.

No package manifest, dependency lockfile, environment, runtime catalog module, Admin, Storefront, or generated OpenAPI change is expected.

## Relevant Existing Architecture

- The API remains a NestJS Modular Monolith owning one Prisma client and one PostgreSQL database.
- Sprint 1 already established mapped Prisma naming, UUID IDs, `timestamptz(3)`, explicit relations/referential actions, migration-owned CHECK/partial-index SQL, transaction-wrapped migrations, rollback-only SQL tests, and explicit RBAC reference data.
- The accepted S2-T02 proposal adds catalog persistence to that schema without changing the nine existing authentication/RBAC/session models or their migration.
- Database constraints enforce durable local invariants; focused triggers and bounded row/advisory locks enforce only accepted cross-row concurrency invariants that declarative Prisma/PostgreSQL constraints cannot express.

## API Changes

None. No HTTP route, request/response DTO, error envelope, authorization guard, controller, or generated Swagger/OpenAPI changes in S2-T03.

## Database Changes

- Add `ProductStatus`, `ProductImageMediaType`, and `PriceDisplayUnit` database enums.
- Add `categories`, `products`, `product_variants`, `inventories`, `product_images`, `product_image_cleanups`, and `price_display_settings` with exactly approved fields/defaults/nullability/mappings.
- Add only approved named CHECKs, unique/ordinary indexes, explicit restrictive foreign keys, Category hierarchy enforcement, deferred Product/Image aggregate invariants, version/identity guards, and singleton protection.
- Seed the fixed Toman-default singleton, five fixed catalog Permission records, and their five explicit links to the existing `SUPER_ADMIN` Role.
- Preserve all Sprint 1 tables, data, constraints, indexes, permission/grant state, and runtime behavior.

## Security Implications

- Migration/reference logic must fail on conflicting fixed identities rather than overwrite or broaden authority.
- `SUPER_ADMIN` receives explicit persisted grants only; no wildcard, Role bypass, token claim, or new Role is introduced.
- Storage keys and cleanup records remain server-only metadata. Tests and documentation must not print local absolute paths, file payloads, credentials, connection strings, or raw database errors.
- Named constraints/triggers must provide deterministic internal classification without exposing PostgreSQL implementation details to future clients.
- Disposable database commands must target only the documented local development/test identities; no production/shared database operation is authorized.

## Edge Cases

- Root and non-root sibling normalized-name collisions under `NULLS NOT DISTINCT`.
- Six-level creation, seventh-level rejection, subtree move overflow, self/descendant cycles, the 1,000-Category cap, and concurrent conflicting moves.
- Product insertion order with deferred “at least one Variant” and “one Inventory per Variant” enforcement.
- Default versus named active Variant mode while inactive retained combinations remain reserved.
- Nullable size/color combination uniqueness, global uppercase SKU uniqueness, and safe-integer/divisible-by-ten rial prices.
- Inventory initial version 1, non-negative quantities, exact increment, stale concurrent writes, and integer overflow behavior.
- Product Image positions 0–8, zero-or-contiguous collections, tenth Image/gap rejection, deferred collision-free reorder, immutable content identity, and Product `imageVersion` bounds.
- Active completeness across Product, description, active Variants/Inventory, and main Image at final transaction commit.
- Cleanup retry-state consistency, immutable generated keys, singleton deletion/id mutation, permission UUID/code conflicts, repeat deployment, and migration rollback on partial failure.

## Constraints

- Implement the accepted proposal exactly. If actual Prisma/PostgreSQL behavior makes any approved mechanism impossible or materially unsafe, stop at an explicit architecture/persistent-semantics blocker rather than silently substitute a different model.
- Use current primary Prisma/PostgreSQL documentation for implementation details; use the installed Prisma 7.10.0 and PostgreSQL 18.6 behavior as the executable truth.
- Generate with `--create-only`, inspect before applying, and never edit the already-applied Sprint 1 migration.
- Keep the migration additive and transaction-wrapped. Do not use `db push`, automatic seed, `CREATE INDEX CONCURRENTLY`, a Preview feature, migration reset, or an unreviewed direct production/shared database action.
- Do not add/remove/upgrade dependencies. Do not modify runtime catalog or frontend code.
- Database tests must be deterministic, isolated, rollback/cleanup-safe, and preserve the system reference rows expected by Sprint 1.
- S2-T03 implementation approval authorizes only this task. It does not authorize S2-T04 runtime Category work.

## Acceptance Criteria

- Prisma schema contains exactly the seven accepted models and three accepted enums with the approved fields, types, defaults, nullability, mappings, relations, referential actions, and Prisma-representable indexes.
- One reviewed additive migration implements every approved migration-owned CHECK, `NULLS NOT DISTINCT` index, deferrable unique constraint, hierarchy/aggregate/Image/version/singleton trigger, foreign key, ordinary index, reference row, and explicit grant with stable intentional names.
- Prisma format, validate, and generate pass on the exact final schema; generated output remains reproducible and ignored.
- Fresh migration application and migration status pass on both approved disposable database identities; repeat deploy is a no-op/success, not duplicate reference state.
- Database introspection proves all expected tables/enums/constraints/indexes/functions/triggers plus one Toman singleton, five Permission codes, and one explicit `SUPER_ADMIN` grant per code.
- PostgreSQL tests prove normalized uniqueness including null scopes, Category depth/cycle/cap, restrictive deletion, Product/Variant/Inventory minimum cardinality, active completeness/mode, price/quantity/version bounds, Image count/order/main/version behavior, cleanup state, and singleton integrity.
- Two-connection tests prove Category/Inventory/Image/SKU/combination concurrency rules required by the approved proposal, with exactly one valid winner where applicable and no partial invalid state.
- Relevant Sprint 1 persistence/schema/reference regression tests pass; its nine models, original migration, `admin.access`, original grant, and authentication constraints remain unchanged.
- Migration review records data-loss, lock, compatibility, transactional-failure, drift, deployment-order, and forward-recovery results; no unapproved destructive/backfill/production infrastructure work appears.
- Documentation reality is current; local Markdown links, formatting, `git diff --check`, prohibited-scope inspection, database cleanup, and read-only Git-index inspection pass.

## Testing Impact

Full PostgreSQL persistence testing required.

- Extend the existing source/schema test boundary for exact mapped model/index/constraint/reference definitions where useful.
- Add a rollback-only real-PostgreSQL catalog constraint suite.
- Add deterministic two-connection integration coverage for concurrency invariants that cannot be proven in one SQL transaction.
- Run relevant existing Prisma/schema and Sprint 1 persistence tests as regression coverage.
- Runtime HTTP/controller/OpenAPI tests are not required because no API behavior changes.

## Swagger / OpenAPI Impact

None. Generated OpenAPI must remain unchanged because S2-T03 introduces no HTTP contract.

## Validation

- Preflight `yarn db:status`, `yarn db:health`, and `yarn db:verify`; confirm exact disposable identities before mutation.
- Run the accepted Prisma format, validate, generate, create-only, reviewed migration deploy, and migration-status workflow.
- Apply from clean disposable state where authorized by the task workflow, inspect generated SQL before application, and prove repeated deploy behavior.
- Run the new rollback-only PostgreSQL invariant suite and focused concurrency/source tests plus relevant Sprint 1 persistence regressions.
- Introspect expected database objects, referential actions, trigger deferrability, index definitions, singleton/reference counts, and absence of unexpected objects/data.
- Run relevant API Workspace test/typecheck/lint/build gates if executable test/source files change; always run repository formatting checks applicable to changed files.
- Verify generated client output is ignored/reproducible, OpenAPI unchanged, local Markdown targets, no secrets/sensitive output, dependency/lockfile/environment/runtime/frontend scope, database cleanup, `git diff --check`, and read-only Git-index state.
- Record only checks actually executed and their real results.

## Documentation Impact

Mark the accepted schema proposal as implemented only after executable verification passes. Reconcile the database/Prisma foundation and Sprint execution records without duplicating the proposal's detailed schema rules. On success, archive S2-T03 and automatically prepare S2-T04; stop before Category-contract implementation.

## Approval State

Awaiting Implementation Approval

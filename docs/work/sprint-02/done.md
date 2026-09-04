# Sprint 2 Completed Tasks

## S2-T01 — Specify Clothing Catalog Behavior and Contracts

**Completed:** 2026-09-03

**Result:** Created the canonical implementation-ready clothing catalog specification covering accepted Product/Variant/SKU ownership, lifecycle/public eligibility, six-level Category behavior, canonical rial pricing and Toman display input, optimistic Variant Inventory, Product-owned image validation/storage lifecycle, exact permissions, protected/public contract maps, stable failures, transaction boundaries, OpenAPI obligations, and risk-based tests. No runtime API, dependency, Prisma schema, migration, database, environment, or generated artifact changed.

### Validation

Accepted-decision coverage searches passed for every catalog domain and contract group. Missing, over-planning, placement, dependency, stale-state, and scope-leak reviews found no unresolved Sprint 2 owner decision or Future/Deferred implementation. Checked local Markdown targets resolved. Runtime/dependency/Prisma prohibited-file inspection was empty. `git diff --check` passed, and separate no-index whitespace checks passed for the new untracked specification/current-task files. No automated test, typecheck, lint, build, Prisma, database, or generated OpenAPI run was required for this documentation-only task.

**Important Decisions:** Under the Technical Lead boundary, selected bounded field normalization/lengths, safe-integer wire values, page limits/fixed tie-breaking, a 1,000-Category complete-tree cap, retained inactive Variants without hard delete, immutable Image content identities, image-collection optimistic versioning, conservative decoded image limits, a narrow durable Product Image cleanup state, explicit protected/public routes and DTO allowlists, and stable domain error codes. These details implement accepted semantics without generic attributes, generalized media/jobs, or future commerce models.

**Files / Areas Changed:** Added the canonical catalog feature specification and narrow links/reality updates in Sprint, roadmap, product, database, and agent documentation. Runtime applications, packages, dependencies, Prisma files, migrations, and generated artifacts were unchanged.

**Documentation Impact:** The catalog specification is now the observable-behavior owner and Required Context router for S2-T02 through S2-T10; architecture remains authoritative for implementation shape and the Sprint plan for scope/timing.

**Follow-ups:** S2-T02 is Current and awaiting implementation approval. It will propose the exact Prisma/PostgreSQL schema, constraints, indexes, ERD, transaction/cleanup persistence design, migration implications, and database-test strategy for separate owner approval without modifying schema or migration files.

## S2-T02 — Design Catalog Schema and Migration Proposal

**Completed:** 2026-09-03

**Result:** Produced and received Owner approval for the complete seven-model Clothing Catalog persistence design, three enums, normalized uniqueness, restrictive relations, Category-tree and Product-aggregate integrity rules, optimistic Inventory/Image concurrency, narrow durable Image cleanup state, singleton Toman-default setting, five explicit catalog permissions/grants, justified query indexes, additive migration sequence, and PostgreSQL test strategy. No executable schema, migration, database data, runtime, dependency, environment, generated artifact, or OpenAPI changed.

### Validation

PostgreSQL 18.6 health and exact development/test database isolation passed. Prisma 7.10.0 migration status reported the single existing Sprint 1 migration applied and both schemas current. Current Prisma/PostgreSQL documentation was reviewed through Context7 for custom migration SQL, transaction wrapping, `NULLS NOT DISTINCT`, deferrable constraint triggers, recursive CTEs, and advisory locks. Proposal coverage, Minimum Sufficient Scope, local Markdown targets, trailing whitespace, and `git diff --check` passed. No Prisma candidate validation, migration generation/application, database invariant test, or application gate ran because S2-T02 was documentation-only.

**Important Decisions:** Use UUID/timestamp conventions from Sprint 1; application-owned normalized comparison keys backed by PostgreSQL uniqueness; one Product row lock as the aggregate-write boundary; one transaction advisory lock for the bounded Category tree; deferred Product/Image integrity triggers only for accepted cross-row invariants; database-guarded Inventory versions; canonical safe-integer `bigint` rial prices; ready Product Image metadata plus narrow pending-cleanup records; fixed singleton setting row; and explicit idempotent catalog Permission grants to `SUPER_ADMIN` without wildcard behavior.

**Files / Areas Changed:** Added and approved the S2-T02 schema/migration proposal and updated Sprint 2 execution state only. Prisma schema/configuration, migration files, applications, dependencies, lockfile, environment, databases, generated files, and OpenAPI were unchanged.

**Documentation Impact:** The accepted S2-T02 proposal is now the canonical persistence contract for S2-T03 and the schema-level reference for later Sprint 2 catalog tasks.

**Follow-ups:** S2-T03 is Current and awaiting implementation approval. It owns only implementation and PostgreSQL verification of the accepted proposal; no runtime catalog contract or frontend work is included.

<!-- Append concise records with Result, a `### Validation` section listing only checks actually executed/result, Important Decisions, Files / Areas Changed, Documentation Impact, and Follow-ups. -->

## S2-T03 — Implement Approved Catalog Persistence

**Completed:** 2026-09-04

**Result:** Implemented and PostgreSQL-verified the approved three enums, seven catalog models, additive transaction-wrapped migration, named scalar/relational/cross-row invariants, hierarchy and aggregate triggers, singleton Toman setting, five catalog Permission rows, and five explicit `SUPER_ADMIN` grants. No catalog HTTP/runtime or frontend behavior was added.

### Validation

PostgreSQL 18.6 health and exact `automotive_dev`/`automotive_test` isolation passed. Both migrations applied from empty disposable development and test databases; migration status passed and repeat deploy was a no-op. Prisma format/validate/generate passed. The catalog rollback-only SQL suite passed exact object/reference introspection plus hierarchy, cardinality, lifecycle, price, Inventory, Image, cleanup, singleton, and restrictive-relation invariants; the Sprint 1 SQL regression suite passed. Six independent-connection catalog race tests and the complete API suite passed (75 tests). API typecheck, lint, build, repository formatting, local Markdown links, `git diff --check`, prohibited-scope inspection, ignored generated-client inspection, clean Git index inspection, and post-test database cleanup/reference counts passed.

**Important Decisions:** Preserved Sprint 1's lowercase alphanumeric dot-separated Permission convention by owner-approved renames to `product.media.manage` and `settings.price.display.unit.update`; meanings, UUIDs, grant scopes, and default-deny authorization remain unchanged. Kept PostgreSQL-only null-equal uniqueness, deferrable constraints, advisory locking, aggregate validation, version guards, and immutable identities in reviewed migration SQL.

**Files / Areas Changed:** Extended the API Prisma schema; added one catalog migration, one rollback-only PostgreSQL suite, and focused source/concurrency tests; updated affected Sprint 1 authorization expectations and narrow catalog/database/Prisma documentation.

**Documentation Impact:** Database and Prisma documentation now describe the implemented sixteen-model/two-migration foundation. The accepted S2-T02 proposal is marked implemented and remains the canonical detailed catalog persistence contract.

**Follow-ups:** S2-T04 is Current and awaiting implementation approval. It owns only protected nested-Category runtime contracts, tests, and matching OpenAPI; Product/Variant and later catalog slices remain queued.

## S2-T04 — Implement Protected Nested-Category Contracts

**Completed:** 2026-09-04

**Result:** Implemented the protected Admin Category module with complete deterministic tree retrieval, normalized create/rename, atomic subtree moves, eligible empty-leaf deletion, exact `catalog.read`/`catalog.manage` authorization, session-bound CSRF, bounded hierarchy enforcement, stable safe errors, and synchronized Swagger/OpenAPI. No Product/Variant, frontend, dependency, Prisma schema, migration, or reference-data change was introduced.

### Validation

PostgreSQL 18.6 development/test isolation passed. The focused Category unit and real-PostgreSQL HTTP suite passed (9 tests), followed by the complete API suite including Sprint 1 authentication and S2-T03 persistence/concurrency regressions (84 tests). API typecheck, lint, and build passed; repository Prettier check and `git diff --check` passed. OpenAPI route/security/schema and CORS method assertions passed. Prohibited-scope inspection found no Prisma, migration, package, lockfile, Admin, or Storefront changes. Post-test database cleanup verified zero Category/Product/test-Admin/test-Role fixtures.

**Important Decisions:** Reused Sprint 1 authentication/current-state and CSRF services behind a narrow catalog permission guard. All Category mutations acquire the implemented catalog advisory lock before validation reads and writes, while database uniqueness, restrictive relations, cap, cycle, and depth constraints remain authoritative. External DTOs exclude `nameKey`; expected persistence failures map to stable Category codes and unexpected failures use the safe server envelope.

**Files / Areas Changed:** Added the API catalog Category controller, service, repository, DTO/error, authorization guard, and module; registered the module; extended CORS for implemented `PATCH`/`DELETE`; added focused Category unit/integration/OpenAPI tests; and updated narrow project/catalog/backend reality documentation.

**Documentation Impact:** Project overview, Backend architecture, and the catalog specification now identify protected Category contracts as implemented. Sprint execution records now route Product/Variant work to S2-T05.

**Follow-ups:** S2-T05 is Current and awaiting implementation approval. It owns protected Product/Variant contracts and matching tests/OpenAPI only; Inventory mutation, Product Image, settings, public catalog, and frontend work remain later tasks.

## S2-T05 — Implement Protected Product and Variant Contracts

**Completed:** 2026-09-04

**Result:** Implemented six protected Admin Product/Variant routes for deterministic bounded Product summaries, full protected detail, atomic Draft Product/initial-Variant/Inventory creation, Product update/lifecycle transitions, retained Variant creation, and Variant update/reactivation. Exact catalog authorization, mutation CSRF, normalization, canonical rial pricing, aggregate locking, stable errors, explicit response projection, and synchronized Swagger/OpenAPI are enforced. No Inventory mutation, media operation, setting, public route, frontend, dependency, Prisma schema, migration, or reference-data change was introduced.

### Validation

PostgreSQL 18.6 development/test isolation passed. The focused Product/Variant parsing and real-PostgreSQL HTTP suite passed (11 tests), followed by the complete API suite including Sprint 1 authentication and S2-T03/S2-T04 persistence/Category regressions (95 tests). API typecheck, lint, and build passed; repository Prettier check and `git diff --check` passed. Exact Product/Variant OpenAPI path, method, security, CSRF, parameter, schema, status, and internal-field exclusion assertions passed. Prohibited-scope inspection found no Prisma, migration, package, lockfile, Admin, or Storefront changes. Post-test database cleanup verified zero Category/Product/Variant/Inventory/Image/test-Admin/test-Role fixtures.

**Important Decisions:** Reused the catalog permission guard and explicit DTO/error boundaries. Product aggregate mutations serialize on the Product row and perform sequential in-transaction state reads before final validation, avoiding concurrent Prisma queries on one transaction connection. Product creation rolls back as one aggregate; inactive Variants remain retained; active default/named modes remain exclusive; zero Inventory remains valid for Active Products; and known Prisma/constraint outcomes map to approved stable domain errors.

**Files / Areas Changed:** Added focused Product/Variant controller, service, repository, DTO, error-mapping, parsing, PostgreSQL HTTP/concurrency, and unit-test files under the existing API catalog module; registered the controller/providers; and updated narrow project/catalog/backend reality documentation.

**Documentation Impact:** Project overview, Backend architecture, and the catalog specification now identify protected Product/Variant contracts as implemented. Sprint execution records now route optimistic Inventory mutation to S2-T06.

**Follow-ups:** S2-T06 is Current and awaiting implementation approval. It owns only the minimum exact Inventory read/update boundary and optimistic concurrency contract; Product Image, display-setting, public catalog, and frontend work remain later tasks.

## S2-T06 — Implement Minimum Inventory Contracts

**Completed:** 2026-09-04

**Result:** Implemented the protected Admin absolute Inventory update contract with strict bounded input, exact `inventory.update` authorization, session-bound CSRF, Product aggregate locking, Archived lifecycle rejection, one version-matched atomic update/increment, missing-state versus stale-version classification, minimal safe response projection, stable errors, CORS `PUT`, and synchronized Swagger/OpenAPI. Existing protected Product detail remains the exact Inventory read boundary. No Prisma schema, migration, dependency, frontend, media, setting, public-catalog, reservation, history, or Checkout behavior changed.

### Validation

The disposable PostgreSQL service health and exact development/test identity/isolation checks passed. Focused Inventory parser, service classification, real-PostgreSQL HTTP, authorization/current-state, rollback, concurrency, CORS, and OpenAPI coverage passed (10 tests). The complete API suite passed (105 tests), including Sprint 1 authentication and S2-T03 through S2-T05 persistence/catalog regressions. API typecheck, lint, and build passed; repository Prettier check, changed-document local-link validation, `git diff --check`, prohibited-scope and generated/tracked-artifact inspection, and clean Git-index inspection passed. Post-test database cleanup verified zero catalog and Inventory-specific Admin/Role fixtures.

**Important Decisions:** Reused the catalog guard and Product row as the aggregate serialization boundary. The repository issues one parameterized PostgreSQL `UPDATE ... WHERE variant_id AND version ... RETURNING` and never retries; a zero-row result is classified inside the same transaction without exposing the current quantity/version. Raw SQL is limited to the accepted row lock and atomic-returning operation Prisma cannot express as one equivalent guarded statement.

**Files / Areas Changed:** Added focused Inventory controller, DTO/parser, service, repository, error mapping, unit tests, and PostgreSQL HTTP/concurrency/OpenAPI tests under the API catalog module; registered the Inventory boundary; added CORS `PUT`; and updated narrow project/catalog/backend reality documentation.

**Documentation Impact:** Project overview, Backend architecture, and the catalog specification now identify protected Inventory mutation as implemented. Sprint execution records now route the singleton rial/toman display-setting contracts to S2-T07.

**Follow-ups:** S2-T07 is Current and awaiting implementation approval. It owns only consistent protected update plus safe Admin/public reads for the singleton price display/input unit; Product Image operations, broader public catalog, and all frontend work remain later tasks.

## S2-T07 — Implement Rial/Toman Display-Setting Contracts

**Completed:** 2026-09-04

**Result:** Implemented protected Admin read/update and unauthenticated public read contracts for the fixed rial/toman display/input setting. The routes enforce exact `catalog.read` and `settings.price.display.unit.update` permissions, session-bound CSRF on mutation, strict `RIAL`/`TOMAN` input, singleton-only persistence, explicit `{ unit }` projection, stable safe failures, and synchronized Swagger/OpenAPI security. Setting changes never query or mutate canonical Variant `priceRial`. No Prisma schema, migration, reference-data, dependency, frontend, media, Inventory, or broader public-catalog behavior changed.

### Validation

The disposable PostgreSQL service health and exact development/test identity/isolation checks passed. Focused DTO, safe-controller-failure, real-PostgreSQL HTTP, authorization/current-state, canonical-price non-mutation, and OpenAPI coverage passed (8 tests). The complete API suite passed (113 tests), including Sprint 1 authentication and S2-T03 through S2-T06 persistence/catalog regressions. API typecheck, lint, and build passed; repository Prettier check, changed-document local-link validation, `git diff --check`, prohibited-scope and generated/tracked-artifact inspection, and clean Git-index inspection passed. Post-test database cleanup verified zero catalog and setting-specific Admin/Role fixtures and singleton unit `TOMAN`.

**Important Decisions:** Used separate Admin and public controllers so public OpenAPI and runtime behavior cannot inherit cookie security or catalog guards. Both share one narrow service/repository that reads or updates only fixed row `id = 1`; missing/corrupt singleton state fails safely and is never recreated implicitly. Same-value updates remain valid absolute replacement operations.

**Files / Areas Changed:** Added focused price-display-setting controller, DTO/parser, service, repository, error boundary, unit tests, and PostgreSQL HTTP/authorization/OpenAPI tests under the API catalog module; extended the catalog permission metadata type and module registration; and updated narrow project/catalog/backend reality documentation.

**Documentation Impact:** Project overview, Backend architecture, and the catalog specification now identify protected/public price-display-setting contracts as implemented. Sprint execution records now route secure Product Image work to S2-T08.

**Follow-ups:** S2-T08 is Current and awaiting implementation approval. It owns only secure Product-owned image upload/retrieval/order/replacement/removal plus recoverable local development/test storage behavior; broader public Product contracts and all frontend work remain later tasks.

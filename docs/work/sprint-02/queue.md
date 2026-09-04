# Sprint 2 Queue

Sprint 2 is Active. Its approved goal, scope, accepted decisions, exclusions, and exit criteria are canonical in [Sprint 2](../../sprints/sprint-02.md).

S2-T07 is the sole Current task and is awaiting implementation approval. S2-T06 is Done; its protected Inventory contract and canonical Variant price behavior are prerequisites for later Admin catalog workflows and the display-setting contract.

## S2-T01 — Specify Clothing Catalog Behavior and Contracts

Status: Done

Classification: Required Now

Objective:
Translate the accepted Sprint 2 decisions into one coherent feature specification and protected/public contract map covering validation, stable errors, bounded reads, lifecycle, authorization, transaction boundaries, media security, and the narrow technical details explicitly delegated by the Sprint plan.

Dependency:
Approved Sprint 2 plan and Sprint activation.

## S2-T02 — Design Catalog Schema and Migration Proposal

Status: Done

Classification: Required Now

Objective:
Produce a reviewable Prisma/PostgreSQL model and migration proposal with a compact ERD, relationships/cardinality, required/null fields, normalized uniqueness, referential actions, justified indexes, lifecycle fields, transaction-sensitive invariants, authorization reference data, media cleanup state, migration risks, and database-test strategy. Do not modify the Prisma schema or create a migration in this task.

Dependency:
S2-T01 Done. The resulting schema/migration proposal requires separate explicit owner approval before S2-T03 implementation.

## S2-T03 — Implement Approved Catalog Persistence

Status: Done

Classification: Required Now

Objective:
After database preflight and separate schema/migration approval, implement and PostgreSQL-test only the approved catalog models, constraints, indexes, additive migration, singleton display-setting reference state, accepted permission records, and explicit `SUPER_ADMIN` grants.

Dependency:
S2-T02 Done, explicit owner approval of its schema/migration proposal, and successful disposable PostgreSQL/Docker preflight.

## S2-T04 — Implement Protected Nested-Category Contracts

Status: Done

Classification: Required Now

Objective:
Implement authenticated and authorized Category create/read/update/atomic-move/eligible-delete contracts with six-level and cycle safety, normalized sibling uniqueness, restrictive referential behavior, stable errors, matching Swagger/OpenAPI, and meaningful automated tests.

Dependency:
S2-T03 Done.

## S2-T05 — Implement Protected Product and Variant Contracts

Status: Done

Classification: Required Now

Objective:
Implement authenticated and authorized Product/Variant creation, retrieval, update, lifecycle transition, SKU, size/color/default-Variant, canonical price, Category membership, and activation-invariant contracts with stable errors, matching Swagger/OpenAPI, and meaningful automated tests.

Dependency:
S2-T03 and S2-T04 Done.

## S2-T06 — Implement Minimum Inventory Contracts

Status: Done

Classification: Required Dependency

Objective:
Implement exact protected Inventory reads and optimistic-version absolute on-hand updates with database-enforced non-negative quantity, stale-write rejection, atomic behavior, stable errors, matching Swagger/OpenAPI, and focused persistence/concurrency tests. Do not implement reservations, history, locations, or Checkout stock behavior.

Dependency:
S2-T03 and S2-T05 Done.

## S2-T07 — Implement Rial/Toman Display-Setting Contracts

Status: Current

Classification: Required Dependency

Objective:
Implement consistent protected update and safe Admin/public read contracts for the singleton Toman-default display/input setting, preserving canonical `priceRial`, exact conversion invariants, dedicated permission enforcement, stable errors, matching Swagger/OpenAPI, and focused tests.

Dependency:
S2-T03 Done. S2-T05 must have established canonical Product Variant price behavior before completion.

## S2-T08 — Implement Secure Product Image Contracts

Status: Queued

Classification: Required Now

Objective:
Implement Product-owned image upload, authorized retrieval, atomic ordering, replacement, eligible removal, controlled public delivery, strict byte/content/decoding validation, generated-key local storage, recoverable cleanup lifecycle, stable errors, matching Swagger/OpenAPI, and meaningful media security/failure-path tests.

Dependency:
S2-T03 and S2-T05 Done.

## S2-T09 — Implement Minimum Public Catalog Contracts

Status: Queued

Classification: Required Dependency

Objective:
Implement the accepted bounded public Category tree, deterministic page-bounded Active Product summaries, optional exact-Category filter, Product detail, active Variant price/availability, ordered Product Image, and display-setting contracts through explicit safe DTOs, with stable errors, matching Swagger/OpenAPI, query/index review, and meaningful automated tests. Do not finalize Sprint 4 URLs, SEO, selectable sorting, descendant browsing, search, or advanced filters.

Dependency:
S2-T04 through S2-T08 Done.

## S2-T10 — Complete Catalog Foundation Verification

Status: Queued

Classification: Required Now

Objective:
Audit the complete Sprint 2 slice against its accepted specification and exit criteria; close only in-scope gaps and verify persistence constraints, transactions/concurrency, authorization, public-data filtering, stable failures, media security/cleanup, OpenAPI drift, relevant Sprint 1 regressions, and readiness for Sprint 3–4 consumers.

Dependency:
S2-T01 through S2-T09 Done.

## Approval State

Sprint Plan Approved. S2-T01 through S2-T06 are Done. S2-T07 is Current and awaiting implementation approval; S2-T08 through S2-T10 remain Queued.

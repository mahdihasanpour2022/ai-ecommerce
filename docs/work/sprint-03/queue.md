# Sprint 3 Queue

Sprint 3 is Active. Its approved goal, scope, Owner Decisions, exclusions, dependencies, and exit criteria are canonical in the [Sprint 3 plan](../../sprints/sprint-03.md).

S3-T01 is the sole Current task and is awaiting implementation approval.

## S3-T01 — Specify Admin Catalog Behavior and UX

Status: Current

Classification: Required Now

Objective:
Turn the approved Sprint 3 plan decisions and implemented Backend contracts into one testable Persian RTL Admin behavior specification: routes, navigation, permission matrix, field/price rules, Product workflow/readiness, async/conflict/failure states, responsive accessibility, and the minimum critical browser journey. Record the exact dependency proposal required by S3-T02 without installing packages.

Dependency:
Approved Sprint 3 plan and Owner Decisions.

## S3-T02 — Establish the Approved Admin UI and Test Foundation

Status: Queued

Classification: Required Dependency

Objective:
After separate task approval of exact versions, add only the required Ant Design/App Router registry, React Hook Form, accessible interaction-test, and browser-e2e dependencies; configure Persian RTL first-render-safe providers and the minimum test harness while preserving the existing authentication shell and accepted Yarn toolchain.

Dependency:
S3-T01 Done and explicit task approval for the exact dependency set.

## S3-T03 — Implement the Protected Catalog Shell and Client Boundary

Status: Queued

Classification: Required Dependency

Objective:
Add protected catalog routes/navigation, shared responsive Admin composition, exact permission-aware presentation, typed catalog DTO/error parsing, and focused API methods over the existing credentialed Axios/CSRF/refresh boundary, with reusable loading/empty/error/retry behavior and no new global state abstraction.

Dependency:
S3-T02 Done.

## S3-T04 — Implement Category Management

Status: Queued

Classification: Required Now

Objective:
Implement the bounded nested Category view and create/rename/move/eligible-delete workflows with accessible hierarchy controls, normalized server responses, exact permissions, duplicate-submit prevention, safe stable failures, and hierarchy conflict recovery.

Dependency:
S3-T03 Done.

## S3-T05 — Implement Product Listing and Draft Creation

Status: Queued

Classification: Required Now

Objective:
Implement the protected Product list with existing lifecycle/exact-Category filters and deterministic paging, plus Draft Product creation with required core data, one-or-more initial default/named Variants, canonical price conversion, and optional initial absolute Inventory quantities.

Dependency:
S3-T03 and S3-T04 Done.

## S3-T06 — Implement Product and Variant Maintenance

Status: Queued

Classification: Required Now

Objective:
Implement the Product workspace core-field and retained-Variant views/edits, including category reassignment, SKU, size/color mode, price, active state, normalized authoritative responses, archived restrictions, and exact lifecycle/combination conflict presentation without duplicating Backend invariants.

Dependency:
S3-T05 Done.

## S3-T07 — Implement Inventory and Price Display-Setting Management

Status: Queued

Classification: Required Now

Objective:
Implement per-Variant absolute Inventory updates using optimistic versions and explicit stale recovery, plus protected display/input-unit read/update. Apply exact rial/toman conversion only at the UI boundary while every catalog API payload remains canonical `priceRial`.

Dependency:
S3-T06 Done.

## S3-T08 — Implement Product Image Management

Status: Queued

Classification: Required Now

Objective:
Implement Product Image preview/upload, accessible reorder, immutable-identity replacement, and eligible removal with accepted byte/type guidance, exact media permission, duplicate-submit protection, optimistic `imageVersion` recovery, safe content URLs, and cleanup-conscious tests.

Dependency:
S3-T06 Done.

## S3-T09 — Complete Publication and Permission-Aware Catalog Workflow

Status: Queued

Classification: Required Now

Objective:
Integrate Product readiness, confirmed lifecycle transitions, partial-permission UX, direct/stale route behavior, and cross-feature refresh/reconciliation so an authorized Admin can intentionally move a complete Draft Product to Active and maintain it without UI guesses or authorization bypass assumptions.

Dependency:
S3-T04 through S3-T08 Done.

## S3-T10 — Complete Admin Catalog Verification

Status: Queued

Classification: Required Now

Objective:
Audit every Sprint 3 exit criterion and the end-to-end Category-to-Active-Product journey; close only in-scope gaps and run complete Admin interaction/accessibility evidence, the critical production-build browser flow against the real API/PostgreSQL/storage boundary, applicable Backend regressions, repository gates, cleanup, scope, dependency, documentation, and generated-artifact checks.

Dependency:
S3-T01 through S3-T09 Done.

## Approval State

Sprint Plan Approved. S3-T01 is Current and awaiting implementation approval. S3-T02 through S3-T10 are Queued. No task implementation or dependency change is authorized.

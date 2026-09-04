# Sprint 3 Completed Tasks

## S3-T01 — Specify Admin Catalog Behavior and UX

**Completed:** 2026-09-04

**Result:** Added the canonical Persian RTL Admin catalog behavior/UX specification covering routes, navigation, all five permission combinations, Category/Product/Variant/Inventory/setting/Image workflows, Draft creation, readiness and confirmed lifecycle transitions, normalized response reconciliation, conflict recovery, responsive accessibility, and the bounded component/browser evidence strategy. No application code, dependency, lockfile, API, schema, migration, permission/reference data, Storefront, audit, or later-commerce behavior changed.

### Validation

Cross-checked every specified Admin action, field, permission, route, version token, lifecycle rule, price conversion, and stable failure against the implemented Sprint 2 catalog specification, DTO/error code, and protected controller surface. Reviewed installed Next.js 16.3.2 App Router guidance and current primary Ant Design, React Hook Form, and Playwright documentation through Context7. Queried current registry metadata for every proposed exact pin and verified declared React/Next/Node peers; selected JSDOM 28.1.0 specifically to retain the repository Node 20.19 floor. Local Markdown links, `git diff --check`, documentation-only scope, and clean Git-index checks passed. No runtime test was required for this documentation-only task.

**Important Decisions:** Product mode is chosen at creation and not converted later because the existing API has no atomic mode-conversion operation. Open Product forms retain their labelled price unit until reload so a concurrent global setting change never reinterprets typed values. Permission-aware visibility uses read permission plus the applicable independent mutation permission. Image ordering always has keyboard controls, and stale Inventory/Image/lifecycle state reloads without silent retry or merge.

**Files / Areas Changed:** Added `docs/features/admin-catalog/specification.md`; linked it from frontend architecture; updated Sprint 3 execution state and project reality documentation.

**Documentation Impact:** The new specification is the acceptance source for S3-T02 through S3-T10 and contains the exact dependency proposal required for S3-T02 approval.

**Follow-ups:** S3-T02 is Current and awaiting explicit implementation approval for the exact runtime and development dependency pins recorded in the specification and Current task.

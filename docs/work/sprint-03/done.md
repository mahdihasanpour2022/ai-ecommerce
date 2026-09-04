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

## S3-T02 — Establish the Approved Admin UI and Test Foundation

**Completed:** 2026-09-04

**Result:** Installed exactly the approved four Admin runtime and seven development dependencies; added a first-render-safe Ant Design App Router registry, narrow Persian RTL Client provider, typed React Hook Form/Ant Design field seam, isolated JSDOM interaction harness, and one production-build Chromium authentication-shell smoke with explicit keyboard and focused axe coverage. Existing authentication behavior remains unchanged; no catalog screen, Backend/API, schema/migration, Storefront, or additional dependency was introduced.

### Validation

Exact manifest resolution and frozen-lock installation passed. Admin typecheck, lint, all 33 Node tests, production build, Playwright discovery, and the Chromium smoke passed; the smoke used installed system Chrome locally because the Playwright CDN returned a location-based 403, while CI installs only Playwright Chromium. Repository formatting, typecheck, lint, all real tests, and all application builds passed. `git diff --check`, local links, generated-artifact ignores, prohibited-scope review, dependency inventory, and clean Git-index checks also passed.

**Important Decisions:** The root layout remains server-owned; `AntdRegistry` wraps a narrow Client `ConfigProvider` before the existing Auth Provider. Form adapters preserve native labels, linked announced errors, invalid-field focus, disabled/busy submission, and authoritative normalized reset behavior. Browser API responses are synthetic and intercepted, with no credentials or persistence.

**Files / Areas Changed:** Admin manifest/lockfile, root provider wiring and form adapter, JSDOM and Playwright tests/configuration, CI Chromium gate and ignores, frontend architecture/project reality/CI documentation.

**Documentation Impact:** Documented the installed Admin UI/form/test architecture and CI Chromium behavior without claiming catalog features exist.

**Follow-ups:** S3-T03 is Current and awaiting implementation approval for the protected catalog shell and typed client boundary.

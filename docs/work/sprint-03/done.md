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

## S3-T03 — Implement the Protected Catalog Shell and Client Boundary

**Completed:** 2026-09-04

**Result:** Added the protected Persian RTL `/catalog/**` route tree, responsive keyboard-operable navigation, exact permission-capability presentation, safe return-route allowlisting, strictly typed Category/Product/detail/price-setting reads over the existing credentialed Axios/refresh boundary, and shared loading/empty/error/retry/forbidden/not-found surfaces. Route placeholders establish composition only; no Category/Product mutation workflow, Backend/API, schema/migration, Storefront, global-state package, or dependency change was introduced.

### Validation

Admin typecheck, lint, all 43 Node unit/component tests, production build, and both production-build Chromium/axe journeys passed. The browser evidence covered protected return routing, Persian RTL, narrow-screen keyboard navigation, active links, independent mutation permission presentation, direct-route denial, and runtime loss of `catalog.read`. Repository-wide typecheck, lint, all real tests, and all application builds passed. Formatting, local links, `git diff --check`, dependency/scope/generated-artifact review, and clean Git-index checks passed.

**Important Decisions:** Server route layouts/pages remain the default; one client shell owns only session snapshot, current pathname, disclosure state, and logout. `catalog.read` gates all catalog capability presentation, while mutation permissions remain independent and Backend authorization remains authoritative. Safe reads omit CSRF, retain bounded refresh eligibility, keep domain/permission failures local, publish definitive authentication loss globally, and reject malformed request identifiers or success envelopes before UI use.

**Files / Areas Changed:** Admin catalog routes, shell/navigation/state components, permission and return-route helpers, catalog contracts/read client/error mapping, responsive styles, JSDOM and Chromium evidence, frontend architecture/project reality, and Sprint execution records.

**Documentation Impact:** Recorded the implemented protected shell/read-client boundary without claiming Category or Product workflows exist.

**Follow-ups:** S3-T04 is Current and awaiting implementation approval for bounded Category management.

## S3-T04 — Implement Category Management

**Completed:** 2026-09-04

**Result:** Implemented the protected Persian RTL Category tree and complete create, rename, move, and eligible-delete workflows over the existing Backend contracts. The UI provides exact reader/manager presentation, semantic keyboard-operable hierarchy, normalized mutation reconciliation followed by authoritative refresh, duplicate-submit prevention, labelled confirmations, predictable focus, and stable safe conflict recovery without changing Backend/API, schema/migrations, Storefront, or dependencies.

### Validation

Focused Category/client/HTTP tests passed (30 tests), the complete Admin suite passed (58 tests), and repository tests passed (Admin 58; API 73, with environment-dependent integration coverage skipped as designed). Repository typecheck, lint, production builds, and formatting passed. The owner ran the existing Admin production-build Playwright smoke with system Chrome after the Playwright CDN returned a geographic HTTP 403; both tests passed repeatedly, with the latest `2 passed` run completing in approximately 6.5 seconds. `git diff --check`, scope, generated-artifact, dependency-integrity, and clean-index checks passed.

**Important Decisions:** Category state remains route-local. Parent options exclude the edited Category and visible descendants only as guidance; Backend validation remains authoritative. Successful mutations use normalized responses for immediate reconciliation and then refresh the complete tree. Stable hierarchy/not-found conflicts expose an explicit refresh path, unsafe mutations are single-flight and never retried automatically, and only allowlisted validation detail identifiers can select a field.

**Files / Areas Changed:** Admin Category route UI/state/styles, Category model and stable failure mapping, typed catalog mutation client and safe HTTP validation-detail parsing, focused interaction/model/client tests, frontend architecture/project reality, and Sprint execution records.

**Documentation Impact:** Recorded implemented Category management and retained Product workflows as future Sprint 3 work.

**Follow-ups:** S3-T05 is Current and awaiting implementation approval for Product listing and Draft creation.

## S3-T05 — Implement Product Listing and Draft Creation

**Completed:** 2026-09-04

**Result:** Implemented the protected Persian RTL Product list and focused atomic Draft Product creator over the existing Backend contracts. The list owns canonical exact filters/pagination, responsive summaries, price-unit display, empty/error states, and permission-aware creation access. The creator supports fixed default/named Variant modes, dynamic initial Variants, normalized text/SKU, exact rial/toman conversion, initial absolute Inventory, dirty-navigation protection, validation focus, single-flight submission, and normalized success routing without Backend/API, schema/migration, Storefront, or dependency changes.

### Validation

Focused Product transformation/failure/client/component evidence passed (19 tests), the complete Admin suite passed (72 tests), and repository tests passed (Admin 72; API 73, with environment-dependent integration coverage skipped as designed). Repository typecheck, lint, production builds, formatting, Playwright discovery, local links, `git diff --check`, scope, generated-artifact, dependency-integrity, and clean-index checks passed. The owner ran the updated Admin production-build Playwright smoke with system Chrome; both tests passed in 19.5 seconds.

**Important Decisions:** Product list URL state contains only canonical page, page-size, exact Category, and lifecycle values; API ordering remains authoritative. The Draft form retains its loaded price unit for its lifetime and submits canonical `priceRial`. Default mode creates exactly one optionless Variant; named mode requires size or color for every Variant. Client guidance never replaces Backend authorization, normalization, uniqueness, mode, range, or transaction authority.

**Files / Areas Changed:** Admin Product list/create routes and responsive styles, Product query/price/form/error helpers, typed atomic create client boundary, focused unit/component/client tests, updated Chromium smoke, frontend architecture/project reality, and Sprint execution records.

**Documentation Impact:** Recorded implemented Product listing and Draft creation while retaining Product maintenance, Inventory, media, setting mutation, and publication as later Sprint tasks.

**Follow-ups:** S3-T06 is Current and awaiting implementation approval for Product and retained-Variant maintenance.

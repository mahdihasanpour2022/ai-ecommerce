# Sprint 3: Admin Catalog Management

**Status:** Active

**Planned:** 2026-09-04

**Plan Approved:** 2026-09-04

## Required Context

- [Roadmap Sprint 3](../roadmap.md#sprint-3--admin-catalog-management) for the approved Goal, dependencies, open decisions, and Exit Outcome.
- [Catalog specification](../features/catalog/specification.md) for the implemented Backend behavior, permissions, DTOs, failures, lifecycle, inventory, pricing, and media rules consumed by Admin.
- [Frontend architecture](../architecture/frontend-architecture.md), [frontend standards](../standards/frontend.md), and [testing standards](../standards/testing.md) for the Next.js App Router, Persian RTL, accessibility, state, form, and evidence boundaries.
- [Authentication specification](../features/admin-auth/specification.md) and [authorization policy](../security/authorization.md) only for the existing Admin session, current permission snapshot, and Backend-authoritative enforcement behavior.
- [Task execution standards](../standards/execution.md) for Minimum Sufficient Sprint Scope and owner-decision boundaries.

Completed Sprint 1 authentication and Sprint 2 catalog internals are dependencies, not a reason to reopen their implementation. Storefront, commerce, production storage, and unrelated completed-task history are not required context.

## Goal

Enable an authorized Persian RTL Admin to create and maintain Categories, clothing Products and Variants, exact Inventory, Product Images, the global price display/input setting, and a valid Storefront-visible Product through the existing protected Backend contracts.

## Accepted Owner Decisions

The owner approved the following product and UX decisions with the Sprint 3 plan on 2026-09-04.

### Access and staff roles

**Accepted:** Sprint 3 creates no new Role, grant, or Role-management UI. The seeded `SUPER_ADMIN` remains the only provisioned operator, while every Admin action is independently shown or disabled from the current `/auth/me` permission snapshot and remains Backend-authorized. This completes the catalog workflow without inventing a staff organization; non-Super-Admin Role composition remains deferred until actual staffing requirements exist.

### Product workflow and publication readiness

**Accepted:** Use a Product list, a focused Draft-creation form, and one Product workspace with clear sections for core fields, Variants, Inventory, Images, and lifecycle. Creation atomically submits the required Product and initial Variant data. The workspace displays an explicit readiness summary and preserves normalized server responses. Publication remains an intentional confirmed action; the UI explains known missing prerequisites, while the Backend remains authoritative and its stable conflict is shown if state changed or another invariant still fails.

### Inventory semantics

**Accepted:** Admins edit absolute on-hand quantity per Variant using the last-read optimistic version. A stale conflict never merges or retries silently: the UI reloads current quantity/version, explains the conflict, and requires a fresh intentional submission. Adjustment deltas, reasons, history, reservations, multi-location inventory, and bulk inventory are deferred.

### Product Image experience

**Accepted:** Manage Images inside the Product workspace with accessible upload, preview, replace, remove, and move-earlier/move-later controls; pointer reordering may supplement but never replace keyboard-operable controls. The UI states the nine-image and strict under-400-KiB JPEG/PNG/WebP rules before upload, never accepts SVG, uses immutable protected content URLs, and handles stale `imageVersion` by reloading rather than guessing. Cropping, transformations, bulk upload, CDN/object storage, and generalized media tooling remain deferred.

### Audit history

**Accepted:** Do not add persistent catalog audit history or an audit-log UI in Sprint 3. It would require new product retention rules and Backend persistence outside the verified Sprint 2 foundation. Revisit the security/retention policy before production hardening in Sprint 9; existing authentication, authorization, safe server logging, and database integrity remain required now.

## Scope

### Admin foundation

- Extend the existing authenticated Persian RTL Admin shell with catalog navigation and route-level loading, unauthorized, connectivity, empty, error, retry, and not-found behavior.
- Add the minimum approved Admin UI, form, accessible interaction-test, and browser-e2e dependencies through a separately approved implementation task; integrate Ant Design with App Router first-render style handling, Persian locale, and RTL direction.
- Keep Server Component route composition where useful and use narrow Client Component boundaries for the existing browser-held session/CSRF model, interactive forms, uploads, and mutations.
- Add one typed catalog client boundary over the existing credentialed Axios/auth refresh infrastructure. Do not duplicate CSRF, refresh, error-envelope, or Backend validation behavior in pages.

### Catalog management

- Manage the complete bounded Category tree: create, rename, move, and eligible delete with accessible hierarchy presentation and safe conflict recovery.
- List protected Products with existing status/exact-Category filters, deterministic pagination, price and exact Inventory summaries, main Image, and meaningful empty/error states.
- Create Draft Products with one or more valid initial Variants and optional initial absolute Inventory quantities.
- View and edit Product core fields and retained Variants, including SKU, size/color, canonical price input/display conversion, active state, and lifecycle-safe conflict behavior.
- Read and update exact Inventory with optimistic versions and explicit stale-write recovery.
- Read and update the singleton rial/toman display/input setting without changing canonical stored/submitted `priceRial` values.
- Upload, preview, reorder, replace, and remove Product Images through the accepted secure media contracts and optimistic `imageVersion` behavior.
- Present publication readiness and allowed lifecycle transitions, enabling a complete Draft to become Active and remain maintainable without bypassing Backend invariants.

### Quality and verification

- Preserve authentication/session recovery, session-bound CSRF, exact permission-aware UX, Backend-authoritative authorization, safe errors, and no credential persistence.
- Cover user-visible form behavior, asynchronous/race/conflict states, Persian RTL, responsive layouts, keyboard/focus/announcement behavior, and permission combinations with meaningful component/integration tests.
- Add a small critical browser journey against the real Admin and API covering login, Category creation, Draft Product creation, Inventory, Image upload, activation, and protected Product visibility; keep exhaustive domain permutations in lower-level tests.
- Run relevant Admin/API tests, the real PostgreSQL suite required by changed cross-application behavior, production builds, typecheck, lint, formatting, accessibility checks, generated-artifact/scope checks, database/storage cleanup, and Sprint exit verification.

## Out of Scope

- New Backend catalog routes, DTO semantics, database schema/migrations, permissions, Roles/grants, Role-management UI, or audit persistence unless a reproduced contract defect or separately approved decision requires a new task.
- Storefront catalog discovery, public URLs/slugs/SEO, search, selectable sorting, descendant-inclusive filters, exact public stock, or customer interaction.
- Cart, reservations, Checkout, Orders, Payments, shipping, discounts, taxes, price history, multi-currency, or inventory adjustment history.
- Production object storage/CDN, image cropping/transformation, bulk imports/exports/edits, generalized media/jobs, dashboards, analytics, or speculative shared packages/global state.
- Broad Admin redesign unrelated to the minimum catalog workflow.

## Dependencies

- Sprint 1 Admin authentication/authorization is Completed.
- Sprint 2 catalog persistence, protected contracts, secure media, display setting, and public-read foundation are Completed and verified.
- The accepted Yarn/Next.js 16/React 19 toolchain and local PostgreSQL environment remain available.
- Exact new package versions, compatibility, browser tooling, and CI/runtime impact must be documented and explicitly approved in S3-T02 before dependency changes.

## Architecture and Contract Impact

- Primary impact is `apps/admin`: new catalog routes and feature modules compose over the existing Auth Provider and credentialed HTTP client. No cross-application component package or new global state layer is planned.
- Existing `/api/v1/admin/catalog/**` contracts remain the sole catalog authority. No Backend API or OpenAPI change is expected; any reproduced mismatch stops the affected task for bounded review rather than silently changing accepted semantics.
- No database change is expected. Inventory and Image conflicts use existing `version`/`imageVersion`; canonical prices remain integer `priceRial` at the API boundary.
- Frontend permission state improves usability only. Protected operations remain authenticated, current-state checked, exact-permission guarded, and CSRF/origin enforced by the API.

## Exit Criteria

- A provisioned authorized Admin can sign in and complete the minimum Category-to-Active-Product workflow using the Admin application and existing Backend API.
- Category, Product, Variant, Inventory, price-setting, Image, and lifecycle screens implement the accepted fields/actions and stable failures without inventing or weakening Backend behavior.
- Permission-aware navigation and actions correctly represent independent read/catalog/inventory/media/setting capabilities; direct or stale UI access remains safely rejected by the Backend.
- All forms prevent duplicate mutation, preserve actionable field/form errors, use canonical rial API values with exact rial/toman display/input conversion, and recover explicitly from Inventory/Image/lifecycle conflicts.
- Product Image UI enforces helpful client prechecks while retaining authoritative server validation, exposes no path/key, supports accessible ordering, and leaves no temporary test bytes.
- Every data-dependent view has tested loading, empty, success, error, retry, unauthorized, and relevant stale/not-found behavior in Persian RTL responsive layouts targeting WCAG 2.2 AA.
- Meaningful Admin component/integration tests and the critical real Admin/API browser journey pass, alongside applicable API/PostgreSQL regressions and cleanup checks.
- Admin/repository typecheck, lint, production build, formatting, dependency integrity, local-link, generated-artifact, prohibited-scope, and clean-index checks pass.
- Documentation reflects the implemented Admin workflow and any approved dependency/testing decisions without claiming Storefront, audit, Role-management, or later commerce behavior.
- No known Sprint 3 shortcut forces a foreseeable breaking correction for Sprint 4 public catalog discovery.

## Minimum Sufficient Scope Review

- **Missing check:** The queue covers the complete prerequisite workflow: access shell, Categories, Product/Variant creation and maintenance, canonical price setting, Inventory, Images, publication, permissions, accessibility, and critical Admin/API evidence.
- **Over-planning check:** Role management, audit persistence, generalized state/components, advanced media, bulk operations, dashboards, Storefront work, and later commerce concerns are excluded.
- **Placement check:** Every queued item is required for the Sprint 3 Admin Exit Outcome or the immediately dependent Sprint 4 catalog milestone; public discovery itself remains Sprint 4.
- **Dependency check:** Specification precedes exact dependency approval; the shared shell/client precedes feature screens; prerequisite data and Draft editing precede final publication integration; verification is last. No deeper ordering is imposed where feature tasks can remain independently scoped.

## Ordered Task Queue

The approved ordered queue and sole Current task state are maintained in [Sprint 3 work](../work/sprint-03/queue.md). This plan does not duplicate changing task status.

## Approval State

Sprint Plan Approved. S3-T01 and S3-T02 are Done. S3-T03 is Current and awaiting implementation approval. Plan approval does not authorize task implementation.

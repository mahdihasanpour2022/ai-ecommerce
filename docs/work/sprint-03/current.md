# Current Task

## S3-T05 — Implement Product Listing and Draft Creation

## Goal

Implement the protected Persian RTL Product list and focused Draft Product creation workflow over the existing catalog contracts, with canonical URL filters/pagination, exact permission presentation, Category and price-setting inputs, validated Variant modes, canonical rial conversion, and normalized success/failure handling.

## Why

The completed Category workflow supplies authoritative Product classification. A reliable list and atomic Draft creator establish the Product entry point needed by later Product, Variant, Inventory, Image, and lifecycle tasks without prematurely implementing their maintenance behavior.

## Minimum Sufficient Required Context

- [Admin catalog specification](../../features/admin-catalog/specification.md), limited to Product list, Draft Product creation, shared form/state/accessibility rules, permission matrix, URL behavior, and price input rules.
- Existing `apps/admin/app/catalog` shell, permission capability, typed Product/Category/price-setting reads, Category mutation patterns, centralized HTTP/CSRF/error boundary, shared states, React Hook Form/Ant Design adapter, and focused test harness.
- [Catalog specification](../../features/catalog/specification.md) and implemented Backend Product list/create DTO/controller/error surface only for filters, pagination/order, atomic Draft/Variant/Inventory creation, normalization, mode rules, canonical `priceRial`, exact permissions, CSRF, statuses, and stable codes.
- [Frontend architecture](../../architecture/frontend-architecture.md), [frontend standards](../../standards/frontend.md), and installed Next.js 16.3.2/Ant Design 6/React Hook Form 7 guidance only for URL state, responsive records, forms, and navigation.
- [Authorization policy](../../security/authorization.md) for Backend-authoritative `catalog.read`/`catalog.manage`, and [testing standards](../../standards/testing.md) for meaningful transformation/component/client evidence.

Product workspace maintenance, later Variant/Inventory/setting/Image/lifecycle behavior, real database/browser fixtures, Backend persistence internals, Storefront, and later Sprint work are not required.

## Scope

- Replace the Product list placeholder with the protected Product contract defaults: page 1, page size 25, exact optional Category and `DRAFT`/`ACTIVE`/`ARCHIVED` filters, and API-owned latest-update ordering.
- Canonicalize supported URL state; reject or normalize malformed filters/pages/page sizes, reset page on filter/page-size changes, and canonicalize out-of-range pages from response metadata.
- Render accessible responsive Product records containing name, Category, lifecycle, Variant counts, main-Image or textual fallback, current-unit min/max price, exact aggregate on-hand quantity, updated time, and workspace navigation.
- Distinguish an empty catalog from a filtered no-match state and expose Draft creation only to users with both `catalog.read` and `catalog.manage`.
- Implement focused Draft creation requiring Product name, Category, and at least one Variant; support optional description and the explicit fixed default-versus-named Variant mode rules.
- Validate and normalize SKU, size/color, price, and initial quantity guidance; fetch and visibly retain the form's display/input unit and convert valid values to canonical `priceRial` with integer-safe rules.
- Submit through the existing CSRF/single-flight boundary, preserve safe inputs on failure, reconcile only the normalized `201` response, and navigate to the returned Product workspace.
- Map validation, Category, SKU, combination, mode, permission, CSRF, transport, and safe server outcomes without raw diagnostics or partial-success wording.
- Add only Product create types/methods and route-local helpers needed for this task; no dependency or global state layer.

## Out of Scope

- Product core-field editing after creation, Product workspace section implementation, Variant add/edit/reactivation, Inventory updates after creation, price-setting mutation, Images, readiness, lifecycle transitions, or Product deletion.
- Backend route/DTO/OpenAPI changes, schema/migration/reference data, new permissions/Roles, Storefront work, unsupported search/sort, bulk operations, or mode conversion after creation.

## Expected Changes

- Admin Product list URL/state/rendering and focused responsive styling.
- Admin Draft Product route/form, Variant rows/mode rules, price conversion, and navigation.
- Existing typed catalog client extended with atomic Draft Product creation and exact stable failure handling.
- Focused transformation/unit/component/client tests for URL canonicalization, records/empty states, permissions, modes, price conversion, forms, normalized success, failures, focus, pending state, and dirty navigation.
- Frontend/project documentation and Sprint execution records reflecting Product listing and Draft creation only.

## Constraints

- Preserve existing Next.js/React/Yarn/dependency versions, catalog shell/auth/HTTP behavior, and Backend contracts; no dependency change is authorized.
- Backend authorization, Category validity, normalization, SKU/combination uniqueness, mode validity, lifecycle, price/inventory ranges, and atomicity remain authoritative.
- Unsafe requests require current memory-only session CSRF through the centralized client. Never persist credentials, form state, CSRF material, or server diagnostics.
- API payloads always use canonical `priceRial`; the input unit is fixed and visibly labelled for the lifetime of an open form so concurrent setting changes cannot reinterpret typed values.
- Product list URL state contains only allowlisted filters and pagination. Form data never enters URLs.

## Acceptance Criteria

- An authorized reader sees the deterministic protected Product list with canonical filters/pagination, required summary fields, current-unit prices, accessible responsive records, workspace links, and correct loading/empty/filtered-empty/error/retry behavior.
- Invalid URL state is not forwarded; filter/page-size changes reset page, and response metadata safely canonicalizes out-of-range pages.
- Read-only users receive no misleading create action; an authorized manager can create a Draft Product with required core data and one or more valid initial Variants using the explicit fixed mode rules.
- The creator fetches and retains a labelled price input unit, performs exact integer-safe RIAL/TOMAN conversion, normalizes SKUs, and sends canonical atomic Product/Variant/Inventory data without exposing lifecycle selection.
- Duplicate submission is prevented; invalid fields receive focus; dirty navigation is guarded; safe inputs survive failures; and a normalized success routes to the returned Product workspace.
- Relevant stable validation, Category, SKU, combination, mode, permission, CSRF, transport, and safe server outcomes receive safe Persian placement/recovery with no raw diagnostics or automatic mutation retry.
- No Product maintenance, Backend/API/schema/migration/Storefront/dependency behavior is introduced.
- Focused tests plus complete Admin suite, typecheck, lint, production build, applicable Chromium smoke, formatting, relevant root gates, local links, `git diff --check`, scope/generated-artifact, dependency-integrity, and clean-index checks pass.

## Testing Impact

Automated tests required.

- Add transformation tests for URL parsing/canonicalization, Variant mode rules, digit normalization, and exact RIAL/TOMAN integer conversion including divisibility/overflow rejection.
- Add catalog-client tests for exact Product list queries and Draft POST path/body, CSRF/refresh policy, normalized responses, cancellation/stale-read behavior, and safe failures.
- Add component/integration tests for records, responsive semantics, filters/pagination/empty states, permissions, Category/setting load states, Variant rows/modes, validation focus, duplicate prevention, dirty navigation, normalized success routing, and stable failure preservation.
- Preserve complete Admin authentication, shell, Category, UI-foundation, and production-build Chromium smoke regression coverage.

## Swagger / OpenAPI Impact

None. Existing Product list/create contracts are consumed without Backend route, DTO, status, security declaration, or generated OpenAPI changes.

## Validation

- Inspect only the implemented Product list/create DTO/controller/error contract and existing Admin shell/client/Category/form patterns before implementation.
- Run focused Product transformation/client/component tests, then the complete Admin test suite and applicable Chromium smoke.
- Run Admin typecheck, lint, production build, repository formatting, and relevant root gates.
- Validate local Markdown links, `git diff --check`, dependency integrity, generated artifacts, prohibited maintenance/Backend/schema/migration/Storefront scope, and read-only Git index.

## Documentation Impact

Update frontend architecture and project implementation reality for Product listing and Draft creation. Do not claim Product maintenance, publication, media, or Storefront workflows are implemented.

## Approval State

Awaiting Implementation Approval. No dependency, Backend/API, database, or migration change is proposed.

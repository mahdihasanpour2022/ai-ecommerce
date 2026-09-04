# Current Task

## S3-T06 — Implement Product and Variant Maintenance

## Goal

Implement the protected Persian RTL Product workspace overview and retained-Variant maintenance over the existing Product contracts, including normalized core-field edits, named-mode Variant creation, Variant edits and active-state changes, exact permissions, fixed price-unit interpretation, accessible confirmations, and stable conflict recovery.

## Why

The completed list and Draft creator establish Product identity and initial Variants. Maintaining those records is the prerequisite for later exact Inventory, Image, readiness, and publication workflows without duplicating Product detail or mutation state.

## Minimum Sufficient Required Context

- [Admin catalog specification](../../features/admin-catalog/specification.md), limited to Product workspace core fields, Variants, shared form/state/accessibility rules, permission matrix, confirmation behavior, and fixed-unit price rules.
- Existing Admin catalog shell, Product list/create routes, typed Product detail/Category/price-setting reads, centralized HTTP/CSRF/error boundary, permission capability, form/single-flight patterns, and focused test harness.
- [Catalog specification](../../features/catalog/specification.md) and implemented Backend Product detail/update and Variant create/update DTO/controller/error surface only for normalization, lifecycle restrictions, fixed modes, retained active-state behavior, exact permissions, CSRF, statuses, and stable codes.
- [Frontend architecture](../../architecture/frontend-architecture.md), [frontend standards](../../standards/frontend.md), and installed Next.js 16.3.2/Ant Design 6/React Hook Form 7 guidance only for the dynamic workspace route, accessible forms/tabs/confirmations, and responsive behavior.
- [Authorization policy](../../security/authorization.md) for Backend-authoritative `catalog.read`/`catalog.manage`, and [testing standards](../../standards/testing.md) for meaningful component/client regression evidence.

Inventory mutation, price-setting mutation, Images, readiness/publication transitions, real database/browser fixtures, Backend persistence internals, Storefront, and later Sprint work are not required.

## Scope

- Replace the Product detail placeholder with a sectioned protected workspace that loads authoritative Product detail, Categories, and the current price unit while retaining Product name/lifecycle context.
- Implement Overview edits for normalized name, nullable safe plain-text description, and Category; submit changed fields only and reset from normalized responses.
- Render every retained Variant with SKU, nullable size/color, price in the workspace's fixed unit, active state, and exact read-only Inventory.
- Allow named-mode Products to add Variants; keep default-mode Products to their sole retained Variant and do not expose mode conversion.
- Implement changed-field-only Variant edits, nullable size/color clearing, exact canonical price conversion, deactivation confirmation, and labelled reactivation without any delete action.
- Keep Archived Product content read-only until later lifecycle work; preserve safe input and refresh authoritative Product state when lifecycle, mode, combination, SKU, last-active, permission, or not-found outcomes make local state stale.
- Prevent duplicate mutations, expose busy state, focus invalid fields/error summaries, announce normalized success, and never retry mutations automatically.
- Add only Product/Variant update/create client methods/types and route-local helpers needed for this task; no new dependency or global state layer.

## Out of Scope

- Inventory mutation, price display-setting mutation, Images, readiness calculation, lifecycle transition actions, Product/Variant deletion, mode conversion, or Product list/create changes beyond necessary regression fixes.
- Backend route/DTO/OpenAPI changes, schema/migration/reference data, new permissions/Roles, Storefront work, bulk operations, audit history, or advanced workspace navigation.

## Expected Changes

- Admin dynamic Product workspace overview/Variant components, state/forms/confirmations, and focused responsive styling.
- Existing typed catalog client extended with Product update and Variant create/update operations plus exact stable failure handling.
- Focused unit/component/client tests for mode inference, changed-field payloads, price conversion, permissions, Archived behavior, normalized reconciliation, confirmations, focus, duplicate prevention, and stable conflict refresh.
- Frontend/project documentation and Sprint execution records reflecting Product/Variant maintenance only.

## Constraints

- Preserve existing Next.js/React/Yarn/dependency versions, catalog shell/auth/HTTP behavior, and Backend contracts; no dependency change is authorized.
- Backend authorization, normalization, uniqueness, lifecycle, fixed mode, last-active enforcement, ranges, and concurrency remain authoritative.
- Unsafe requests require current memory-only session CSRF through the centralized client. Never persist credentials, form state, CSRF material, or server diagnostics.
- API payloads always use canonical `priceRial`; an open workspace retains its initially loaded, visibly labelled price unit so concurrent setting changes cannot reinterpret typed values.
- Variants are retained records: no delete behavior or optionless/named mode conversion may be invented.

## Acceptance Criteria

- An authorized reader sees authoritative Product core data and all retained Variants/Inventory in an accessible responsive workspace with correct loading/error/not-found/retry states and persistent Product/lifecycle context.
- Read-only users receive no misleading mutation controls; Archived Products remain content-read-only.
- An authorized manager can save changed Product core fields and edit retained Variant SKU, nullable size/color, canonical price, and active state with normalized response reconciliation.
- Named-mode Products can add a valid Variant; default-mode Products cannot add another Variant or convert modes; no Variant delete is exposed.
- Deactivation requires a safe labelled confirmation while reactivation is explicit; pending mutations are single-flight and focus/announcements remain predictable.
- Relevant validation, SKU, combination, mode, lifecycle, last-active, permission, CSRF, not-found, transport, and safe server outcomes preserve safe state and refresh authoritative data when required without raw diagnostics or automatic mutation retry.
- No Inventory/setting/Image/readiness/publication, Backend/API/schema/migration/Storefront/dependency behavior is introduced.
- Focused tests plus complete Admin suite, typecheck, lint, production build, applicable Chromium smoke, formatting, relevant root gates, local links, `git diff --check`, scope/generated-artifact, dependency-integrity, and clean-index checks pass.

## Testing Impact

Automated tests required.

- Add catalog-client tests for exact Product PATCH and Variant POST/PATCH paths/bodies, CSRF/refresh policy, normalized responses, and safe failures.
- Add transformation tests for fixed-mode inference, changed-field payloads, nullable values, and exact fixed-unit price conversion.
- Add component/integration tests for reader/manager/Archived presentation, overview and Variant forms, named/default action availability, confirmation/focus, single-flight behavior, normalized reconciliation, and every relevant stable conflict family.
- Preserve complete Admin authentication, shell, Category, list/create, UI-foundation, and applicable production-build Chromium smoke regression coverage.

## Swagger / OpenAPI Impact

None. Existing Product/Variant contracts are consumed without Backend route, DTO, status, security declaration, or generated OpenAPI changes.

## Validation

- Inspect only the implemented Product detail/update and Variant create/update DTO/controller/error contracts plus existing Admin list/create/form patterns before implementation.
- Run focused Product workspace transformation/client/component tests, then the complete Admin test suite and applicable Chromium smoke.
- Run Admin typecheck, lint, production build, repository formatting, and relevant root gates.
- Validate local Markdown links, `git diff --check`, dependency integrity, generated artifacts, prohibited Inventory/setting/Image/lifecycle/Backend/schema/migration/Storefront scope, and read-only Git index.

## Documentation Impact

Update frontend architecture and project implementation reality for Product and retained-Variant maintenance. Do not claim Inventory mutation, Image, publication, or Storefront workflows are implemented.

## Approval State

Awaiting Implementation Approval. No dependency, Backend/API, database, or migration change is proposed.

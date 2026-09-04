# Current Task

## S3-T04 — Implement Category Management

## Goal

Implement the protected Persian RTL Category tree and complete create, rename, move, and eligible-delete workflows over the existing Category contracts with exact permissions, normalized reconciliation, accessible hierarchy interaction, and explicit conflict recovery.

## Why

Categories are prerequisite catalog structure for Product creation and filtering. Completing this bounded workflow first gives later Product tasks an authoritative accessible Category selector without duplicating tree or mutation behavior.

## Minimum Sufficient Required Context

- [Admin catalog specification](../../features/admin-catalog/specification.md), limited to Category management, shared form/state/accessibility rules, permission matrix, and confirmation behavior.
- Existing `apps/admin/app/catalog` shell, permission capability, typed contract/read client, error mapping, shared states, React Hook Form/Ant Design adapter, and focused test harness.
- [Catalog specification](../../features/catalog/specification.md) and implemented Backend Category controller/DTO/error surface only for tree ordering, normalization, depth/limit, create/update/delete contracts, exact permissions, CSRF, statuses, and stable codes.
- [Frontend architecture](../../architecture/frontend-architecture.md), [frontend standards](../../standards/frontend.md), and installed Next.js 16.3.2/Ant Design 6/React Hook Form 7 guidance only for the Category route's existing boundaries, accessible tree/forms/dialogs, and responsive behavior.
- [Authorization policy](../../security/authorization.md) for Backend-authoritative `catalog.read`/`catalog.manage`, and [testing standards](../../standards/testing.md) for meaningful component/client regression evidence.

Product, Variant, Inventory, price-setting, Image, lifecycle, real database/browser fixtures, Backend persistence internals, Storefront, and later Sprint work are not required.

## Scope

- Replace the Category route placeholder with the complete bounded tree loaded from the existing protected Category GET contract in authoritative order.
- Provide semantic, keyboard-operable expand/collapse hierarchy with Category name and level, meaningful loading/empty/error/retry states, and responsive behavior.
- For `catalog.read` plus `catalog.manage`, implement create at root/selected parent and edit name/parent workflows using React Hook Form and Ant Design controlled inputs.
- Exclude the edited Category and visible descendants from parent choices for guidance while retaining Backend cycle/depth authority.
- Implement eligible delete with a labelled confirmation naming the Category; omit or prevent delete for visibly non-leaf nodes while treating Product references and concurrent changes as Backend-owned outcomes.
- Reconcile successful mutations from normalized responses, then refetch the complete authoritative tree; preserve safe input on failures and recover explicitly from stable conflicts.
- Map exact validation, name, hierarchy, limit, non-empty, not-found, permission, CSRF, transport, and safe server failures without displaying raw diagnostics.
- Prevent duplicate mutation, mark pending controls busy/disabled, focus first invalid fields or error summaries, announce success, and return focus after dialogs.
- Add only the Category mutation methods/types needed to the existing catalog client; no new dependency or global state layer.

## Out of Scope

- Product listing/creation/editing, Product Category reassignment, Variant, Inventory, price-setting, Image, readiness, or lifecycle behavior.
- Backend route/DTO/OpenAPI changes, schema/migration/reference data, new permissions/Roles, Storefront work, drag-and-drop tree ordering, bulk Category operations, or persistent audit history.

## Expected Changes

- Admin Category route components/state/forms/dialogs and focused responsive styling.
- Existing typed catalog client extended with create/update/delete Category operations and exact stable failure handling.
- Focused unit/component/client tests for tree, permissions, forms, normalization, conflicts, confirmation, focus, and retry behavior.
- Frontend/project documentation and Sprint execution records reflecting implemented Category management only.

## Constraints

- Preserve the existing Next.js/React/Yarn/dependency versions, catalog shell/auth/HTTP behavior, and Backend contracts; no dependency change is authorized.
- Backend authorization, normalization, uniqueness, hierarchy depth/cycles, 1,000-Category limit, references, and concurrency remain authoritative.
- Unsafe requests require the current memory-only session CSRF through the centralized client. Never persist credentials, Category form state, or server diagnostics.
- Use `catalog.read` for visibility and `catalog.manage` independently for mutations. UI hiding/disabled state never substitutes for API authorization.
- Do not optimistically retain a guessed hierarchy after create/move/delete; refetch the authoritative tree after the normalized mutation response.

## Acceptance Criteria

- An authorized reader sees the complete ordered nested Category tree with name/level, accessible expand/collapse, and correct empty/loading/error/retry behavior; read-only users see no misleading mutation controls.
- An authorized manager can create a root or child Category and rename or move an existing Category using persistent labels, valid parent guidance, duplicate-submit prevention, and normalized server-response reconciliation followed by authoritative tree refresh.
- The parent selector excludes the edited Category and its visible descendants without claiming that client filtering enforces cycle/depth safety.
- Eligible leaf deletion requires a safe labelled confirmation, returns focus predictably, and preserves the tree on failure; visibly non-leaf Categories cannot be misleadingly deleted.
- `CATEGORY_NAME_CONFLICT`, `CATEGORY_MOVE_INVALID`, `CATEGORY_LIMIT_REACHED`, `CATEGORY_NOT_EMPTY`, `CATEGORY_NOT_FOUND`, `VALIDATION_FAILED`, insufficient permission, CSRF failure, transport, and safe server outcomes receive stable Persian placement/recovery with no raw diagnostics or automatic mutation retry.
- Runtime permission loss removes mutation controls and Backend denial remains final; no Product/Backend/schema/migration/Storefront/dependency behavior is introduced.
- Focused tests plus the complete Admin suite, typecheck, lint, production build, existing Chromium smoke, formatting, relevant root gates, local links, `git diff --check`, scope/generated-artifact, and clean-index checks pass.

## Testing Impact

Automated tests required.

- Add catalog-client tests for exact Category POST/PATCH/DELETE paths, bodies, CSRF/refresh policy, normalized responses, and safe failures.
- Add component/integration tests for nested rendering, keyboard expand/collapse, reader/manager presentation, create/edit parent choices, validation focus, pending duplicate prevention, normalized reset/refetch, confirmation focus return, and every relevant stable conflict family.
- Preserve and run complete Admin authentication, shell, UI-foundation, and production-build Chromium smoke regression coverage.

## Swagger / OpenAPI Impact

None. Existing Category contracts are consumed without Backend route, DTO, status, security declaration, or generated OpenAPI changes.

## Validation

- Inspect only the implemented Category controller/DTO/error contract and existing Admin shell/client/form patterns before implementation.
- Run focused Category client/component tests, then the complete Admin test suite and Chromium smoke.
- Run Admin typecheck, lint, production build, repository formatting, and relevant root gates.
- Validate local Markdown links, `git diff --check`, dependency integrity, generated artifacts, prohibited Product/Backend/schema/migration/Storefront scope, and read-only Git index.

## Documentation Impact

Update frontend architecture and project implementation reality for Category management. Do not claim Product workflows are implemented.

## Approval State

Awaiting Implementation Approval. No dependency, Backend/API, database, or migration change is proposed.

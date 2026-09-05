# Sprint 3 Current Task

## S3-T07 — Implement Inventory and Price Display-Setting Management

## Goal

Complete the Admin workflows for exact per-Variant Inventory updates and the global rial/toman display/input setting over the existing protected Backend contracts.

## Why

Authorized staff need to maintain sellable stock with explicit optimistic-concurrency recovery and control how prices are presented and entered without changing canonical rial persistence. These workflows are required before media and publication integration can complete Sprint 3.

## Minimum Sufficient Required Context

- [Sprint 3 plan](../../sprints/sprint-03.md) for approved scope, quality requirements, and exit criteria.
- [Admin catalog behavior specification](../../features/admin-catalog/specification.md), specifically authentication/request behavior, permission matrix, shared interaction states, price display/input unit, Inventory management, confirmation boundaries, and testing contract.
- [Catalog specification](../../features/catalog/specification.md), specifically canonical price, global display/input unit, Inventory update/concurrency, authorization, HTTP contracts, DTOs, and stable failures.
- [Frontend architecture](../../architecture/frontend-architecture.md) for server/client ownership, same-origin BFF/authentication, route-local state, forms, accessibility, and Admin composition.
- Existing Product workspace, catalog API/contracts/error handling, price conversion helpers, permission capabilities, shared route states, and interaction-test patterns.

## Scope

- Add exact absolute Inventory editing for each retained Variant in the Product workspace, visible only with `inventory.update` while preserving read-only quantities for `catalog.read` users.
- Submit `onHandQuantity` with the exact last-read positive `version`, reconcile the normalized response, announce success, and support intentional same-value updates.
- On `INVENTORY_VERSION_CONFLICT`, explain the conflict, refetch authoritative Product detail, show the new quantity/version, preserve the user's awareness of the attempted value, and require fresh entry/confirmation without automatic retry.
- Handle missing Variant, Product lifecycle conflicts, permission/CSRF/authentication loss, cancellation, and transport uncertainty through existing safe state boundaries.
- Implement `/catalog/settings/price-display-unit` read and permission-aware `RIAL`/`TOMAN` update with an explicit confirmation that persisted Variant prices are not rewritten.
- Refresh affected displayed price state after a successful setting update while preserving the fixed unit captured by already-open Product forms.
- Add focused model/client/component tests and update browser smoke only where this task changes its covered route behavior.

## Out of Scope

- Relative increment/decrement controls, bulk Inventory editing, reservations, adjustment reasons/history, multi-location stock, automatic conflict retries, price rewriting, new currencies, decimals/rounding, Product Image work, lifecycle/publication work, Storefront UI, Backend contract/schema changes, migrations, and new dependencies.

## Expected Changes

- Admin Product workspace Inventory section and route-local state/forms.
- Admin price display-setting route and confirmation flow.
- Existing typed catalog API/contracts, failure mapping, price/integer normalization helpers, and focused tests.
- Sprint/project-reality documentation only where implemented behavior changes.

## Constraints

- Backend authentication, authorization, validation, optimistic version checks, and normalized responses remain authoritative.
- Inventory is an absolute integer from 0 through 2,147,483,647; mutation is single-flight and never automatically retried.
- Every API monetary value remains positive safe-integer `priceRial` divisible by 10; conversion uses integer arithmetic only.
- `inventory.update` and `settings.price.display.unit.update` remain independent permissions in addition to `catalog.read`.
- Reuse the implemented same-origin BFF, readable Strict CSRF cookie, server-seeded authentication state, React Hook Form/Zod patterns, Ant Design 6, and Persian RTL/accessibility conventions.
- No dependency, Backend API, Prisma schema, or migration change.

## Acceptance Criteria

- Readers see exact Inventory and the current display unit, while mutation controls are absent without the exact independent permission.
- An authorized Inventory update sends the current version, accepts zero/bounds and intentional same-value submission, reconciles quantity/version, and announces success accessibly.
- A stale Inventory write never overwrites newer state: authoritative data is refetched and a fresh intentional submission is required.
- The setting page accurately presents `RIAL`/`TOMAN`; an authorized confirmed update changes interpretation only and clearly states that persisted prices are untouched.
- Existing forms retain their captured unit; newly opened/refreshed forms and read-only prices adopt the updated unit.
- Pending, error, retry, permission loss, CSRF/authentication, conflict, not-found, and transport states remain safe, keyboard/focus accessible, Persian RTL, and responsive.

## Testing Impact

- Add unit coverage for Inventory bounds/version payloads, normalized response reconciliation, stale recovery, and exact rial/toman behavior.
- Add component/client coverage for reader versus updater permissions, single-flight submissions, same-value update, conflict refetch/re-entry, setting confirmation, success refresh, failure preservation, focus, and announcements.
- Run the complete Admin regression suite, affected production browser smoke, typecheck, lint, formatting, production builds, and scope/diff checks.
- Backend HTTP contracts do not change; reuse existing Backend test evidence unless implementation exposes a contract mismatch.

## Validation

- Focused Inventory, price-setting, catalog-client, and component tests pass.
- Complete Admin tests, typecheck, lint, and production build pass.
- Admin Playwright production-build smoke passes with installed system Chrome if changed browser behavior invalidates prior evidence.
- Repository formatting, `git diff --check`, dependency integrity, generated-artifact, prohibited-scope, and documentation checks pass.

## Documentation Impact

Update project reality, frontend architecture, and Sprint records to describe only the Inventory and price-setting workflows actually completed. No API/OpenAPI, database, security-contract, or environment-document change is expected.

## Approval State

Awaiting Implementation Approval.

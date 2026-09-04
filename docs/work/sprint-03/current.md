# Sprint 3 Current Task

## S3-T07 — Implement Inventory and Price Display-Setting Management

## Goal

Implement exact per-Variant Inventory updates with optimistic-version conflict recovery and protected global rial/toman display/input-unit management over the existing Backend contracts.

## Why

Authorized Admins need safe absolute stock maintenance and one explicit price interpretation setting before media and publication workflows can be completed.

## Minimum Sufficient Required Context

- [Admin catalog specification](../../features/admin-catalog/specification.md), limited to permission/request rules, shared form/state/accessibility rules, Product workspace Inventory, price display/input unit, confirmation boundaries, and their testing contract.
- [Sprint 3 plan](../../sprints/sprint-03.md), limited to the accepted Inventory semantics, Product workflow interaction, exact scope, exclusions, and validation expectations.
- Implemented Backend Inventory and price-setting DTO/controller/error/OpenAPI contracts plus the existing Admin Product workspace/catalog client only for exact paths, normalization, optimistic versions, permissions, CSRF, stable codes, and reusable UI patterns.
- [Frontend architecture](../../architecture/frontend-architecture.md), [frontend standards](../../standards/frontend.md), [authorization policy](../../security/authorization.md), and [testing standards](../../standards/testing.md), limited to route-local state, accessible forms/confirmation, Backend-authoritative permissions, and risk-based evidence.

## Scope

- Add absolute `onHandQuantity` editing per retained Variant only for `catalog.read` plus `inventory.update`, sending the exact last-read positive version.
- Reconcile returned quantity/version for every success, including same-value submissions; never expose delta, bulk, reservation, reason, or history semantics.
- On stale version, preserve an explicit explanation, refetch authoritative Product detail, show the winning quantity/version, and require fresh intentional entry without retry or merge.
- Refetch safely for missing Variant or lifecycle conflicts and preserve readable authoritative workspace state for permission, CSRF, transport, and unexpected failures.
- Implement the protected price display-setting page for current `RIAL`/`TOMAN` read and confirmed update, clearly stating persisted `priceRial` values are not rewritten.
- Refresh read-only prices after setting success while keeping already-open Product form units fixed until explicit navigation/reload.
- Preserve exact Persian RTL, responsive, focus, announcement, single-flight, and runtime permission-revocation behavior.

## Out of Scope

- Product Images, readiness/lifecycle/publication, Storefront behavior, bulk or adjustment Inventory, reservations/history, multi-location stock, price rewriting, mode conversion, Backend/API/schema/migration changes, dependencies, and unrelated cleanup.

## Expected Changes

- Extend the typed Admin catalog client with existing Inventory update and setting update contracts.
- Extend the Product workspace Inventory section and implement the price display-setting route.
- Add route-local normalization/failure helpers, accessible confirmation/state styling, and focused client/model/component/browser coverage.
- Update frontend architecture, project reality, and Sprint execution records after validation.

## Constraints

- Backend authorization, optimistic concurrency, lifecycle validity, numeric bounds, canonical `priceRial`, and setting persistence remain authoritative.
- Inventory sends an absolute integer from 0 through 2,147,483,647 and exactly the last-read version; mutations are single-flight and never retried automatically.
- Setting changes require confirmation with no preselected confirmation action and never rewrite catalog prices.
- Product price forms retain the unit captured at initialization; only navigation or explicit reload adopts a new setting.
- No dependency, Backend route/DTO, OpenAPI, Prisma, migration, or Storefront change is authorized.

## Acceptance Criteria

- Readers see exact Inventory and the current price unit without misleading mutation controls; each mutation control requires its independent exact permission.
- Authorized Inventory updates send exact absolute quantity/version and reconcile returned quantity/version, including same-value success.
- Version conflict reloads authoritative detail, explains the winning update, and requires fresh entry without silent merge/retry; missing/lifecycle/permission/CSRF/transport outcomes remain safe.
- Authorized setting update requires a labelled confirmation, states that persisted prices are unchanged, reconciles the returned unit, and refreshes affected read-only prices.
- Exact integer-only rial/toman conversion, safe-integer overflow/divisibility rules, supported localized digits/grouping, fixed open-form unit, focus, announcements, responsive behavior, and single-flight controls match the specification.
- No out-of-scope Inventory semantics, Image, lifecycle/publication, Backend/API/schema/migration, Storefront, dependency, or unrelated behavior is introduced.
- Focused tests plus complete Admin suite, typecheck, lint, production build, applicable Chromium smoke, formatting, relevant root gates, local links, `git diff --check`, scope/generated-artifact, dependency-integrity, and clean-index checks pass.

## Testing Impact

Automated tests required.

- Add client tests for exact Inventory PATCH and setting PATCH paths/bodies, CSRF/refresh policy, normalized responses, and malformed/safe failures.
- Add transformation tests for absolute quantity/version bounds and exact RIAL/TOMAN input/display conversion including localized digits, divisibility, grouping, and overflow.
- Add component/integration tests for reader/permission combinations, same-value Inventory success, stale conflict refetch/re-entry, missing/lifecycle/runtime-revocation handling, setting confirmation/reconciliation, fixed open-form units, focus/announcements, and single-flight behavior.
- Preserve complete Admin authentication, shell, Category, Product list/create/maintenance, UI-foundation, production-build Chromium, and relevant Backend regression coverage.

## Swagger / OpenAPI Impact

None. Existing Inventory and price-setting contracts are consumed without Backend route, DTO, status, security declaration, or generated OpenAPI changes.

## Validation

- Preflight and inspect only the implemented Inventory/setting DTO/controller/error/OpenAPI contracts and existing Admin Product workspace/client/form patterns before implementation.
- Run focused Inventory/setting transformation/client/component tests, then the complete Admin suite and applicable Chromium smoke.
- Run Admin typecheck, lint, production build, repository formatting, and relevant root gates.
- Validate local Markdown links, `git diff --check`, dependency integrity, generated artifacts, prohibited Image/lifecycle/publication/Backend/schema/migration/Storefront scope, and read-only Git index.

## Documentation Impact

Update frontend architecture and project implementation reality for Inventory and price display-setting management. Do not claim Image, lifecycle/publication, or Storefront workflows are implemented.

## Approval State

Awaiting Implementation Approval. No dependency, Backend/API, database, or migration change is proposed.

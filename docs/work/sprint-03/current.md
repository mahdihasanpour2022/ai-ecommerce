# Current Task

## S3-T01 — Specify Admin Catalog Behavior and UX

## Goal

Turn the approved Sprint 3 Owner Decisions and the implemented Sprint 2 protected catalog contracts into one precise, testable Persian RTL Admin catalog behavior specification and an exact dependency proposal for S3-T02, without changing application code or dependencies.

## Why

The Backend behavior is complete, but the Admin currently has only its authentication shell. Category, Product, Variant, Inventory, setting, Image, and publication screens share user-visible workflow, permission, price-conversion, conflict, responsive, and accessibility decisions. Settling these boundaries first prevents individual UI tasks from inventing inconsistent behavior and allows every later task to use the same acceptance source.

## Minimum Sufficient Required Context

- [Sprint 3 plan](../../sprints/sprint-03.md), especially its accepted Owner Decisions, Scope, Out of Scope, architecture impact, and Exit Criteria.
- [Catalog specification](../../features/catalog/specification.md), limited to Authorization, protected HTTP/DTO contracts, stable failures, transaction/version behavior, Swagger requirements, and testing requirements consumed by Admin.
- [Frontend architecture](../../architecture/frontend-architecture.md) and [frontend standards](../../standards/frontend.md), limited to App Router boundaries, centralized HTTP/auth, Persian RTL, forms, asynchronous states, responsive behavior, and accessibility.
- [Authentication specification](../../features/admin-auth/specification.md) and [authorization policy](../../security/authorization.md), limited to the existing protected-entry/session recovery contract and current permission snapshot.
- [Testing standards](../../standards/testing.md), limited to frontend interaction/accessibility and critical cross-application journey expectations.

Do not load Sprint 2 persistence internals, Storefront guidance, later commerce specifications, or broad completed-task history unless a concrete contract inconsistency requires it.

## Scope

- Specify the minimum Admin route and navigation map for Categories, Product list/create/workspace, and the price display/input setting.
- Specify page/section responsibilities and exact supported actions across Category, Product, Variant, Inventory, Image, and lifecycle management.
- Define the permission-to-navigation/action matrix for `catalog.read`, `catalog.manage`, `inventory.update`, `product.media.manage`, and `settings.price.display.unit.update`, including direct-route and permission-change behavior while keeping the Backend authoritative.
- Define Product Draft creation, sectioned maintenance, readiness presentation, confirmed lifecycle transitions, normalized server-response reconciliation, and safe not-found/archived behavior.
- Define exact rial/toman display and input conversion while preserving canonical integer `priceRial` API payloads and useful mixed-direction presentation.
- Define Inventory and Image optimistic-conflict recovery, duplicate-submit behavior, upload prechecks, accessible ordering, confirmation boundaries, and safe mutation reconciliation.
- Define loading, empty, success, validation, connectivity, server, unauthorized, stale, conflict, retry, focus, announcement, responsive, and Persian RTL behavior at a testable level without prescribing premature component internals.
- Define the minimum user-observable component/integration matrix and one critical browser journey from login and Category creation through Active Product publication.
- Produce the exact S3-T02 dependency/version proposal with purpose, compatibility, lockfile/CI impact, browser runtime requirements, and rejected unnecessary packages; do not install anything.

## Out of Scope

- Application code, styles, tests, dependency or lockfile changes, package installation, Sprint activation changes beyond this already prepared task, or any Backend/schema/migration/reference-data work.
- New Roles/grants, Role management, audit history, Backend endpoints/DTOs, or changes to accepted catalog semantics.
- Detailed visual polish beyond testable layout/content/state/accessibility rules, reusable design-system creation, global state architecture, or implementation-specific component trees.
- Storefront, public discovery, Cart, Checkout, Orders, Payments, production storage, advanced media, bulk workflows, or analytics.

## Expected Changes

- Add one canonical Admin catalog behavior specification under `docs/features/admin-catalog/`.
- Record an exact, bounded dependency proposal for S3-T02 within that specification or a narrowly linked companion artifact.
- Update only directly affected product/frontend implementation-reality documentation if the specification reveals a stale statement.
- On success, append the concise S3-T01 completion record, mark it Done, and prepare S3-T02 as Current with the exact dependency set and `Approval State: Awaiting Implementation Approval`.

## Constraints

- Treat the approved five Sprint 3 Owner Decisions and all Sprint 2 Backend contracts as fixed inputs.
- Backend authorization and validation remain authoritative; permission-aware hiding/disabling and client prechecks are usability behavior only.
- Reuse the existing Auth Provider, memory-only CSRF credential, credentialed Axios client, refresh coordinator, safe error boundary, and App Router architecture.
- Specify the smallest sufficient dependencies and UX. Do not turn the task into implementation design, a broad Admin redesign, or a generic frontend platform.
- Any dependency addition remains separately gated by explicit approval of the prepared S3-T02 task.

## Acceptance Criteria

- One canonical specification defines the complete minimum routes, navigation, page/section workflows, field/actions, confirmation behavior, and normalized response reconciliation required to achieve the Sprint 3 goal.
- The five independent permissions map exactly to visible navigation/actions and direct-route states, including partial-permission and revoked/current-state cases without implying UI authorization.
- Product creation/readiness/lifecycle, Variant mode, Inventory version conflict, Image version/conflict/lifecycle, and rial/toman conversion behavior match the existing Backend contracts with no duplicated or contradictory business rule.
- Every screen and mutation has testable loading, empty, success, validation, safe error, retry, duplicate-submit, stale/not-found, focus/announcement, responsive, and Persian RTL expectations where applicable.
- Accessibility behavior covers semantic structure, labels/instructions, keyboard operation, visible focus, modal focus handling, status/error announcements, tables at narrow viewports, and non-pointer Image ordering toward WCAG 2.2 AA.
- The test strategy identifies meaningful user-observable component/integration cases and one bounded critical production-build Admin/API browser journey without moving exhaustive Backend permutations into e2e.
- The S3-T02 proposal names exact compatible dependency versions and justifies only Ant Design/App Router RTL integration, React Hook Form, accessible interaction testing, and critical browser e2e needs, including CI/browser installation impact and packages deliberately excluded.
- No code, dependency, lockfile, API, schema, migration, permission/reference-data, Storefront, audit, or later-commerce scope is changed.
- Documentation links and terminology are consistent, formatting/static checks pass, and the Git index remains untouched.

## Testing Impact

Documentation/specification task only. No runtime test is required unless an existing documentation validator applies. The specification must define the later unit/component/integration/accessibility/browser evidence matrix, and validation must include local Markdown links, consistency with implemented DTO/error/permission contracts, `git diff --check`, prohibited-scope inspection, and a clean Git index.

## Swagger / OpenAPI Impact

None. This task consumes the verified protected catalog OpenAPI contract and must not change routes, DTOs, response statuses, security declarations, or generated documentation.

## Validation

- Cross-check every specified Admin action and field against the implemented Sprint 2 protected contract map and stable failures.
- Cross-check permission behavior against `/auth/me` effective permissions and existing Backend guards.
- Cross-check App Router/client-boundary and selected package integration assumptions against the installed Next.js 16.3.2 guide and current primary package documentation.
- Validate the dependency proposal against the accepted Yarn/React/Next toolchain without installing packages.
- Run changed-document local-link validation, `git diff --check`, prohibited code/dependency/schema/migration/frontend-runtime scope inspection, and read-only Git-index inspection.

## Documentation Impact

Creates the canonical Admin catalog behavior/UX specification used by S3-T02 through S3-T10 and records the exact dependency proposal required for the next approval boundary. No implementation claim is added.

## Approval State

Awaiting Implementation Approval

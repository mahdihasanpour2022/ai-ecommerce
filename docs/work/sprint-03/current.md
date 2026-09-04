# Current Task

## S3-T03 — Implement the Protected Catalog Shell and Client Boundary

## Goal

Add the protected Persian RTL catalog route shell, responsive permission-aware navigation, typed catalog client/error boundary, and reusable route/data states over the existing authenticated Axios infrastructure so later feature screens share one secure and accessible foundation.

## Why

Category, Product, Inventory, setting, Image, and lifecycle tasks need consistent protected routing, exact permission presentation, contract parsing, refresh/CSRF behavior, and loading/empty/error handling. Establishing those seams first prevents each feature from duplicating authentication or Backend contract logic.

## Minimum Sufficient Required Context

- [Admin catalog specification](../../features/admin-catalog/specification.md), limited to routes/navigation, permission matrix, shared states, responsive/accessibility behavior, and Backend error handling.
- [Frontend architecture](../../architecture/frontend-architecture.md) and [frontend standards](../../standards/frontend.md), limited to App Router boundaries, state/data access, Persian RTL, and accessibility.
- [Authentication specification](../../features/admin-auth/specification.md) and [authorization policy](../../security/authorization.md), limited to the current identity permission snapshot, protected entry, session recovery, and Backend-authoritative authorization.
- Existing `apps/admin` document/provider/auth/HTTP/error boundaries, new Ant Design foundation, tests, and installed Next.js 16.3.2 App Router guides relevant to protected routes, navigation, loading, and error/not-found composition.
- Implemented protected catalog controllers/DTOs and [catalog specification](../../features/catalog/specification.md) only for exact request/response envelopes, stable codes, permissions, paging, and canonical `priceRial`/version fields consumed by the client.
- [Testing standards](../../standards/testing.md) for meaningful shell/client interaction and regression evidence.

Category mutation details, Product forms, Inventory editing, price-setting UI, Image workflows, lifecycle integration, real browser fixtures, database internals, Storefront, and later Sprint work are not required.

## Scope

- Add protected Admin catalog route composition and responsive navigation for the approved catalog destinations while preserving the existing login, bootstrap, protected-entry, and logout behavior.
- Present navigation and direct-route states from the current `/auth/me` permission snapshot using the exact independent permission matrix; UI presentation never replaces Backend authorization.
- Add a typed catalog client boundary over the existing credentialed Axios, CSRF, stable-error, and single-flight refresh/replay infrastructure. Implement only the read methods required to support the shared shell and upcoming Category/Product entry points.
- Parse and expose exact catalog DTO/error envelopes without duplicating Backend domain validation, storing credentials, or introducing a new global-state package.
- Add reusable Persian RTL loading, empty, safe error, retry, forbidden, and not-found presentation patterns with semantic focus/announcement behavior.
- Add focused tests for protected routing, independent permissions, client request/error parsing, responsive navigation semantics, and shared state behavior.

## Out of Scope

- Category CRUD; Product listing/creation/editing; Variant, Inventory, price-setting, Image, readiness, or lifecycle workflows.
- New Backend routes/DTOs/OpenAPI behavior, database/schema/migration/reference-data changes, Roles/grants, Storefront changes, or a real cross-application browser journey.
- TanStack Query, Zustand, schema packages, a generic design system, dashboards, analytics, or broad Admin redesign.

## Expected Changes

- `apps/admin` protected catalog routes/layout/navigation and focused shared state components.
- Typed catalog DTO/error/client modules that reuse the existing Admin HTTP/auth boundary.
- Focused Admin interaction/client tests and minimal styling needed by the responsive shell.
- Frontend/project documentation and Sprint execution records reflecting only implemented shell/client behavior.

## Constraints

- Preserve Next.js 16.3.2, React 19.2.8, the exact S3-T02 dependency set, existing auth semantics, and the accepted Yarn toolchain; no dependency change is authorized.
- Keep Server Components by default and Client boundaries only where session state, interaction, or browser behavior requires them; crossing props must be serializable.
- Never persist Access, Refresh, CSRF, permission, or catalog state in browser storage, and never construct Bearer authorization.
- Use exact permission codes and stable Backend envelopes. Hidden/disabled navigation is usability only; direct access and every operation remain Backend-authorized.
- Avoid speculative feature abstractions: shared seams must be directly exercised by this shell or the immediately following catalog tasks.

## Acceptance Criteria

- Authenticated authorized users can enter a protected catalog shell with Persian RTL responsive navigation to the approved destinations; existing login, bootstrap, refresh, protected entry, and logout behavior remains passing.
- Navigation and direct-route presentation handle the exact independent read/catalog/inventory/media/setting permissions without assuming `SUPER_ADMIN`, while the client still sends requests to the authoritative Backend.
- Catalog calls reuse the centralized credentialed Axios/CSRF/refresh/error behavior and expose typed exact DTOs, paging/version fields, and stable safe failures without duplicating auth interceptors or domain rules.
- Shared loading, empty, error/retry, forbidden, and not-found states are semantic, keyboard/focus conscious, and suitable for later feature routes.
- Responsive navigation is keyboard operable and has deterministic accessible naming/state on narrow and wide layouts.
- No feature mutation UI, Backend/API/schema/migration/Storefront behavior, persisted credential/state, new global state abstraction, or dependency change is introduced.
- Focused new tests plus the complete Admin suite, typecheck, lint, production build, formatting, relevant root gates, local links, `git diff --check`, scope, generated-artifact, and clean-index checks pass.

## Testing Impact

Automated tests required.

- Add client contract tests for exact request construction, DTO parsing, paging/version preservation, stable error classification, and reuse of the existing auth/refresh boundary.
- Add component/integration tests for protected shell routing, independent permission combinations, responsive navigation semantics, and shared loading/error/retry/forbidden/not-found behavior.
- Preserve and run the complete Admin authentication, UI-foundation, and intercepted Chromium smoke suites because the protected shell composes with shared providers and routing.

## Swagger / OpenAPI Impact

None. Existing protected catalog contracts are consumed without Backend route, DTO, status, security declaration, or generated OpenAPI changes.

## Validation

- Inspect the exact implemented Admin auth/HTTP seams and only the protected catalog contracts required by the shell/client boundary.
- Run focused client and shell interaction tests, then the complete Admin test suite and existing Chromium smoke.
- Run Admin typecheck, lint, production build, repository formatting, and root gates affected by shared routing/client changes.
- Validate local Markdown links, `git diff --check`, dependency/direct-version integrity, generated artifacts, prohibited Backend/schema/migration/Storefront/feature scope, and read-only Git index.

## Documentation Impact

Update frontend architecture and project implementation reality for the protected catalog shell/client boundary. Do not claim Category or Product workflows are implemented.

## Approval State

Awaiting Implementation Approval. No dependency, Backend/API, database, or migration change is proposed.

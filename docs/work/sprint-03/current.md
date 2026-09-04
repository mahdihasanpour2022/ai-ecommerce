# Current Task

## S3-T02 — Establish the Approved Admin UI and Test Foundation

## Goal

Install the exact approved Admin runtime/testing dependencies and establish a first-render-safe Persian RTL Ant Design App Router boundary, React Hook Form integration pattern, JSDOM interaction-test harness, and bounded Chromium Playwright harness while preserving the existing authentication behavior.

## Why

The Admin catalog screens require the already accepted Ant Design system, non-trivial accessible forms, realistic interaction tests, and one later critical browser journey. These packages are not currently installed. Establishing and verifying the minimum shared foundation once prevents feature tasks from creating competing providers, form conventions, DOM harnesses, or browser orchestration.

## Minimum Sufficient Required Context

- [Admin catalog specification](../../features/admin-catalog/specification.md), especially shared interaction/accessibility rules and the exact S3-T02 dependency proposal.
- [Frontend architecture](../../architecture/frontend-architecture.md) and [frontend standards](../../standards/frontend.md), limited to App Router boundaries, Persian RTL, forms, accessibility, and dependency restraint.
- Existing `apps/admin` layout/document shell, Auth Provider, HTTP boundary, tests, package scripts, TypeScript configuration, and global styles as the implementation patterns to preserve.
- Installed Next.js 16.3.2 guides for Server/Client Components, `use client`, and Playwright testing; current primary Ant Design 6, React Hook Form 7, Testing Library, JSDOM, Playwright, and axe documentation for the exact integrations in scope.
- [Testing standards](../../standards/testing.md) and [CI documentation](../../development/ci.md) only for the focused harness and repository-gate impact.

Catalog feature screens, Backend internals, Prisma/database documents, Storefront guides, and later Sprint work are not required.

## Scope

- Add these exact Admin runtime dependencies: `antd@6.6.2`, `@ant-design/nextjs-registry@1.3.0`, `@ant-design/cssinjs@2.1.2`, and `react-hook-form@7.87.0`.
- Add these exact Admin development dependencies: `@testing-library/dom@10.4.1`, `@testing-library/react@16.3.3`, `@testing-library/user-event@14.6.7`, `jsdom@28.1.0`, `@types/jsdom@28.0.3`, `@playwright/test@1.62.1`, and `@axe-core/playwright@4.13.0`.
- Update only the Admin workspace manifest and root Yarn Classic lockfile through accepted Yarn commands; verify exact resolution and peer compatibility without unrelated upgrades.
- Wrap App Router output with `AntdRegistry` and a narrow Client `ConfigProvider` using Persian locale and RTL direction while preserving server-owned document markup, the Auth Provider, metadata, and existing login/protected states.
- Add the minimum typed React Hook Form plus Ant Design controlled-input example/pattern required to verify labels, errors, submission state, and authoritative reset behavior without building catalog feature forms.
- Add JSDOM setup/cleanup for the existing Node test runner and meaningful interaction tests proving keyboard input, focus, announced errors, and pending/normalized-reset behavior.
- Configure one Chromium Playwright project and Admin scripts. Add a bounded production-build authentication-shell smoke test with API responses intercepted at the browser boundary; do not implement the real catalog journey yet.
- Add CI browser installation and focused Admin e2e execution at the correct post-build point, using only Chromium and no persisted credentials or artifacts on success.
- Keep generated browser binaries, reports, traces, screenshots, test output, and build artifacts ignored.

## Out of Scope

- Category, Product, Variant, Inventory, setting, Image, or lifecycle feature UI; typed catalog API clients; real catalog browser fixtures/journey; or any Backend/API/OpenAPI behavior.
- Database/schema/migration/reference-data changes, new environment secrets, Roles/grants, audit behavior, Storefront work, or production storage.
- Jest, Vitest, Cypress, Storybook, MSW, Zod, TanStack Query, Zustand, drag-and-drop/icon/date packages, Firefox/WebKit matrices, visual regression infrastructure, or a generic component library.
- Redesigning the existing login/authentication experience beyond the provider integration necessary to preserve it.

## Expected Changes

- `apps/admin/package.json` and root `yarn.lock` for only the explicitly approved exact packages.
- Admin App Router provider/layout wiring plus a minimal reusable form-integration seam.
- Admin JSDOM setup, interaction tests, Playwright configuration/smoke test, scripts, and ignores.
- Root CI workflow and narrow CI documentation updates for Chromium installation/e2e execution.
- Focused frontend architecture/implementation-reality documentation reflecting the installed foundation, not unimplemented catalog screens.
- Sprint execution records; on success S3-T03 becomes Current and awaits implementation approval.

## Constraints

- Use Yarn Classic 1.22.22 Workspaces and exact versions. Do not accept transitive manifest drift or upgrade existing packages.
- Preserve Next.js 16.3.2, React/React DOM 19.2.8, Axios 1.19.0, current authentication semantics, and the repository Node 20.19-compatible floor.
- Keep `AntdRegistry` at the server layout boundary and the interactive `ConfigProvider` boundary as narrow as the library requires. Props crossing Server/Client boundaries must be serializable.
- Do not persist credentials, CSRF, form values, or test secrets. Browser request interception must use synthetic responses and must not weaken the real HTTP client policy.
- Accessibility tests supplement semantic implementation; axe results never replace keyboard, focus, label, announcement, and user-flow assertions.
- Dependency installation is authorized only if the owner approves this Current task with the exact list above.

## Acceptance Criteria

- The Admin manifest contains exactly the four runtime and seven development packages at the approved exact versions; the lockfile resolves them without changing existing direct dependency versions.
- `AntdRegistry` prevents first-render style loss and a Persian RTL `ConfigProvider` composes with the existing server document shell and Auth Provider without turning the whole layout into an unnecessary Client Component.
- Existing login, bootstrap, refresh, protected-entry, and logout behavior and tests remain passing with correct Persian RTL output.
- A minimal React Hook Form/Ant Design seam demonstrates controlled value wiring, visible labels, linked errors, disabled/busy duplicate-submit prevention, first-invalid focus, and reset from an authoritative normalized result.
- The existing Node test runner can execute Testing Library/user-event tests in isolated JSDOM state with deterministic cleanup and no leaked globals/timers.
- The Chromium Playwright configuration starts or reuses the Admin production server safely, and a focused intercepted-API smoke test verifies protected/login routing plus Persian RTL/semantic behavior without real credentials or database state.
- A focused axe scan has no serious/critical violations in the smoke surface, while explicit keyboard/focus assertions also pass.
- CI installs only Chromium, runs the e2e smoke after the production build, retains useful failure artifacts only, and stays within a justified timeout.
- Generated browser/test/build artifacts are ignored; no catalog feature, Backend, API, schema, migration, reference-data, Storefront, or unapproved package is introduced.
- Relevant Admin tests, typecheck, lint, production build, e2e smoke, root formatting/build gates affected by CI/config changes, lockfile integrity, local links, `git diff --check`, scope, generated-artifact, and clean-index checks pass.

## Testing Impact

Automated tests required.

- Update existing Admin tests only where the provider boundary changes rendered output, preserving behavior assertions.
- Add frontend component/integration tests for the provider and minimal form seam using Testing Library/user-event/JSDOM.
- Add one critical-user-flow harness smoke test in Chromium with browser-intercepted synthetic auth responses; the real catalog/API/PostgreSQL journey remains S3-T10.
- Run the complete Admin suite because shared layout/providers and test infrastructure affect all Admin behavior.

## Swagger / OpenAPI Impact

None. No Backend route, DTO, status, security declaration, or generated OpenAPI behavior changes.

## Validation

- Preflight Node/Yarn versions, package-registry access, exact package metadata, and Chromium installation/runtime before implementation.
- Install only the exact approved packages with Yarn Workspace commands and inspect manifest/lockfile/direct-version drift.
- Run focused new interaction/provider tests, then the complete Admin test suite.
- Run Admin typecheck, lint, production build, and Playwright Chromium smoke; run repository formatting and the root gates affected by CI/shared lockfile changes.
- Validate CI YAML, ignored/generated artifacts, local Markdown links, `git diff --check`, prohibited Backend/schema/migration/Storefront/catalog-feature scope, dependency inventory, and read-only Git index.

## Documentation Impact

Update frontend architecture and CI/development reality for the installed Ant Design/Form/testing foundation and link the canonical Admin catalog behavior specification. Do not claim catalog screens or the real cross-application journey are implemented.

## Approval State

Awaiting Implementation Approval for exactly the four runtime and seven development dependency pins listed in Scope.

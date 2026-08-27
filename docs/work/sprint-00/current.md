# Current Task

## Task ID

S0-T06

## Title

Bootstrap Admin Application

## Status

Current

## Goal

Create the independent strict-TypeScript Next.js Admin workspace foundation without implementing authentication, authorization, business features, or a speculative shared design system.

## Why This Task Exists

Storefront now occupies its accepted workspace, while the separate staff application remains only a reserved target. Sprint 1 authentication work needs a buildable Admin boundary with explicit Persian RTL and application ownership before feature implementation begins.

## Required Context

- `docs/sprints/sprint-00.md`
- `apps/README.md`
- `docs/00-project-overview.md`
- `docs/architecture/system-architecture.md`
- `docs/architecture/frontend-architecture.md`
- `docs/architecture/adr/0004-use-nextjs-for-web-apps.md`
- `docs/architecture/adr/0009-separate-admin-and-storefront-apps.md`
- `docs/standards/general.md`
- `docs/standards/frontend.md`
- `docs/standards/testing.md`
- `docs/standards/git.md`
- `node_modules/next/dist/docs/01-app/01-getting-started/01-installation.md`
- `node_modules/next/dist/docs/01-app/01-getting-started/02-project-structure.md`
- `package.json`
- `turbo.json`

## Scope

- Create the private `@automotive-commerce/admin` Yarn Workspace using the repository's exact Next.js 16.3.2 and React 19.2.8 baseline.
- Add a minimal App Router root layout and landing page that identify the Admin foundation without implementing login or operational UI.
- Establish strict TypeScript, Next.js configuration, ESLint, and minimal application-local styling/configuration.
- Apply the accepted `fa-IR` and RTL document baseline with semantic, accessible placeholder content.
- Reuse existing installed dependency versions and Turbo orchestration without adding speculative packages or shared configuration.
- Update concise application-boundary and Sprint 0 execution records.

## Out of Scope

- Authentication, authorization, protected routes, Admin navigation, forms, tables, catalog/order UI, or API calls.
- Adding Ant Design or another UI dependency before a concrete approved need; the architecture choice remains planned for feature work.
- Modifying Storefront behavior or creating Backend/shared packages.
- Adding, removing, or upgrading dependency versions.
- Staging, committing, pushing, branching, or other Git writes.

## Expected Changes

- Minimal `apps/admin` Next.js App Router workspace and package manifest.
- Only necessary root/Turbo/lock metadata changes if workspace discovery requires them.
- `apps/README.md` and Sprint 0 execution records.

## Testing Impact

No new automated test required — validation only.

This task creates framework bootstrap behavior without domain or interactive logic. Validate semantic rendered output through build artifacts or a focused smoke check, plus strict compilation, lint, build, Workspace discovery/integrity, dependency scope, and read-only Git state; do not create placeholder tests.

## Constraints

- Read the listed installed Next.js 16.3.2 guides and current Context7 documentation before implementation.
- Keep Server Components as the default and add no unnecessary client boundary.
- Use Persian RTL document metadata/structure without designing the future Admin experience.
- Keep configuration application-local until proven reuse justifies a package.
- Do not add Ant Design, authentication libraries, test tooling, or unrelated dependencies.
- Never stage or commit without separate approval.

## Acceptance Criteria

- `apps/admin` is a valid private Yarn Workspace using the approved exact Next.js/React baseline and strict TypeScript.
- Its App Router foundation builds and serves a semantic Persian RTL placeholder without authentication or business functionality.
- Admin lint/build work through filtered and repository-wide Turbo commands without breaking Storefront.
- Yarn integrity passes with no dependency upgrades/removals or unrelated lockfile churn.
- No Client Component, API call, auth behavior, shared package, or speculative UI dependency is introduced.

## Validation

- Verify Workspace discovery, manifest versions, and Yarn integrity.
- Run filtered Admin lint/build and repository-wide lint/build.
- Inspect the generated route and HTML/document baseline for expected Persian RTL semantics.
- Confirm Storefront remains included and buildable in the repository-wide graph.
- Review dependency/lockfile and read-only Git diff/index state for exact scope.

## Documentation Impact

Update `apps/README.md` to distinguish implemented Storefront/Admin workspaces from the reserved API target, plus Sprint 0 execution records. Broader onboarding remains S0-T13.

## Approval State

Awaiting Implementation Approval

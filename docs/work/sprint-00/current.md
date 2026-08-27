# Current Task

## Task ID

S0-T05

## Title

Place and Bootstrap Storefront

## Status

Current

## Goal

Move the preserved root Next.js starter into `apps/storefront` as a real Yarn Workspace without changing its observable behavior or dependency versions.

## Why This Task Exists

The accepted target assigns the customer-facing Next.js application to `apps/storefront`, but the starter remains temporarily at the repository root. Yarn Workspace boundaries and Turborepo orchestration now exist, so the application can be moved deliberately while retaining its files, configuration, dependency baseline, and build behavior.

## Required Context

- `docs/sprints/sprint-00.md`
- `docs/work/sprint-00/s0-t01-inventory.md`
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
- `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/public-folder.md`
- `package.json`
- `turbo.json`

## Scope

- Create the private `apps/storefront` Yarn Workspace manifest with an unambiguous package name.
- Move only Storefront-owned source, public assets, and application configuration from the root into `apps/storefront` using a reviewable preservation sequence.
- Move existing Storefront dependency declarations to the child manifest without version upgrades, removals, or forced adoption.
- Update root scripts and Turbo orchestration so repository-wide and filtered Storefront lint/build commands work from the root.
- Preserve the current starter UI, metadata, strict TypeScript behavior, Tailwind/PostCSS setup, public assets, and useful installed dependency baseline.
- Update concise boundary/execution documentation to match repository reality.

## Out of Scope

- Redesigning, localizing, or otherwise modifying Storefront behavior or visuals.
- Bootstrapping Admin, API, shared packages, tests, environment strategy, or business features.
- Adding, removing, or upgrading dependency versions.
- Introducing speculative shared configuration or source packages.
- Staging, committing, pushing, branching, or other Git writes.

## Expected Changes

- `apps/storefront` application files and private package manifest.
- Root manifest/script ownership updates and only necessary Yarn lock metadata changes.
- Turbo configuration adjustments only if relocation requires them.
- Removal of superseded root application files after successful copy/compare validation.
- Sprint 0 execution records and concise application-boundary status update.

## Testing Impact

No new automated test required — validation only.

This task relocates unchanged starter behavior and configuration. Validate file preservation, Yarn Workspace discovery/integrity, filtered and repository lint/build behavior, output placement, dependency/lockfile scope, and read-only Git state; do not create placeholder tests.

## Constraints

- Read the listed installed Next.js 16.3.2 guides before implementation.
- Preserve source/assets/configuration byte-for-byte where path changes do not require an edit.
- Do not remove a root application file until its destination and behavior have been verified.
- Keep root documentation, agent guidance, workspace orchestration, and repository-level ignore rules at the root.
- Keep all dependencies available; relocation is not authorization to prune or upgrade them.
- Never stage or commit without separate approval.

## Acceptance Criteria

- `apps/storefront` is a valid private Yarn Workspace containing the preserved Next.js starter and its application-owned configuration.
- The root no longer pretends to be the Storefront package and remains the private monorepo orchestration root.
- Existing dependency names and version ranges are preserved under correct ownership without unrelated lockfile churn.
- Yarn discovers the Storefront workspace and integrity passes.
- Direct filtered Storefront and repository-wide Turbo lint/build commands pass with unchanged starter output.
- No Admin/API/shared-package scaffold, product behavior, dependency upgrade/removal, or unrelated change is introduced.

## Validation

- Compare source, public asset, and configuration hashes before and after relocation.
- Inspect Workspace discovery and package ownership; run Yarn integrity.
- Run filtered Storefront lint/build and repository-wide lint/build through Turbo.
- Inspect generated output paths and confirm no superseded root application artifacts are tracked.
- Review manifest/lockfile and read-only Git diff/index state for exact scope.

## Documentation Impact

Update `apps/README.md` to distinguish the implemented Storefront workspace from still-reserved Admin/API targets, plus Sprint 0 execution records. Broader onboarding remains S0-T13.

## Approval State

Awaiting Implementation Approval

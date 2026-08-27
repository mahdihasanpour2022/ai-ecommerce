# Current Task

## Task ID

S0-T02

## Title

Migrate Yarn to pnpm

## Status

Current

## Goal

Migrate the existing root Next.js starter from Yarn 1 to an exactly pinned pnpm toolchain with a coherent reviewed lockfile transition, while preserving its dependency set, behavior, and current filesystem placement.

## Why This Task Exists

pnpm is the accepted package manager for the target monorepo. Converting the intact standalone starter before workspace and application relocation isolates package-resolution risk from structural changes.

## Required Context

- `docs/sprints/sprint-00.md`
- `docs/work/sprint-00/s0-t01-inventory.md`
- `docs/architecture/adr/0002-use-pnpm.md`
- `docs/standards/general.md`
- `docs/standards/git.md`
- `package.json`
- `yarn.lock`

## Scope

- Confirm and record exact supported Node and pnpm version pins using current authoritative documentation.
- Preserve all declared dependency names and ranges unless the owner separately approves a change.
- Replace Yarn package-manager metadata and lock state with the approved pnpm equivalents.
- Compare direct resolutions and investigate material transitive drift rather than silently accepting it.
- Validate install integrity and the existing root application's available quality/build scripts with pnpm.
- Update only execution/onboarding documentation directly made inaccurate by the migration.

## Out of Scope

- Moving the starter or creating `apps/`, `packages/`, `pnpm-workspace.yaml`, or Turborepo configuration.
- Adding, removing, or upgrading application dependencies.
- Bootstrapping Storefront, Admin, API, PostgreSQL, or Prisma.
- Changing application behavior or source/configuration unrelated to the package-manager transition.
- Staging, committing, pushing, branching, or other Git writes.

## Expected Changes

- `package.json` package-manager/runtime pin metadata approved for this migration.
- New reviewed `pnpm-lock.yaml` and removal of `yarn.lock` only after successful comparison and validation.
- A minimal runtime-version pin file only if selected as part of the approved version strategy.
- Sprint 0 execution records and directly affected contributor commands.

## Constraints

- Dependency and lockfile changes require explicit approval of this task and its version choices.
- Use current pnpm and Next.js documentation before changing configuration.
- Do not mix dependency modernization, workspace creation, or application relocation into the migration.
- Preserve a reviewable Yarn baseline until the pnpm result has passed validation.
- Never stage or commit without separate approval.

## Acceptance Criteria

- Exact Node and pnpm versions are approved and reproducibly pinned.
- The repository declares pnpm consistently and contains one coherent pnpm lockfile with no active Yarn lockfile after successful validation.
- Declared dependency names and ranges are unchanged, and direct resolved versions match the baseline or every difference is explicitly reviewed and approved.
- A frozen pnpm install succeeds and the existing root starter's applicable lint/build checks pass.
- Contributor commands made inaccurate by the transition are updated without introducing workspace or application-layout changes.
- No application feature, dependency addition/removal/upgrade, Git index, or Git history change occurs.

## Validation

- Compare pre/post manifest dependency sets and direct locked resolutions.
- Run a pnpm frozen-lockfile install using the approved pin.
- Run the current starter's pnpm lint and build commands.
- Confirm Yarn metadata/lock artifacts are removed only after successful pnpm validation.
- Inspect final repository and read-only Git status for scope compliance and unrelated changes.

## Documentation Impact

Update execution records and only the package-manager commands or version notes directly made inaccurate. Broader onboarding and monorepo documentation remain assigned to later Sprint 0 tasks.

## Open Decisions Required Before Implementation

- Exact supported Node version pin.
- Exact pnpm version pin.
- Approval of the `package.json` metadata change, pnpm lock creation, Yarn lock removal after validation, and dependency installation needed for verification.

## Approval State

Awaiting Implementation Approval

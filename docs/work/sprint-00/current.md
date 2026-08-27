# Current Task

## Task ID

S0-T01

## Title

Inventory Existing Starter and Propose Placement

## Status

Current

## Goal

Produce an evidence-based inventory and a reversible recommendation for placing the existing Next.js starter in the approved monorepo before any files, dependencies, or lockfiles are migrated.

## Why This Task Exists

The starter and useful installed packages must be preserved deliberately; later workspace and package-manager work depends on understanding the current repository and owner changes first.

## Required Context

- `docs/sprints/sprint-00.md`
- `docs/00-project-overview.md`
- `docs/architecture/system-architecture.md`
- `docs/architecture/adr/0001-use-monorepo.md`
- `docs/architecture/adr/0002-use-pnpm.md`
- `docs/standards/general.md`
- `docs/standards/git.md`

## Scope

- Inspect the complete current repository structure, application starter, configuration, package manifest, lockfile state, and relevant user changes.
- Record current versions and installed dependencies without treating their presence as mandatory architecture.
- Identify viable target placement for the existing starter and recommend one reversible migration sequence.
- Identify conflicts, preservation risks, and decisions required before S0-T02.

## Out of Scope

- Moving or renaming application files.
- Changing the package manager, dependencies, lockfile, workspace, or Turborepo configuration.
- Bootstrapping Storefront, Admin, API, PostgreSQL, or Prisma.
- Implementing application behavior.

## Expected Changes

- Sprint 0 execution-context records.
- A concise inventory/placement recommendation in the appropriate execution record or existing foundation documentation if an approved decision requires lasting alignment.
- No application, dependency, or lockfile changes.

## Constraints

- Preserve all user work and useful installed dependencies.
- Use read-only repository and Git inspection.
- Do not infer authorization for migration or implementation from approval of this inventory task.
- Document uncertainty and request the owner decision needed for the next task.

## Acceptance Criteria

- Current repository structure, starter role, package manager, versions, dependencies, and relevant uncommitted state are accurately inventoried.
- A recommended Storefront/monorepo placement and reversible Yarn-to-pnpm migration sequence are presented with risks and alternatives kept concise.
- Required owner decisions or conflicts before migration are explicit.
- No application, dependency, lockfile, Git index, or Git history change occurs.

## Validation

- Read-only repository file inventory completed.
- Package manifest and lockfile relationship inspected.
- Read-only Git worktree/index status inspected.
- Recommendation cross-checked against the Required Context and Sprint 0 scope.

## Documentation Impact

Update execution records. Update permanent architecture documentation only if the owner approves a lasting placement decision that is not already represented.

## Approval State

Awaiting Implementation Approval

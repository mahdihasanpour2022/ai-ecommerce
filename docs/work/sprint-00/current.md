# Current Task

## Task ID

S0-T04

## Title

Configure Minimal Turborepo Orchestration

## Status

Current

## Goal

Add the smallest accurate Turborepo task graph needed to orchestrate repository quality and build commands across Yarn Workspaces without remote caching or speculative workspace behavior.

## Why This Task Exists

The repository has accepted Yarn Workspace discovery and durable application/package boundaries, but it has no dependency-aware repository task orchestration. Later application bootstraps need consistent commands whose dependencies, cache inputs, and outputs reflect real workspace scripts.

## Required Context

- `docs/sprints/sprint-00.md`
- `docs/00-project-overview.md`
- `docs/architecture/system-architecture.md`
- `docs/architecture/adr/0003-use-turborepo.md`
- `docs/architecture/adr/0013-use-yarn-workspaces.md`
- `docs/standards/general.md`
- `docs/standards/testing.md`
- `docs/standards/git.md`
- `package.json`

## Scope

- Select and explicitly approve a Turborepo version compatible with the accepted Node/Yarn baseline.
- Add Turborepo as a root development dependency through the accepted Yarn toolchain.
- Add a minimal `turbo.json` task graph for only real or immediately required `build`, `typecheck`, `lint`, and `test` workspace scripts.
- Add minimal root orchestration scripts while preserving the transitional root Next.js application commands needed before S0-T05.
- Declare cache dependencies and outputs accurately; keep remote caching disabled.

## Out of Scope

- Bootstrapping, moving, or modifying Storefront, Admin, API, or shared packages.
- Inventing workspace scripts, fake tests, shared configuration packages, or application behavior.
- Remote caching, CI configuration, deployment configuration, or environment strategy.
- Changing Yarn major, replacing the package manager, or upgrading unrelated dependencies.
- Staging, committing, pushing, branching, or other Git writes.

## Expected Changes

- Root Turborepo development dependency and reviewed `yarn.lock` update.
- Minimal `turbo.json` and root orchestration scripts.
- Sprint 0 execution records.

## Testing Impact

No new automated test required — validation only.

This task changes orchestration configuration without runtime behavior. Validate configuration parsing, task discovery/graph behavior, applicable existing commands, lockfile scope, and read-only Git state; do not create placeholder tests.

## Constraints

- Dependency and lockfile changes require explicit implementation approval for this task.
- Keep task names, dependencies, inputs, outputs, and caching behavior truthful to repository reality.
- Preserve direct root starter commands until its separately approved placement.
- Do not configure or imply remote caching.
- Never stage or commit without separate approval.

## Acceptance Criteria

- The approved Turborepo version is installed as a root development dependency using Yarn Classic.
- A minimal valid task graph orchestrates only supported build and quality commands with accurate dependencies and outputs.
- Root commands remain usable during the transitional starter layout.
- No fake test command, speculative package, application scaffold, remote cache, or unrelated dependency change is introduced.
- Relevant orchestration validation passes and the lockfile diff contains only the approved Turborepo dependency impact.

## Validation

- Verify Yarn integrity and the resolved Turborepo version.
- Parse/inspect the Turborepo configuration and run dry-run or graph discovery for configured tasks.
- Run applicable existing root quality/build commands needed to prove transitional compatibility.
- Inspect dependency and lockfile changes and read-only Git status for exact scope.

## Documentation Impact

Update only configuration-adjacent documentation if command usage requires it, plus Sprint 0 execution records. Broader onboarding alignment remains S0-T13.

## Approval State

Awaiting Implementation Approval

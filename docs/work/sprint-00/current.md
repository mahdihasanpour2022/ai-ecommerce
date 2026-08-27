# Current Task

## Task ID

S0-T03

## Title

Establish Monorepo Application and Package Layout

## Status

Current

## Goal

Establish durable `apps/` and `packages/` repository boundaries for the accepted monorepo while keeping the existing root starter intact until its separately approved Storefront placement task.

## Why This Task Exists

Yarn Workspace discovery is configured, but the target application/package ownership boundaries do not yet exist in the filesystem. Later Storefront, Admin, API, and Turborepo tasks need a clear transition that does not create speculative packages or move the starter early.

## Required Context

- `docs/sprints/sprint-00.md`
- `docs/work/sprint-00/s0-t01-inventory.md`
- `docs/00-project-overview.md`
- `docs/architecture/system-architecture.md`
- `docs/architecture/adr/0001-use-monorepo.md`
- `docs/architecture/adr/0013-use-yarn-workspaces.md`
- `docs/standards/general.md`
- `docs/standards/git.md`
- `package.json`

## Scope

- Reconfirm the accepted `apps/storefront`, `apps/admin`, `apps/api`, and justified `packages/*` ownership model against repository reality.
- Establish durable top-level `apps/` and `packages/` boundaries using concise boundary documentation rather than empty placeholder packages.
- Document that the root Next.js starter remains the transitional runnable application until S0-T05 approves and performs its Storefront placement.
- State that `packages/` receives a child package only after demonstrated cross-application reuse.
- Preserve the configured Yarn Workspace globs and prepare the layout for later Turborepo orchestration.

## Out of Scope

- Moving, copying, renaming, or modifying the root starter.
- Bootstrapping Storefront, Admin, API, or any shared package.
- Adding package manifests beneath `apps/` or `packages/`.
- Adding or configuring Turborepo.
- Changing dependencies, `yarn.lock`, application code, or application configuration.
- Staging, committing, pushing, branching, or other Git writes.

## Expected Changes

- Concise boundary documentation under `apps/` and `packages/` that keeps those directories durable without pretending applications/packages exist.
- Sprint 0 execution records.
- No package manifest, lockfile, application, dependency, or generated-installation change.

## Constraints

- Preserve the existing root starter and all user work.
- Do not create empty package manifests, `.gitkeep` placeholders, or speculative shared abstractions.
- Treat planned application names as reserved targets, not implemented applications.
- Keep documentation concise and refer to canonical architecture rather than duplicating it.
- Never stage or commit without separate approval.

## Acceptance Criteria

- Durable `apps/` and `packages/` boundaries exist and describe their ownership succinctly.
- The planned Storefront, Admin, and API targets are discoverable without claiming they are implemented.
- The root starter remains unchanged and explicitly transitional until S0-T05.
- `packages/` prohibits speculative children and requires demonstrated reuse.
- Yarn Workspace configuration, dependencies, `yarn.lock`, Git index, and Git history remain unchanged.

## Validation

- Inspect the created boundaries and verify links/references resolve.
- Confirm no child `package.json`, application scaffold, or placeholder shared package was created.
- Compare `package.json`, dependency declarations, and `yarn.lock` against the S0-T02 completion state.
- Run read-only Git status and inspect the final diff for scope compliance and unrelated changes.

## Documentation Impact

Create only the two layout-boundary documents and update Sprint 0 execution records. Canonical architecture already owns the target structure and should not be duplicated.

## Approval State

Awaiting Implementation Approval

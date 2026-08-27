# Current Task

## Task ID

S0-T08

## Title

Align TypeScript, Lint, and Formatting

## Status

Current

## Goal

Establish consistent, explicit TypeScript, ESLint, and formatting conventions across the implemented Storefront, Admin, and API Workspaces without premature shared-package abstraction.

## Why This Task Exists

All three application boundaries now compile independently, but their configuration was created task by task. The repository needs a reviewed quality baseline that preserves framework-specific needs while making routine validation predictable.

## Required Context

- `docs/sprints/sprint-00.md`
- `docs/standards/general.md`
- `docs/standards/frontend.md`
- `docs/standards/backend.md`
- `docs/standards/testing.md`
- `docs/standards/git.md`
- `package.json`
- `turbo.json`
- `apps/storefront/package.json`
- `apps/storefront/tsconfig.json`
- `apps/storefront/eslint.config.mjs`
- `apps/admin/package.json`
- `apps/admin/tsconfig.json`
- `apps/admin/eslint.config.mjs`
- `apps/api/package.json`
- `apps/api/tsconfig.json`
- `apps/api/eslint.config.mjs`

## Scope

- Inventory the established TypeScript and ESLint differences and distinguish intentional framework needs from accidental drift.
- Align strict compiler expectations and quality scripts where the applications can share a convention safely.
- Establish a concise repository formatting policy and a runnable check/fix workflow appropriate to the current codebase.
- Reuse configuration only when actual cross-Workspace duplication justifies it; otherwise keep application-local configuration consistent.
- Keep Turborepo orchestration and canonical quality/Definition of Done documentation aligned with the implemented commands.

## Out of Scope

- Application features, UI changes, API contracts, business modules, database work, authentication, CI implementation, or broad onboarding work.
- Framework or dependency upgrades unrelated to the approved quality baseline.
- Creating a shared configuration package solely for future possibility.
- Staging, committing, pushing, branching, or other Git writes.

## Expected Changes

- Focused TypeScript, ESLint, formatting, manifest/orchestration configuration where justified.
- Concise standards and Sprint 0 execution-documentation updates.
- Dependency and lockfile changes only if separately reviewed and explicitly included in the implementation approval.

## Testing Impact

No new automated test required — validation only

Run applicable typecheck, lint, formatting, build, Workspace integrity, and repository-wide regression commands. Do not create placeholder runtime tests for configuration-only behavior.

## Swagger / OpenAPI Impact

No documentation impact. This task does not change Backend HTTP behavior or contracts.

## Constraints

- Preserve framework-required Next.js and NestJS configuration behavior.
- Do not weaken strictness or suppress real diagnostics merely to align files.
- Prefer the smallest coherent configuration and dependency surface.
- Use Context7/current official documentation before changing library- or CLI-specific configuration.
- Never stage or commit without separate approval.

## Acceptance Criteria

- Each TypeScript Workspace retains an appropriate strict configuration and an independently passing `typecheck` command.
- ESLint commands and configurations are explicit, compatible with their frameworks, and pass without hiding errors.
- Formatting conventions and commands are documented and consistently applicable to the current repository scope.
- Root/Turbo quality commands cover all applicable Workspaces predictably.
- Relevant typecheck, lint, formatting, build, integrity, and regression gates pass.
- No unrelated runtime behavior, speculative shared package, or unapproved dependency change is introduced.

## Validation

- Compare effective TypeScript and ESLint behavior across all three Workspaces.
- Run focused and root typecheck, lint, formatting, and build commands.
- Verify Workspace discovery, Yarn integrity, generated-output handling, and exact dependency/lockfile scope.
- Review the read-only Git diff/index state and confirm documentation matches implementation.

## Documentation Impact

Update canonical quality standards and Sprint 0 execution records only as needed to reflect implemented commands and policy.

## Approval State

Awaiting Implementation Approval

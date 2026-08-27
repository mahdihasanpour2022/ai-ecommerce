# Current Task

## Task ID

S0-T08

## Title

Align TypeScript, Lint, and Formatting

## Status

Current

## Goal

Establish consistent, explicit TypeScript, ESLint, and Prettier conventions across the implemented Storefront, Admin, and API Workspaces without premature shared-package abstraction or unrelated formatting churn.

## Owner Decision

- Prettier is the repository's official code-formatting tool.
- S0-T08 establishes an appropriate Prettier configuration, ignore rules, and standard monorepo format/check commands.
- Prefer one root formatting configuration; duplicate configuration inside a Workspace only when a concrete application-specific need requires it.
- Formatting is part of the Definition of Done for tasks that modify files within the configured source/configuration scope.
- Before such a task moves to Done, its relevant changed files conform to Prettier and the applicable formatting check passes.
- Formatting writes remain scoped to the approved task. Do not blindly rewrite unrelated repository files; a repository-wide check-only command may still be used for validation.
- CI must be able to run formatting in check-only mode without modifying files.
- If installation is required, select the latest stable compatible Prettier release under the canonical dependency-version policy. Prerelease versions require separate explicit owner approval.

## Reconciliation Note

This context update does not authorize implementation or dependency changes. An earlier approved run already left uncommitted S0-T08 implementation changes in the shared working tree, including Prettier manifest/lockfile changes and formatting configuration. Those existing changes are preserved and must be reconciled against this owner decision before S0-T08 can be reviewed and marked Done; this documentation-only update neither installs dependencies nor adds to those implementation changes.

## Why This Task Exists

All three application boundaries compile independently, but their configuration was created task by task. The repository needs a reviewed quality baseline that preserves framework-specific needs while making typecheck, lint, and formatting validation predictable for local development and future CI.

## Required Context

- `docs/sprints/sprint-00.md`
- `docs/standards/general.md`
- `docs/standards/frontend.md`
- `docs/standards/backend.md`
- `docs/standards/testing.md`
- `docs/standards/git.md`
- `package.json`
- `turbo.json`
- each Workspace manifest, `tsconfig.json`, and ESLint configuration
- existing Prettier declarations/configuration and ignore files, if any

## Scope

- Inventory established TypeScript and ESLint differences and distinguish intentional framework requirements from accidental drift.
- Align strict compiler expectations and explicit quality scripts where applications can share a convention safely.
- Establish Prettier as the official formatter with one appropriate root configuration and root ignore rules unless a concrete Workspace-specific exception is required.
- Provide standard write and check-only commands that cover the intended monorepo source/configuration scope; the check-only command must be suitable for later CI use.
- Define task-scoped formatting practice and make applicable formatting validation an explicit Definition of Done gate.
- Keep Turborepo orchestration and canonical quality standards aligned with the implemented commands.

## Out of Scope

- Application features, UI behavior changes, API contracts, business modules, database work, authentication, CI implementation, or broad onboarding work.
- Blind repository-wide formatting writes or cleanup of unrelated pre-existing style.
- Formatting generated artifacts, dependency trees, lockfiles, or other files intentionally excluded by the approved ignore/scope policy.
- Framework or dependency upgrades unrelated to the approved quality baseline.
- Creating a shared configuration package solely for future possibility.
- Staging, committing, pushing, branching, or other Git writes.

## Expected Changes After Implementation Approval

- Focused TypeScript and ESLint configuration/script alignment where justified.
- A single root Prettier configuration, ignore rules, and standard root format/check-only commands unless inspection proves a narrower exception is necessary.
- Only task-scoped formatting changes required to make affected source/configuration files conform.
- Canonical standards and Sprint 0 execution-documentation updates.
- Prettier dependency/lockfile changes only after stable-version and compatibility review and explicit implementation approval.

## Testing Impact

No new automated test required — validation only

Run applicable typecheck, lint, Prettier check-only, build, Workspace integrity, and repository-wide regression commands. Do not create placeholder runtime tests for configuration-only behavior.

## Swagger / OpenAPI Impact

No documentation impact. This task does not change Backend HTTP behavior or contracts.

## Constraints

- Preserve framework-required Next.js and NestJS compiler/lint behavior.
- Do not weaken strictness, disable meaningful rules, or suppress real diagnostics merely to obtain a pass.
- Prefer the smallest coherent configuration and dependency surface.
- Use the latest stable compatible Prettier version if installation is approved and required; do not select a prerelease without explicit owner approval.
- Keep write-mode formatting scoped to files affected by the task; use check-only validation for broader confidence.
- Do not install or modify dependencies during this context-only decision update.
- Never stage or commit without separate approval.

## Acceptance Criteria

- Each TypeScript Workspace retains an appropriate strict configuration and an independently passing `typecheck` command.
- ESLint commands/configurations are explicit, framework-compatible, and pass without hiding errors.
- Prettier is documented and configured as the official formatter through an appropriate single root configuration and ignore policy, unless a justified exception is recorded.
- Standard write and check-only commands exist; check-only mode makes no file modifications and is suitable for future CI.
- Relevant task-changed source/configuration files conform to Prettier, and the applicable formatting check passes before Done.
- Formatting writes do not create unrelated repository churn.
- Root/Turbo quality commands cover all applicable Workspaces predictably.
- Relevant typecheck, lint, formatting, build, integrity, and regression gates pass.
- No unrelated runtime behavior, speculative shared package, prerelease dependency, or unapproved dependency/version change is introduced.

## Validation

- Compare effective TypeScript and ESLint behavior across all three Workspaces.
- Verify the Prettier version is stable and compatible before any approved installation or manifest change.
- Inspect root Prettier configuration, ignores, file scope, and write/check-only command behavior.
- Prove check-only mode returns success for conforming files, failure for nonconforming files when safely testable, and does not modify files.
- Run focused and root typecheck, lint, formatting, and build commands after implementation.
- Verify Workspace discovery, Yarn integrity, generated-output handling, and exact dependency/lockfile scope.
- Review the read-only Git diff/index state and confirm documentation matches implementation.

## Documentation Impact

Update canonical general/testing standards so applicable Prettier conformance and a passing formatting check are permanent Definition of Done requirements. Keep detailed policy in canonical standards rather than duplicating it in `AGENTS.md`.

## Approval State

Awaiting Implementation Approval

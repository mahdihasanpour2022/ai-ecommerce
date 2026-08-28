# Current Task

## Task ID

S0-T12

## Title

Add Minimal CI Quality Checks

## Status

Current

## Goal

Add a minimal, deterministic CI quality workflow that installs with the frozen Yarn lockfile and runs the repository's applicable formatting, typecheck, lint, build, existing test, and Prisma foundation checks without deployment behavior or speculative infrastructure.

## Why This Task Exists

The repository now has real cross-Workspace quality commands, API tests, formatting, environment rules, and Prisma generation, but no automated pull-request/push gate proves a clean checkout can reproduce them. Sprint 0 needs one concise CI path before onboarding is finalized.

## Required Context

- `docs/sprints/sprint-00.md`
- `docs/00-project-overview.md`
- `docs/environment.md`
- `docs/development/prisma.md`
- `docs/architecture/system-architecture.md`
- `docs/architecture/adr/0003-use-turborepo.md`
- `docs/architecture/adr/0013-use-yarn-workspaces.md`
- `docs/security/baseline.md`
- `docs/standards/general.md`
- `docs/standards/testing.md`
- `docs/standards/git.md`
- root `package.json`, `yarn.lock`, `turbo.json`, and `.gitignore`
- all Workspace manifests and current root/Workspace quality scripts
- current repository-hosting/remotes and existing CI configuration

## Scope

- Inspect the repository host and choose the minimal supported CI workflow location without reopening deployment/provider architecture.
- Pin an approved current action/runtime foundation compatible with Yarn Classic, Node, Next.js, NestJS, and Prisma requirements.
- Install dependencies from `yarn.lock` without mutation and without package-manager migration.
- Run check-only formatting, repository typecheck/lint/build, the real existing API test suite, and model-free Prisma validation/generation with a safe non-secret configuration value.
- Keep Turborepo remote caching disabled and avoid requiring Docker/PostgreSQL where no current CI check needs connectivity.
- Add only narrowly useful cache or concurrency settings if justified and safe.
- Document CI reality and failure ownership; update Sprint 0 execution records after validation.

## Out of Scope

- Deployment, release publishing, environments, production migrations, container/service startup, secret-provider selection, or infrastructure provisioning.
- Remote Turborepo caching, coverage thresholds, browser e2e infrastructure, matrix testing, preview deployments, or broad security scanning.
- New application behavior, tests invented solely for CI, dependency upgrades unrelated to the workflow, or package-manager changes.
- Staging, committing, pushing, branching, or other Git writes.

## Expected Changes

- One minimal CI workflow for the verified repository host.
- Narrow root/Workspace command adjustments only if the workflow exposes a real orchestration gap.
- Canonical CI/onboarding reality and Sprint 0 execution records.
- Any external action version must be stable, current, official, and reviewed under the dependency-version policy.

## Testing Impact

No new automated test required — validation only

The workflow must execute the existing real API test suite and applicable repository checks. Validate workflow syntax/configuration and locally exercise the same commands where possible; do not add placeholder tests.

## Swagger / OpenAPI Impact

No documentation impact. This task does not create or change a Backend HTTP contract; existing API tests continue to verify Swagger exposure behavior.

## Constraints

- Use current official documentation for the selected CI provider/actions and pin stable compatible major or immutable references according to the repository's approved policy.
- CI must use Yarn Classic and `yarn install --frozen-lockfile`; it must not rewrite `yarn.lock`.
- Use only safe non-production environment values. Do not add repository secrets for checks that do not need them or print credential-bearing values.
- Check-only commands must not mutate source-controlled files.
- Keep remote caching and deployment disabled.
- Apply the risk-based validation policy while satisfying the Sprint/CI repository-wide gate.
- Never stage or commit without separate approval.

## Acceptance Criteria

- The workflow runs on the verified repository host for pull requests and relevant branch pushes with intentional permissions.
- A clean CI job uses a supported Node version, Yarn Classic, and the frozen lockfile.
- Formatting, repository typecheck, lint, build, all real existing tests, Prisma validation, and Prisma generation run and fail the job when unsuccessful.
- Prisma checks use a safe process-only URL and require no live PostgreSQL service or committed secret.
- No deployment, production migration, remote cache, Docker service, placeholder test, or unrelated dependency behavior is introduced.
- Workflow/action versions, permissions, caching, and environment exposure are reviewed and documented.
- Local equivalents, workflow syntax, Workspace/integrity, dependency/lockfile scope, and final diff checks pass.

## Validation

- Validate workflow syntax and inspect the expanded command/action configuration.
- Run every local command represented by CI from the existing installation, then verify frozen offline installation/integrity where appropriate.
- Confirm Prisma validation/generation succeeds with a safe process-only URL and no database connection.
- Confirm the workflow contains no write token permission, secret echo, deployment, migration application, Docker service, or remote-cache configuration.
- Verify Workspace graph, lockfile scope, check-only formatting behavior, and read-only Git index state.
- If the provider workflow cannot be executed remotely without a commit/push, report that external run as unexecuted rather than claiming it passed.

## Documentation Impact

Document the CI provider, triggers, runtime, commands, permissions, safe Prisma value, caching decision, and local equivalents; update project/Sprint execution records after validation.

## Approval State

Awaiting Implementation Approval

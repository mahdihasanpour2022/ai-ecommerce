# Current Task

## Task ID

S0-T13

## Title

Align Onboarding and Foundation Documentation

## Status

Current

## Goal

Complete Sprint 0's documentation-reality pass so a new contributor can understand, install, validate, and operate the engineering foundation that actually exists without encountering stale starter guidance or implied product functionality.

## Why This Task Exists

The monorepo, three application foundations, quality commands, environment contract, local PostgreSQL lifecycle, Prisma workflow, and CI gate now exist. The top-level onboarding and architecture references must be reconciled once, after implementation, so they describe the approved foundation accurately and link to the canonical detailed guidance.

## Required Context

- `README.md` and `AGENTS.md`
- `docs/00-project-overview.md`
- `docs/roadmap.md`
- `docs/sprints/sprint-00.md`
- `docs/environment.md`
- `docs/development/local-postgresql.md`
- `docs/development/prisma.md`
- `docs/development/ci.md`
- relevant application and package boundary READMEs
- relevant architecture, API, security, and engineering standards referenced by onboarding
- root and Workspace manifests, scripts, examples, and current repository layout
- Sprint 0 execution records

## Scope

- Replace stale starter-oriented root onboarding with concise repository-specific setup, application map, local commands, quality gates, and links to canonical detail.
- Reconcile architecture/project/Sprint statements that materially conflict with implemented Sprint 0 reality.
- Distinguish implemented foundations from planned MVP behavior and Deferred/Open decisions.
- Verify documented commands, paths, ports, routes, environment examples, and prerequisites against the repository.
- Keep `AGENTS.md` concise and avoid duplicating canonical standards.
- Update Sprint 0 execution records only after documentation validation passes.

## Out of Scope

- Application behavior, business modules, schemas/migrations, authentication, UI work, deployment, production infrastructure, or new CI behavior.
- Dependency installation, removal, or version changes; lockfile modification.
- Broad rewriting of already-correct canonical documents or reopening accepted architecture decisions.
- Staging, committing, pushing, branching, or other Git writes.

## Expected Changes

- Root README/onboarding aligned with the real monorepo foundation.
- Narrow corrections or links in canonical context where repository reality exposes a genuine mismatch.
- Sprint 0 execution records and status updated after validation.

## Testing Impact

No new automated test required — validation only

This task changes documentation only. Validate every material command/path/port/route claim against source or configuration, exercise safe onboarding commands where needed, check links and final diff scope, and do not invent placeholder tests.

## Swagger / OpenAPI Impact

No API contract change. Onboarding may link to and accurately describe the existing environment-gated Swagger UI and JSON routes but must not imply that business endpoints exist.

## Constraints

- Documentation must describe current repository reality, not desired future behavior.
- Prefer links to canonical detail over copying long standards or operational procedures.
- Preserve the approved Yarn Classic/Turborepo, Node/framework, environment, database, Prisma, Swagger, formatting, testing, and CI decisions.
- Do not claim Docker-dependent or remote CI behavior passed unless it is actually executed.
- Apply the risk-based validation policy for a documentation-only Sprint quality gate.
- Never stage or commit without separate approval.

## Acceptance Criteria

- A new contributor can identify prerequisites, install from the frozen lockfile, understand all three Workspaces, and find the correct development and validation commands.
- Documented application ports, API/Swagger routes, environment ownership, PostgreSQL/Prisma workflow, and CI behavior match configuration and canonical guidance.
- Implemented, planned, Deferred, and Open behavior is clearly distinguished; no product capability is falsely claimed.
- Canonical links resolve within the repository and `AGENTS.md` remains concise.
- No dependency, lockfile, application behavior, database schema, migration, infrastructure, or unrelated formatting change is introduced.
- Documentation validation, Workspace/integrity, dependency/lockfile scope, and final diff checks pass.

## Validation

- Inspect every changed link, command, path, port, route, prerequisite, and status claim against repository source/configuration.
- Run safe help/read-only or existing validation commands only where necessary to prove onboarding accuracy.
- Verify Workspace discovery and frozen installation/integrity without lockfile mutation.
- Confirm no application, dependency, generated, or Git index change is introduced.
- Run link/path assertions and `git diff --check`; inspect the final diff for stale claims and unrelated scope.

## Documentation Impact

This is the documentation/onboarding reconciliation task. Update root onboarding and only the canonical context needed to make Sprint 0 reality coherent.

## Approval State

Awaiting Implementation Approval

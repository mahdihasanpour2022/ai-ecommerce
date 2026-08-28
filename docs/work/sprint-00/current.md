# Current Task

## Task ID

S0-T11

## Title

Bootstrap Prisma

## Status

Current

## Goal

Initialize a minimal Prisma/PostgreSQL tooling foundation for the API with an explicit migration-review workflow, without creating product, authentication, or other business schema.

## Why This Task Exists

PostgreSQL and the local development connection contract now exist, but the API has no typed database tooling or migration workflow. Future domain schema work needs a version-reviewed Prisma foundation whose commands and generated artifacts are predictable before any business model is approved.

## Required Context

- `docs/sprints/sprint-00.md`
- `docs/00-project-overview.md`
- `docs/environment.md`
- `docs/development/local-postgresql.md`
- `docs/architecture/system-architecture.md`
- `docs/architecture/backend-architecture.md`
- `docs/architecture/database.md`
- `docs/architecture/adr/0006-use-postgresql.md`
- `docs/architecture/adr/0007-use-prisma.md`
- `docs/security/baseline.md`
- `docs/standards/general.md`
- `docs/standards/backend.md`
- `docs/standards/testing.md`
- `docs/standards/git.md`
- `apps/api/package.json`
- `apps/api/.env.example`
- current API TypeScript/build configuration and root database scripts

## Scope

- Review current stable Prisma CLI/client compatibility with the repository Node, TypeScript, NestJS, Yarn Classic, and PostgreSQL 18 constraints before installation.
- Add the minimal exact-version Prisma toolchain to the API Workspace using the approved dependency policy.
- Configure the PostgreSQL provider, generated-client boundary, and the existing `DATABASE_URL` contract without adding a business model.
- Add narrow API Workspace commands for generation, schema validation, formatting, development migration creation, and deployment-safe migration application where justified.
- Define human review requirements for generated SQL, data loss, locks, indexes, backfills, compatibility, and recovery before migration application.
- Keep development and test database use explicit and prevent accidental production-like destructive commands.
- Document generated artifacts, ignore behavior, and the workflow future schema tasks must follow.

## Out of Scope

- Product, catalog, inventory, authentication, authorization, customer, order, payment, or any other domain model/table.
- Applying a speculative initial migration solely to create an empty database history.
- API repository/service integration, health endpoint changes, seed data, fixtures, or database-backed tests.
- Production database hosting, deployment pipeline implementation, backups, secret management, or zero-downtime migration automation.
- Staging, committing, pushing, branching, or other Git writes.

## Expected Changes

- Exact reviewed Prisma CLI/client dependencies in the API Workspace and the scoped `yarn.lock` update.
- Minimal Prisma schema/configuration and generation/validation/migration scripts.
- Generated-client and migration artifact ignore/source-control decisions.
- Canonical Prisma and migration-review documentation plus Sprint 0 execution records.

## Testing Impact

No new automated test required — validation only

No application persistence behavior or model is introduced. Validate the Prisma configuration/schema, client generation, command routing, environment boundary, migration workflow safeguards, API typecheck/build compatibility, dependency integrity, and generated/source-controlled artifact scope.

## Swagger / OpenAPI Impact

No documentation impact. This task does not create or change a Backend HTTP contract.

## Constraints

- Use current official Prisma documentation and verify the selected exact version is stable and compatible before installation.
- Do not invent any model, table, field, relation, index, enum, seed record, or migration merely to demonstrate Prisma.
- Never commit a real database URL or expose it to a browser bundle.
- Migration creation is a deliberate reviewed development action; production-like application uses the non-interactive deployment-safe command only in a separately approved deployment context.
- Do not weaken TypeScript, lint, formatting, validation, or migration safety to accommodate tooling.
- Never stage or commit without separate approval.

## Acceptance Criteria

- Exact stable Prisma CLI/client versions are documented as compatible with the current runtime/toolchain and PostgreSQL 18.
- The API owns a minimal valid PostgreSQL Prisma configuration with no business model or speculative migration.
- Prisma validation, formatting, and client generation commands are explicit and succeed with safe configuration.
- Development migration creation and deployment application commands have distinct documented purposes and review gates.
- Generated/source-controlled artifact behavior is intentional, documented, and ignored or tracked appropriately.
- `DATABASE_URL` remains server-only and real environment files remain ignored.
- Relevant API typecheck/build, Prisma configuration/generation, formatting, Workspace, dependency, lockfile, and scope checks pass.

## Validation

- Verify registry stability, engines, peers, framework/toolchain support, and the exact dependency/lockfile delta.
- Run Prisma format, validate, and generate using safe configuration; inspect the generated location and ensure no unapproved model or migration exists.
- Exercise script routing without applying a speculative migration or touching a production-like database.
- Run affected API typecheck/build and repository formatting checks, plus Workspace/integrity and diff-scope validation.
- If Prisma validation or generation requires PostgreSQL connectivity in the selected version, use only the approved local development database and report unavailable Docker-dependent checks accurately.

## Documentation Impact

Document the canonical Prisma configuration, generation, migration creation/review/application workflow, environment handling, and generated artifacts; update database reality and Sprint 0 execution records after validation.

## Approval State

Awaiting Implementation Approval

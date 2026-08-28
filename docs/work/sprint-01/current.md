# Current Task

## Task ID

S1-T03

## Title

Implement Admin Identity and Session Persistence

## Status

Current

## Goal

Implement the owner-approved S1-T02 Admin identity, minimum RBAC, session, rotating refresh-token history, recovery-envelope metadata, and shared throttle persistence design as a reviewed Prisma schema and additive initial PostgreSQL migration.

## Why

Sprint 1 authentication services cannot safely persist identities, current authorization, browser/device sessions, token rotation/recovery state, or shared throttle state until the accepted database contract exists with enforceable relations, indexes, constraints, and reference data.

## Required Context

The following is the Minimum Sufficient **Required Context** for this task:

- `docs/work/sprint-01/s1-t02-schema-proposal.md`
- `docs/sprints/sprint-01.md`
- `docs/architecture/database.md`
- `docs/development/prisma.md`
- `docs/security/authentication.md`
- `docs/security/authorization.md`
- `docs/architecture/adr/0006-use-postgresql.md`
- `docs/architecture/adr/0007-use-prisma.md`
- `docs/standards/backend.md`
- `docs/standards/testing.md`
- `docs/environment.md`

This set owns the approved model, migration-review gate, security invariants, PostgreSQL/Prisma boundary, validation expectations, and local database configuration. Later endpoint, provisioning, and frontend specifications are excluded because this task implements persistence structures only.

## Scope

- Implement the nine approved mapped Prisma models and their explicit relations, scalar/native types, nullability, uniqueness, ordinary indexes, timestamps, and referential actions in `apps/api/prisma/schema.prisma`.
- Generate one create-only additive migration for the current empty application schema and inspect every SQL statement before application.
- Add the approved named PostgreSQL CHECK constraints, same-session refresh self-reference, unique partial current-token index, and `SUPER_ADMIN`/`admin.access` reference-data insertion to the reviewed migration SQL.
- Keep the migration ordering safe for tables, primary/unique keys, foreign keys, indexes, CHECK constraints, and reference rows; use an explicit transaction only if review confirms the complete migration is transaction-safe.
- Validate the schema and generated client, apply the migration only to approved disposable development/test databases, and verify the resulting tables, constraints, indexes, referential actions, and reference rows.
- Add focused automated integration coverage for database-enforced invariants and migration/reference-data behavior where stable and practical within the existing API test foundation.
- Reconcile only documentation made stale by the implemented schema/migration.

## Out of Scope

- Authentication repositories/services/controllers, login, JWT/cookie issuance, CSRF middleware/endpoints, refresh rotation application logic, logout, authorization guards, or HTTP/OpenAPI contracts.
- First-Super-Admin provisioning, password hashing flows, runtime cleanup scheduling, security-event/audit storage, per-IP distributed throttling, Redis, or production migration/deployment operations.
- Customer identity or any catalog, inventory, cart, order, payment, media, or speculative domain schema.
- Changing the accepted S1-T02 model or migration policy without an explicit owner decision.
- Implementing or preparing S1-T04 or later tasks before this task completes.

## Expected Changes

- `apps/api/prisma/schema.prisma`
- One new reviewed directory under `apps/api/prisma/migrations/`
- Focused API integration test/support files required to verify database invariants, if the existing test architecture supports them without a dependency change
- Narrow Prisma/database/authentication documentation updates only if implementation details require synchronization
- Sprint execution records after successful validation

## Architecture Impact

This implements the persistence boundary beneath the existing Modular Monolith API without adding a new service or domain abstraction. Prisma remains API-owned; authentication application behavior stays in later tasks.

## Swagger / OpenAPI Impact

None. This task creates no HTTP endpoint, DTO, status, error, or authentication contract. Later endpoint tasks own matching Swagger/OpenAPI updates.

## Database / Prisma Impact

High and explicitly approved in design. The task changes the live Prisma schema and creates the first application migration: nine additive authentication tables, explicit constraints/indexes/relations, and two system reference rows plus their grant. The approved empty-schema assumption must be verified before application. No existing application data is expected to be transformed or removed.

## Security Impact

Security-critical. Database enforcement must prevent duplicate identity/assignment/grant state, cross-session refresh links, multiple current refresh tokens per session, malformed hash/envelope lengths, invalid lifecycle timestamps, unsafe root cascades, and plaintext credential persistence. Generated SQL and test output must not expose credentials or connection secrets.

## Constraints

- Implement the accepted S1-T02 proposal exactly; surface any Prisma/PostgreSQL mismatch or required design change as an Open Decision before proceeding.
- Use installed Prisma 7.10.0, PostgreSQL 18, Yarn Classic, and existing packages only. Do not add, remove, or upgrade dependencies.
- Use the established `migrate dev --create-only` review gate. Do not use `db push`, `migrate reset`, an experimental Preview feature, or edit an already-applied migration.
- Apply only against explicitly verified disposable `automotive_dev`/`automotive_test` databases. Never run migration creation/application against shared, production-like, or unidentified data.
- Do not stage, commit, push, rewrite Git history, or change unrelated files.

## Acceptance Criteria

- All nine approved models are present with the exact approved purposes, mapped names, field types, nullability, keys, relations, indexes, timestamps, and explicit referential actions.
- Prisma validation and client generation pass with the repository-pinned 7.10.0 toolchain.
- The reviewed migration is additive and creates the expected tables, keys, foreign keys, ordinary indexes, named CHECK constraints, unique partial current-token index, and `SUPER_ADMIN`/`admin.access` reference rows/grant in safe order.
- A disposable database migration/apply inspection proves the schema matches the approved design and Prisma reports a healthy migration state.
- Focused automated integration checks prove critical database invariants, including duplicate identity/RBAC rejection, same-session refresh linkage, one-current-token enforcement, malformed security-field/timestamp rejection, intended restrict/cascade behavior, and idempotent expected reference state where applicable.
- No plaintext password, refresh token, CSRF token, recovery key, submitted login identifier, or usable secret appears in schema, migration, fixtures, tests, output, or documentation.
- Migration review confirms the empty-schema assumption, absence of destructive/backfill/table-rewrite behavior, transaction/lock implications, failure handling, and forward-repair path.
- Documentation consistently distinguishes implemented persistence from later unimplemented authentication/runtime behavior.
- No unrelated application/domain schema, dependency, lockfile, generated tracked artifact, later-task status, Git index, or Git history change occurs.

## Testing Impact

Automated tests required

Focused integration coverage must exercise the database-enforced security and data-integrity invariants that Prisma validation alone cannot prove. No HTTP/API or frontend test is required because this task changes no runtime endpoint or UI behavior.

## Validation

- Verify the target database identity and empty application-schema assumption before migration creation or application.
- Run Prisma formatting and validation, generate the ignored client, and inspect the generated create-only SQL statement by statement.
- Apply the reviewed migration to approved disposable development/test databases and inspect tables, columns, native types, defaults, keys, foreign keys, referential actions, CHECK constraints, indexes, and reference rows.
- Run the focused database integration tests and relevant API Workspace typecheck/lint/build/test gates affected by test/support changes.
- Verify Prisma migration status and confirm a clean re-application path on a fresh disposable database.
- Run relevant formatting checks, local Markdown-link checks for changed documentation, `git diff --check`, secret-material/scope inspection, and read-only Git-index inspection.
- Confirm `schema.prisma` and migration SQL match the approved S1-T02 proposal; generated output remains ignored; manifests, dependencies, `yarn.lock`, unrelated domains, and S1-T04+ statuses remain unchanged.

## Documentation Impact

Update the database/Prisma/authentication context only where the completed schema and migration change design-only wording to implemented persistence. Record exact validation in `done.md`; do not duplicate the full schema proposal or claim later authentication behavior exists.

## Approval State

Awaiting Implementation Approval

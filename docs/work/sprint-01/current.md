# Current Task

## Task ID

S1-T04

## Title

Implement First Super Admin Provisioning

## Status

Current

## Goal

Implement a trusted-environment administrative CLI/script that securely provisions the one initial `SUPER_ADMIN` using the S1-T03 persistence boundary, approved Argon2id parameters, and a transaction-scoped PostgreSQL advisory lock.

## Why

The authentication slice needs one explicit, auditable way to create its first eligible Admin without a public bootstrap endpoint, committed/default credentials, race-prone check-then-create behavior, or a permanent bootstrap flag.

## Required Context

The following is the Minimum Sufficient **Required Context** for this task:

- `docs/work/sprint-01/s1-t02-schema-proposal.md`
- `docs/sprints/sprint-01.md`
- `docs/security/authentication.md`
- `docs/security/authorization.md`
- `docs/features/admin-auth/specification.md`
- `docs/development/prisma.md`
- `docs/environment.md`
- `docs/standards/backend.md`
- `docs/standards/testing.md`
- `docs/standards/execution.md`

This set owns the bootstrap transaction/locking design, credential and hashing requirements, minimum authorization state, Prisma boundary, trusted configuration rules, and validation policy. Login/session endpoint and frontend implementation details are excluded because this task provisions identity and assignment only.

## Scope

- Add one clearly named API Workspace administrative command for trusted local/operational invocation; expose no HTTP endpoint.
- Accept the canonical email, display name, and password through a secret-safe interactive or protected-environment input contract that never places the password in command arguments, tracked files, logs, or normal output.
- Validate and canonicalize non-secret identity input before database work; require password confirmation/strength handling appropriate to the accepted provisioning contract.
- Hash the password with the accepted Argon2id v19 parameters, library-generated salt, and 32-byte output; store only the encoded hash.
- In one database transaction, acquire a fixed transaction-scoped PostgreSQL advisory lock, verify no Admin exists, verify the migration-created `SUPER_ADMIN` and `admin.access` grant, create the Admin, and assign the Role.
- Return stable non-secret success/failure output and a nonzero exit code for invalid input, missing reference state, repeat/concurrent bootstrap, database failure, or interrupted input.
- Add focused automated unit/integration coverage for validation, redaction-safe outcomes, repeat/concurrent provisioning, transaction rollback, exact Role assignment, and stored-hash verification.
- Reconcile only documentation made stale by the implemented command.

## Out of Scope

- Public/internal bootstrap HTTP endpoints, login, JWT/cookies, CSRF, sessions, refresh, logout, authorization guards, or Swagger/OpenAPI contracts.
- Provisioning a second Admin, general Admin/Role management, password reset/change, MFA, audit-event persistence, or a permanent bootstrap-state table/flag.
- Passing plaintext passwords in command-line arguments, storing them in fixtures, or printing credentials/hashes.
- Schema changes, migrations, seed infrastructure, production secret-provider selection, or implementing S1-T05 and later tasks.

## Expected Changes

- Focused API source under a provisioning/administrative boundary plus an API Workspace script entry
- Focused unit/integration tests and test support
- `apps/api/package.json` and `yarn.lock` only if the exact Argon2 dependency/version receives separate explicit owner approval
- Narrow provisioning/onboarding documentation and Sprint execution records

## Architecture Impact

Adds a one-shot trusted administrative entry point inside the API Workspace that reuses the API-owned Prisma boundary. It does not add a runtime module, controller, long-running service, or general seed framework.

## Swagger / OpenAPI Impact

None. This task exposes no HTTP route or contract.

## Database / Prisma Impact

No schema or migration change. Successful execution inserts one `AdminUser` and one `AdminUserRole` assignment using existing reference rows. The transaction and advisory lock must make repeat and concurrent bootstrap attempts fail safely without partial rows.

## Security Impact

Security-critical. Plaintext password lifetime and exposure must be minimized; secrets must never appear in argv, source, fixtures, logs, errors, shell history, or generated output. Input validation, Argon2id parameters, transaction isolation/locking, reference-data verification, generic database errors, and repeat-bootstrap behavior must fail closed.

## Constraints

- Preserve the exact S1-T02 bootstrap invariant: transaction-scoped advisory lock, zero existing Admins, verified system Role/Permission grant, then Admin plus assignment in one transaction.
- Use installed Prisma 7.10.0, PostgreSQL 18, Yarn Classic, and the supported Node matrix.
- Do not add an Argon2 package until its exact package/version and lockfile impact receive explicit owner approval; implementation approval alone does not waive the repository dependency boundary.
- Do not create a default credential, seed file, bootstrap endpoint, schema change, migration, or permanent singleton flag.
- Do not stage, commit, push, or change unrelated files.

## Acceptance Criteria

- One documented trusted-environment command provisions exactly one canonical Admin with the `SUPER_ADMIN` Role and effective `admin.access`, without creating a session or token.
- The stored password is a verifiable encoded Argon2id v19 hash using the accepted parameters and a library-generated unique salt; plaintext is never persisted or emitted.
- Invalid input, missing/malformed reference state, repeat execution, and concurrent execution fail with nonzero safe outcomes and leave no partial Admin/assignment state.
- The transaction-scoped advisory lock and transaction boundary are proven against disposable PostgreSQL; exactly one concurrent attempt may succeed from an empty database.
- No public endpoint, default credential, command-line password argument, schema/migration, general seed abstraction, unrelated dependency, or later-task behavior is introduced.
- Focused automated tests plus API typecheck/lint/build/test gates pass, and documentation accurately describes invocation without embedding a usable secret.

## Testing Impact

Automated tests required

Focused tests must cover input/canonicalization behavior, password hashing/verification without fixed credential fixtures, transaction rollback, missing reference rows, repeat bootstrap, concurrent bootstrap, exact assignment, safe output, and absence of session/token creation.

## Validation

- Preflight the exact disposable PostgreSQL development/test identities and required input environment without printing secrets.
- Validate the approved Argon2 package/version and supported runtime before any separately approved dependency installation.
- Run focused unit tests and disposable-database integration tests, including concurrent attempts and post-failure catalog/data inspection.
- Verify the stored encoded hash algorithm/version/parameters and successful verification using process-only test input; never print the password or hash.
- Run affected API test, typecheck, lint, and build gates plus repository formatting checks.
- Run local Markdown-link checks for changed documentation, `git diff --check`, secret-material/argv/logging inspection, dependency/lockfile scope inspection, generated-output-ignore checks, and read-only Git-index inspection.

## Documentation Impact

Document the trusted command, input contract, safe success/failure behavior, prerequisites, and explicit no-default/no-HTTP boundary. Record exact validation in `done.md`; do not claim login or runtime authentication exists.

## Open Decision

Select the exact maintained Argon2 implementation/version compatible with the repository's Node matrix and approve its manifest/lockfile change before installation.

## Approval State

Awaiting Implementation Approval

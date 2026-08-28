# Sprint 1 Done

## S1-T01 — Resolve Blocking Authentication Decisions

**Completed:** 2026-08-28

**Result:** Resolved the blocking Admin Authentication security and contract decisions with explicit owner approval and reconciled the canonical architecture, feature, API, environment, database, frontend, testing, and Sprint context. No runtime behavior was implemented.

### Validation

Current official JOSE, Argon2, NestJS throttling, RFC, OWASP, Node.js, and NIST guidance was reviewed. Focused decision-trace and local Markdown-link checks passed. Cross-document stale/open-label inspection, `git diff --check`, documentation-only scope, secret-material scan, and read-only Git-index inspection passed. No automated test was required because this task changed documentation only.

**Important Decisions:** Access JWTs use Ed25519/EdDSA with strict key/claim validation; CSRF uses a hashed session synchronizer token held in frontend memory; ten-second refresh recovery uses a bounded AES-256-GCM envelope; Sprint 1 uses `SUPER_ADMIN` plus `admin.access`; failed logins are enumeration-safe; passwords use the approved Argon2id baseline; accepted account/IP/session throttles have no permanent lockout; return paths and security logging are constrained and safe.

**Files / Areas Changed:** Canonical authentication/authorization, Admin Authentication, ADR, API, environment, conceptual database, frontend architecture, testing, and Sprint 1 execution documentation only.

**Documentation Impact:** Resolved S1-T01 questions are now accepted contracts; final Prisma representation remains explicitly owned by S1-T02, and implemented Swagger/OpenAPI remains owned by later endpoint tasks.

**Follow-ups:** S1-T02 remains Queued and requires separate owner approval to become Current; no schema, migration, application, dependency, lockfile, or generated-file change was made.

## S1-T02 — Design Admin Identity and Session Schema

**Completed:** 2026-08-28

**Result:** Produced and owner-approved a concrete nine-table Admin identity, RBAC, session, rotating-refresh, recovery-envelope, and shared-throttle persistence design plus its additive initial migration plan. The design remains unimplemented until S1-T03.

### Validation

Current Prisma ORM 7 and PostgreSQL 18 documentation was reviewed through Context7. A disposable representation of all nine approved models, relations, composite keys, indexes, native types, and referential actions passed the installed Prisma CLI 7.10.0 `validate` command and was removed afterward. Authentication/RBAC invariants, query and transaction paths, adverse lifecycle cases, migration risk, local Markdown links, proposal formatting, secret-material scope, documentation-only scope, `git diff --check`, and the read-only Git index were reviewed and passed. No automated test was required because no runtime or live schema behavior changed.

**Important Decisions:** Use UUID identities, canonical lowercase Admin email, explicit RBAC joins, fixed absolute session expiry, a same-session linear refresh chain with a migration-managed partial current-token index, bounded AES-256-GCM recovery metadata, durable HMAC-keyed account and per-session throttle buckets, explicit referential actions/CHECK constraints, 30-day terminal security-history retention, reference-data insertion, and forward repair.

**Files / Areas Changed:** Added the durable S1-T02 schema/migration proposal and narrowly reconciled canonical database, authentication, authorization, environment, feature, and Sprint documentation. No Prisma schema, migration, generated client, application, dependency, or lockfile changed.

**Documentation Impact:** The approved proposal is now the canonical detailed persistence contract; other documents reference it and continue to distinguish approved design from S1-T03 implementation.

**Follow-ups:** S1-T03 is Current and awaiting implementation approval. It owns the reviewed Prisma schema, additive migration SQL, reference data, database-constraint verification, and generated-client validation.

## S1-T03 — Implement Admin Identity and Session Persistence

**Completed:** 2026-08-28

**Result:** Implemented and database-verified the approved nine-model Admin identity, minimum RBAC, session, rotating-refresh history, recovery-envelope metadata, and shared-throttle persistence boundary as one additive PostgreSQL migration with the approved system reference grant.

### Validation

Prisma ORM 7 migration behavior was reviewed through Context7. The pinned PostgreSQL 18.6 Compose environment passed health and exact development/test database identity checks; both databases initially contained zero public tables. Prisma 7.10.0 format, validate, generate, create-only review, deploy, and migration-status checks passed. A fresh test-database apply and repeated deploy proved a clean idempotent migration path. Catalog inspection found the expected nine tables, 23 CHECK constraints, eight foreign keys with intended actions, 15 named indexes including the partial current-token invariant, and exactly one `SUPER_ADMIN`/`admin.access` grant with no Admin row. The rollback-only database invariant suite passed after correcting its PostgreSQL `RESTRICT` exception handling. All 19 API tests, API typecheck, lint, build, and repository formatting checks passed. Repository-wide local Markdown targets, stale blocker wording, secret-material patterns, generated-client ignore behavior, dependency/lockfile scope, `git diff --check`, and the read-only Git index also passed.

**Important Decisions:** The reviewed migration remains one transaction-safe additive baseline for an empty application schema; it performs no drop, backfill, rewrite, or concurrent index operation. Prisma's create-only gate produced one empty follow-up artifact because the reviewed migration already matched the schema; that unneeded empty artifact was removed before the clean test apply. Migration failures roll back atomically, and any future correction uses a new forward-repair migration rather than editing the applied baseline.

**Files / Areas Changed:** API Prisma schema, reviewed migration and migration lock, focused schema/source tests, rollback-only PostgreSQL invariant suite, and narrow database/authentication/Sprint documentation.

**Documentation Impact:** Canonical persistence documents now distinguish the implemented and database-verified S1-T03 boundary from unimplemented provisioning and runtime authentication behavior.

**Follow-ups:** S1-T04 is Current and awaiting implementation approval. It owns the trusted-environment first-Super-Admin provisioning workflow; selecting and installing an Argon2 implementation remains an explicit owner-approved dependency decision.

## S1-T04 — Implement First Super Admin Provisioning

**Completed:** 2026-08-28

**Result:** Implemented a trusted one-shot API Workspace command that provisions exactly the first eligible `SUPER_ADMIN` without an HTTP endpoint, default credential, session, token, seed framework, schema change, or bootstrap flag.

### Validation

Current node-argon2 and Prisma 7 adapter documentation was reviewed through Context7, and current OWASP password guidance was reviewed. The owner-approved `argon2@0.45.1` and `@prisma/adapter-pg@7.10.0` direct versions, transitive lockfile scope, native hash/verify behavior, and adapter import were verified. Frozen offline installation, final Yarn integrity, Prisma validate/generate, API typecheck, lint, build, repository formatting, all 35 API tests against isolated PostgreSQL 18.6, and the compiled CLI smoke path passed. Database tests proved exact Role/Permission assignment, Argon2id v19 parameters/verification, safe repeat behavior, exactly one concurrent winner, missing-reference failure, assignment-failure rollback, and absence of sessions/tokens. Final catalog inspection proved no test Admin/assignment/trigger/function remained and the system reference grant remained intact. Local Markdown links, secret-pattern/argv/output inspection, dependency scope, generated-output ignore behavior, `git diff --check`, and the read-only Git index passed.

**Important Decisions:** The command accepts no arguments and consumes one-shot process configuration; password variables are removed from the child environment immediately after capture. Passwords allow Unicode/whitespace, require 15–128 characters and exact confirmation, and use Argon2id v19 with `m=65536`, `t=3`, `p=1`, 32-byte output, and a library-generated salt. Hashing occurs before the transaction; a fixed parameterized transaction-scoped PostgreSQL advisory lock then serializes the zero-Admin check, exact `SUPER_ADMIN` → `admin.access` verification, and atomic Admin/assignment insertion.

**Files / Areas Changed:** Added the API administration/provisioning boundary, compiled Workspace command, focused unit/database integration tests, the two explicitly approved direct dependencies and lockfile resolution, trusted provisioning guide, one-shot environment contract, and narrow repository/security reality updates.

**Documentation Impact:** The trusted invocation, prerequisites, one-shot variables, safe output/failure behavior, password policy, transaction boundary, and explicit no-HTTP/no-login scope are documented without a usable credential.

**Follow-ups:** S1-T05 is Current and awaiting implementation approval. It owns backend credential validation, enumeration-safe throttling, session/initial-token creation, cookie issuance, login security boundary, and matching Swagger/OpenAPI documentation. Selecting/installing an exact JOSE implementation remains a separate explicit dependency decision.

<!-- Append concise records with Result, a `### Validation` section listing only checks actually executed, Important Decisions, Files / Areas Changed, Documentation Impact, and Follow-ups. Add Completed only when the date is reliable. -->

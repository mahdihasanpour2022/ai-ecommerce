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

<!-- Append concise records with Result, a `### Validation` section listing only checks actually executed, Important Decisions, Files / Areas Changed, Documentation Impact, and Follow-ups. Add Completed only when the date is reliable. -->

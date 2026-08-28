# S1-T02 Admin Identity and Session Schema Proposal

**Status:** Accepted

**Owner approval:** 2026-08-28

This is an approved design artifact, not an implemented Prisma schema or migration. It translates the accepted Sprint 1 authentication contract into the concrete persistence design that S1-T03 may implement after its separate task approval.

## Design summary

Use nine PostgreSQL tables represented by explicit Prisma models:

1. `admin_users`
2. `roles`
3. `permissions`
4. `admin_user_roles`
5. `role_permissions`
6. `auth_sessions`
7. `refresh_tokens`
8. `admin_login_throttles`
9. `auth_session_refresh_throttles`

Prisma model/field names remain singular PascalCase/camelCase while physical tables/columns and security-relevant constraints/indexes receive intentional snake_case mappings/names. IDs are UUIDs. Security timestamps use PostgreSQL `timestamptz(3)`. Hashes and encrypted bytes use `bytea` rather than encoded text.

## Proposed models

### `AdminUser` → `admin_users`

| Field          | PostgreSQL / Prisma shape              | Rules and purpose                                                                                                                                                    |
| -------------- | -------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`           | `uuid` / `String @db.Uuid`             | Primary key; Prisma-generated UUID.                                                                                                                                  |
| `email`        | `varchar(254)` / `String`              | Required unique login identifier; application stores the validated trimmed lowercase canonical form. A migration CHECK enforces non-empty trimmed lowercase storage. |
| `displayName`  | `varchar(120)` / `String`              | Required trimmed non-empty Admin display label.                                                                                                                      |
| `passwordHash` | `varchar(255)` / `String`              | Encoded Argon2id hash only; parameters and salt remain in the encoded value.                                                                                         |
| `disabledAt`   | `timestamptz(3)` / nullable `DateTime` | `NULL` means active; a timestamp means disabled. Avoids redundant status/boolean state.                                                                              |
| `createdAt`    | `timestamptz(3)`                       | Required, default current time.                                                                                                                                      |
| `updatedAt`    | `timestamptz(3)`                       | Required Prisma-managed update time.                                                                                                                                 |

`email` is the only authentication lookup key for Sprint 1. Do not add username, phone, Customer linkage, password-history, or speculative profile fields. `/auth/me` may later expose only `id`, `email`, and `displayName` from this identity object.

Indexes: unique `email`; `(disabled_at)` is not indexed because authentication resolves one row by unique email/ID and no approved bulk-disabled query needs it.

### `Role` → `roles`

| Field                    | Shape                | Rules and purpose                                           |
| ------------------------ | -------------------- | ----------------------------------------------------------- |
| `id`                     | UUID primary key     | Stable internal identity.                                   |
| `code`                   | `varchar(64)` unique | Required machine code; Sprint 1 creates only `SUPER_ADMIN`. |
| `createdAt`, `updatedAt` | `timestamptz(3)`     | Lifecycle metadata.                                         |

### `Permission` → `permissions`

| Field                    | Shape                 | Rules and purpose                                            |
| ------------------------ | --------------------- | ------------------------------------------------------------ |
| `id`                     | UUID primary key      | Stable internal identity.                                    |
| `code`                   | `varchar(128)` unique | Required machine code; Sprint 1 creates only `admin.access`. |
| `createdAt`, `updatedAt` | `timestamptz(3)`      | Lifecycle metadata.                                          |

Role codes use uppercase underscore-delimited identifiers; Permission codes use lowercase dot-delimited identifiers. Database CHECK constraints enforce those formats. Labels/descriptions and role-management metadata remain out of scope.

### `AdminUserRole` → `admin_user_roles`

| Field         | Shape            | Rules and purpose                                                      |
| ------------- | ---------------- | ---------------------------------------------------------------------- |
| `adminUserId` | UUID foreign key | References `AdminUser`; delete cascades only this pure assignment row. |
| `roleId`      | UUID foreign key | References `Role`; deletion is restricted while assigned.              |
| `assignedAt`  | `timestamptz(3)` | Required, default current time.                                        |

Composite primary key `(admin_user_id, role_id)` prevents duplicate assignment. Add a reverse index on `role_id`.

### `RolePermission` → `role_permissions`

| Field          | Shape            | Rules and purpose                                                                  |
| -------------- | ---------------- | ---------------------------------------------------------------------------------- |
| `roleId`       | UUID foreign key | References `Role`; deleting an unassigned Role cascades its pure permission links. |
| `permissionId` | UUID foreign key | References `Permission`; deletion is restricted while granted.                     |
| `grantedAt`    | `timestamptz(3)` | Required, default current time.                                                    |

Composite primary key `(role_id, permission_id)` prevents duplicate grants. Add a reverse index on `permission_id`.

The initial migration inserts `SUPER_ADMIN`, `admin.access`, and their link as stable system reference data. Future registered permissions must also be linked explicitly to `SUPER_ADMIN`; there is no wildcard permission or role claim in JWTs.

### `AuthSession` → `auth_sessions`

| Field                    | Shape                     | Rules and purpose                                                                                       |
| ------------------------ | ------------------------- | ------------------------------------------------------------------------------------------------------- |
| `id`                     | UUID primary key          | One browser/device login.                                                                               |
| `adminUserId`            | UUID foreign key          | Required `AdminUser`; hard deletion is restricted while sessions remain.                                |
| `csrfTokenHash`          | `bytea`                   | Required 32-byte SHA-256 hash; never plaintext.                                                         |
| `expiresAt`              | `timestamptz(3)`          | Absolute session expiry, default contract seven days after login.                                       |
| `revokedAt`              | nullable `timestamptz(3)` | Current-session logout or security revocation.                                                          |
| `lastUsedAt`             | `timestamptz(3)`          | Initialized at creation and updated on meaningful authentication/session use, not every protected read. |
| `createdAt`, `updatedAt` | `timestamptz(3)`          | Lifecycle metadata.                                                                                     |

Rotation does not extend `expiresAt`; every RefreshToken is capped at the same absolute session expiry. This prevents an unbounded sliding login while preserving the accepted seven-day default.

Indexes: `(admin_user_id, revoked_at, expires_at)` for Admin-wide disable/revocation and active-session operations; `(expires_at)` for cleanup. Database CHECK constraints require `expires_at > created_at`, `last_used_at >= created_at`, `revoked_at >= created_at` when present, and a 32-byte CSRF hash.

### `RefreshToken` → `refresh_tokens`

| Field                | Shape                                       | Rules and purpose                                                                                                                                       |
| -------------------- | ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`                 | UUID primary key                            | Internal token-history identity.                                                                                                                        |
| `sessionId`          | UUID foreign key                            | Required `AuthSession`; session cleanup cascades token history.                                                                                         |
| `tokenHash`          | `bytea` unique                              | Required 32-byte SHA-256 lookup value; raw token never persists normally.                                                                               |
| `expiresAt`          | `timestamptz(3)`                            | Must not exceed its session's absolute expiry.                                                                                                          |
| `rotatedAt`          | nullable `timestamptz(3)`                   | Set when superseded by a replacement.                                                                                                                   |
| `revokedAt`          | nullable `timestamptz(3)`                   | Set for revocation/reuse handling.                                                                                                                      |
| `replacedByTokenId`  | nullable UUID in a composite unique/self-FK | Together with `sessionId`, old token points to one replacement in the same session; `NO ACTION` permits whole-session history cleanup in one operation. |
| `recoveryCiphertext` | nullable `bytea`                            | AES-256-GCM ciphertext of the raw current token.                                                                                                        |
| `recoveryNonce`      | nullable `bytea`                            | Unique 12-byte GCM nonce.                                                                                                                               |
| `recoveryAuthTag`    | nullable `bytea`                            | Required 16-byte authentication tag.                                                                                                                    |
| `recoveryKeyId`      | nullable `varchar(128)`                     | Selects only a server-configured recovery key.                                                                                                          |
| `recoveryExpiresAt`  | nullable `timestamptz(3)`                   | At most the accepted ten-second grace boundary.                                                                                                         |
| `createdAt`          | `timestamptz(3)`                            | Required, default current time.                                                                                                                         |

Indexes/constraints: unique `token_hash`; unique `(id, session_id)` as the composite self-FK target; unique `(replaced_by_token_id, session_id)` for a same-session linear replacement chain; `(session_id, created_at)` for history/current-session operations; `(expires_at)` for cleanup; and `(recovery_expires_at)` for prompt envelope erasure.

A database-native unique partial index enforces at most one unrotated/unrevoked current token per session:

```sql
CREATE UNIQUE INDEX refresh_tokens_one_current_per_session
ON refresh_tokens (session_id)
WHERE rotated_at IS NULL AND revoked_at IS NULL;
```

Do not enable Prisma's `partialIndexes` Preview feature merely to represent this invariant. S1-T03 should add the reviewed index to the create-only migration SQL and document it as a migration-managed PostgreSQL invariant.

The replacement relation uses `(replaced_by_token_id, session_id) → (id, session_id)` so malformed data cannot cross token families. Migration CHECK constraints require 32-byte token hashes; valid timestamp ordering; `replaced_by_token_id` only when `rotated_at` exists; and either all recovery-envelope fields or none, with exact nonce/tag lengths. The ten-second limit remains validated against configuration in application logic because a database CHECK cannot safely depend on runtime environment values.

### `AdminLoginThrottle` → `admin_login_throttles`

| Field             | Shape                       | Rules and purpose                                                                                                                                                         |
| ----------------- | --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `identifierKey`   | 32-byte `bytea` primary key | HMAC-SHA-256 of the canonical login email using a dedicated server secret; the same lookup works for existing and nonexistent identities without storing submitted email. |
| `windowStartedAt` | nullable `timestamptz(3)`   | Start of the current 15-minute failure window.                                                                                                                            |
| `failureCount`    | integer default `0`         | Non-negative failures in the current window.                                                                                                                              |
| `delayUntil`      | nullable `timestamptz(3)`   | Enforces the accepted 30-second-to-15-minute backoff.                                                                                                                     |
| `updatedAt`       | `timestamptz(3)`            | Concurrency and cleanup visibility.                                                                                                                                       |

Existing and nonexistent identities use the same durable bucket and generic `429` behavior, closing a throttle-based enumeration channel. The dedicated `AUTH_LOGIN_THROTTLE_HMAC_KEY` is server-only, independently injected, never stored in the database, and may reset these short-lived counters when deliberately rotated. A plain SHA-256 email digest is rejected because a stolen throttle table would permit inexpensive dictionary recovery. Successful authentication atomically deletes/resets the matching bucket.

Database CHECK constraints require a 32-byte identifier key, non-negative `failureCount`, and internally valid window/delay timestamps.

### `AuthSessionRefreshThrottle` → `auth_session_refresh_throttles`

| Field             | Shape                        | Rules and purpose                                                              |
| ----------------- | ---------------------------- | ------------------------------------------------------------------------------ |
| `sessionId`       | UUID primary key/foreign key | One shared one-minute bucket per active session; session deletion cascades it. |
| `windowStartedAt` | nullable `timestamptz(3)`    | Current one-minute window start.                                               |
| `attemptCount`    | integer default `0`          | Non-negative attempts in the current window.                                   |
| `updatedAt`       | `timestamptz(3)`             | Concurrency and cleanup visibility.                                            |

Per-IP login/refresh limits remain process-local only for the accepted single-instance foundation and gain a separately approved shared/edge implementation before horizontal deployment.

Database CHECK constraints require non-negative `attemptCount` and valid window timestamps.

## Transaction and query invariants

- **Login:** normalize email, derive the throttle HMAC key, lock/update the same account bucket for existing and nonexistent identities, select `AdminUser` by unique email, perform real/dummy Argon2id work, then create `AuthSession`, its session throttle, and initial `RefreshToken` atomically only after status and `admin.access` eligibility pass.
- **Authorization:** resolve the session/Admin by primary keys and join `AdminUserRole → RolePermission → Permission`; do not read authorization from JWT or frontend state.
- **First bootstrap:** in one transaction, take a PostgreSQL transaction-scoped advisory lock, verify no Admin exists, select the migration-created system Role/Permission rows, create the Admin and assignment, and fail safely on repeat/concurrent execution. No permanent singleton/bootstrap flag is added.
- **Refresh rotation:** lock the active session and presented token row, update the old token's `rotatedAt`, insert the new token/envelope, link `replacedByTokenId`, and update session use/throttle state in one transaction. The partial unique index is a final backstop, not a substitute for locking.
- **Grace recovery:** follow `replacedByTokenId` to the exact latest current token and decrypt only when session, CSRF, grace time, envelope authentication, and current-token state all pass. An expired envelope is unusable even before physical erasure.
- **Reuse/logout/disable:** revoke the affected session/token family atomically for suspicious reuse or logout. Disabled Admin checks remain authoritative on every protected/refresh path; bulk session revocation may additionally occur when a future disable command is implemented.

## Referential actions and deletion policy

- Do not hard-delete Admin identities, system roles, or permissions in Sprint 1. Disable Admin access with `disabledAt` and revoke sessions.
- Restrict deletion of an Admin while sessions remain and deletion of a Role/Permission while security assignments/grants remain.
- Cascade only dependent rows that have no independent meaning: Admin-role assignments when an Admin is explicitly purged, Role-permission links when an unassigned Role is deleted, and session throttle/refresh history with a session cleanup. Login throttle buckets have no Admin foreign key and expire independently.
- Keep every referential action explicit in Prisma rather than relying on connector defaults.

## Retention and cleanup proposal

- Treat recovery material as unusable immediately at `recoveryExpiresAt`; erase its ciphertext/nonce/tag/key ID/expiry fields promptly after the ten-second window.
- Retain rotated, revoked, and expired RefreshToken hash/history rows through the session's terminal time plus 30 days for replay classification and focused security diagnosis, then delete them.
- Retain a revoked/expired AuthSession until its token history is eligible for deletion, then delete the session and its session-throttle row. Active sessions are never cleanup candidates.
- Delete inactive account throttle buckets 24 hours after `updatedAt`, well beyond the accepted window/maximum delay; they contain only a keyed digest and counter state, not a submitted identifier or credential.
- Security-event retention remains a separate operational decision; this proposal creates no audit-event table.

Cleanup must be bounded, batched, ordered child-before-parent, safe to retry, and race-aware. S1-T03 implements only persistence structures; scheduling a production cleanup worker belongs to the authentication implementation/release plan unless separately included.

## Initial migration proposal

The current Prisma schema has no model and the development database is expected to contain no application tables. S1-T03 should:

1. Add the nine approved Prisma models with explicit mapped names, foreign keys, unique constraints, and ordinary indexes.
2. Run the existing `prisma:migrate:create -- --name add_admin_identity_and_sessions` command against disposable `automotive_dev` only.
3. Inspect generated SQL before application.
4. Customize that SQL with named CHECK constraints and the current-token partial unique index; do not enable an experimental Prisma Preview feature.
5. Insert the `SUPER_ADMIN` Role, `admin.access` Permission, and their grant without creating an Admin or credential.
6. Consider wrapping this all-new-schema migration in explicit `BEGIN`/`COMMIT` after verifying every statement, because Prisma does not wrap PostgreSQL migrations by default.
7. Apply only to disposable development/test databases after approval, introspect tables/constraints/indexes/reference rows, run persistence/security tests, and verify Prisma migration status.

The migration is additive against the approved empty application schema: no drop, rename, backfill, table rewrite, or existing-row conversion is expected. If inspection finds existing application tables/data, stop and redesign rather than relying on this assumption. PostgreSQL `CREATE INDEX CONCURRENTLY` is unnecessary for empty new tables and cannot run inside the proposed transaction.

Rollback is forward repair: do not edit an applied migration. Before production data exists, a separately approved corrective migration may remove/recreate faulty objects. Production backup/restore and zero-downtime rollout remain release scope.

## Accepted Owner Decisions

The owner approved this proposal as one package:

1. **Identity:** UUID keys; one canonical lowercase email; required display name; active state represented only by nullable `disabledAt`; `/auth/me` safe identity fields `id`, `email`, `displayName`.
2. **RBAC/bootstrap:** explicit join tables; only `SUPER_ADMIN` and `admin.access`; initial migration inserts those reference rows; first-Admin CLI uses a transaction/advisory lock rather than a permanent bootstrap flag.
3. **Session lifetime:** fixed absolute seven-day session/refresh expiry; rotation does not slide or extend it.
4. **Refresh invariant:** linear self-linked history plus reviewed PostgreSQL partial unique index; no Prisma Preview feature.
5. **Recovery storage:** nullable all-or-none AES-256-GCM envelope with 12-byte nonce, 16-byte tag, configured key ID, immediate logical expiry, and prompt field erasure.
6. **Throttles:** a durable HMAC-keyed account/identifier bucket treats known and unknown emails identically, a one-to-one session bucket handles refresh, inactive login buckets expire after 24 hours, and per-IP limiting remains process-local until horizontal deployment.
7. **Deletion/retention:** disable rather than hard-delete Admins; explicit restrictive/cascading actions as above; security history retained for terminal session time plus 30 days.
8. **Migration:** additive nine-table migration, named custom CHECK/partial-index SQL, reference-data insert, explicit transaction review, and forward repair rather than rollback edits.

## Rejected alternatives

- Implicit Prisma many-to-many relations: insufficient control over assignments, naming, timestamps, indexes, and referential actions.
- `isSuperAdmin`/permission wildcard or JWT authorization claims: contradicts accepted explicit Backend RBAC authority.
- Case-insensitive database extension as an initial dependency: unnecessary when one canonical email value plus a CHECK/unique constraint satisfies Sprint 1.
- Sliding sessions: permits indefinite login and complicates retention; can be separately approved later.
- Reversible storage of normal password/CSRF/refresh credentials: violates the accepted security boundary.
- A generic polymorphic throttle table: loses foreign-key integrity and adds abstraction without another approved throttle subject.
- Prisma `partialIndexes` Preview feature: the permanent policy forbids experimental features without explicit owner approval; reviewed migration SQL is sufficient for the one required native invariant.
- Hard-delete cascades across security roots or indefinite history: respectively risk silent evidence loss and unbounded sensitive retention.

## Authoritative references reviewed

- [Prisma explicit many-to-many relations](https://www.prisma.io/docs/orm/prisma-schema/data-model/relations/many-to-many-relations)
- [Prisma indexes and partial-index Preview status](https://www.prisma.io/docs/orm/prisma-schema/data-model/indexes)
- [Prisma referential actions](https://www.prisma.io/docs/orm/prisma-schema/data-model/relations/referential-actions)
- [Prisma development migration workflow](https://www.prisma.io/docs/orm/prisma-migrate/workflows/development-and-production)
- [PostgreSQL 18 constraints](https://www.postgresql.org/docs/18/ddl-constraints.html)
- [PostgreSQL 18 locking and consistency](https://www.postgresql.org/docs/18/applevel-consistency.html)

A disposable candidate containing all nine mapped models, relations, composite keys, native types, indexes representable without Preview features, and explicit referential actions passed `prisma validate` with the repository's installed Prisma CLI `7.10.0`. The probe was removed; the live `schema.prisma` and generated client were not changed.

# Database Architecture

## Decision

The planned system uses PostgreSQL with Prisma ORM. Relational constraints, joins, mature transactional semantics, and consistency across catalog, inventory, identity, and orders motivate PostgreSQL. Prisma provides typed data access and reviewed migrations while preserving the need to understand generated SQL and query behavior.

The API now owns a minimal model-free Prisma 7.10.0 configuration and generated-client boundary. No application model or migration exists yet. The owner-approved Admin authentication model and migration design is recorded in the [S1-T02 schema proposal](../work/sprint-01/s1-t02-schema-proposal.md); S1-T03 owns its separately approved implementation. The canonical generation and migration-review process is defined in [Prisma Development and Migration Workflow](../development/prisma.md).

Local development uses the exact official `postgres:18.6-alpine3.24` image through the root Docker Compose configuration. Development and test databases are isolated as `automotive_dev` and `automotive_test`; their lifecycle and guarded reset contract are defined in [Local PostgreSQL Development](../development/local-postgresql.md). This local configuration does not decide production hosting, credentials, backup, or recovery.

## Initial conceptual entities

- Admin identity/access: `AdminUser`, `Role`, `Permission`, plus explicit many-to-many assignments. `SUPER_ADMIN` is a Role, not a boolean shortcut.
- Admin authentication uses separate accepted concepts:
  - `AuthSession` represents one browser/device login and conceptually contains `id`, `adminUserId`, a hash of its random session-bound CSRF token, `createdAt`, `expiresAt`, `revokedAt`, and `lastUsedAt`.
  - `RefreshToken` belongs to an `AuthSession` and represents one credential in its rotating history/family. It conceptually contains `id`, `sessionId`, the SHA-256 token hash, `createdAt`, `expiresAt`, `rotatedAt`, `revokedAt`, and `replacedByTokenId`. The current token also needs bounded AES-256-GCM recovery-envelope metadata (ciphertext, unique nonce, authentication tag, key ID, and expiry) that becomes unusable after the accepted ten-second grace window.
- Catalog: `Product`, `ProductImage`, `Category`, `Brand`.
- Fitment: `VehicleBrand`, `VehicleModel`, `VehicleTrim`, `ProductVehicleCompatibility`.
- Stock: `Inventory`.
- Commerce: `Customer`, `Address`, `Order`, `OrderItem`.

`AdminUser`, `AuthSession`, and `RefreshToken` separation and the fields above are accepted conceptual architecture: refresh credentials rotate while a logical session continues, enabling history, idempotent encrypted grace recovery, replay detection, logout, session revocation, and auditing. The accepted S1-T02 contract uses explicit `AdminUserRole`/`RolePermission` joins, durable HMAC-keyed login and per-session refresh throttle buckets, fixed absolute session expiry, a same-session linear refresh chain, a migration-managed unique partial current-token index, explicit referential actions/CHECK constraints, and terminal security-history retention of 30 days. Per-IP state may remain process-local only while deployment is single-instance.

The detailed field types, nullability, constraints, indexes, lifecycle, cleanup, and initial migration plan are canonical in the [S1-T02 schema proposal](../work/sprint-01/s1-t02-schema-proposal.md). They are approved design, not implementation evidence: `schema.prisma`, migration SQL, database objects, generated client, and runtime persistence remain unchanged until S1-T03.

`AdminUser` and `Customer` are independent business identity models unless a future decision changes that boundary. Other entities are discovery inputs, not approved tables. Product variants, SKU ownership, category hierarchy/cardinality, exact vehicle compatibility, inventory location/reservation, pricing history, order snapshots, names, identifiers, deletion behavior, timestamps, and audit fields remain Open or Deferred until their feature/schema planning stage.

## Design principles

Model business invariants with database constraints where practical, not application checks alone. Define nullability, uniqueness, foreign keys, indexes, precision, time zones, and delete policies intentionally. Preserve transaction-time facts on orders rather than relying on mutable catalog records. Avoid N+1 access and verify query plans for important paths.

Every migration requires review for data loss, locking, deployment compatibility, rollback/forward-recovery, backfills, and indexes before application. Raw SQL is acceptable only when justified, reviewed, parameterized, and tested. Production data access, backup/restore, retention, privacy, and zero-downtime migration strategy are open operational decisions.

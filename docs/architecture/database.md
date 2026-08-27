# Database Architecture

## Decision

The planned system uses PostgreSQL with Prisma ORM. Relational constraints, joins, mature transactional semantics, and consistency across catalog, inventory, identity, and orders motivate PostgreSQL. Prisma provides typed data access and reviewed migrations while preserving the need to understand generated SQL and query behavior.

No Prisma schema or migration exists yet. A feature-specific ERD and schema review must precede the relevant implementation sprint.

## Initial conceptual entities

- Admin identity/access: `AdminUser`, `Role`, `Permission`, plus explicit many-to-many assignments. `SUPER_ADMIN` is a Role, not a boolean shortcut.
- Admin authentication uses separate accepted concepts:
  - `AuthSession` represents one browser/device login and conceptually contains `id`, `adminUserId`, `createdAt`, `expiresAt`, `revokedAt`, and `lastUsedAt`.
  - `RefreshToken` belongs to an `AuthSession` and represents one credential in its rotating history/family. It conceptually contains `id`, `sessionId`, `tokenHash`, `createdAt`, `expiresAt`, `rotatedAt`, `revokedAt`, and `replacedByTokenId`.
- Catalog: `Product`, `ProductImage`, `Category`, `Brand`.
- Fitment: `VehicleBrand`, `VehicleModel`, `VehicleTrim`, `ProductVehicleCompatibility`.
- Stock: `Inventory`.
- Commerce: `Customer`, `Address`, `Order`, `OrderItem`.

`AdminUser`, `AuthSession`, and `RefreshToken` separation and the fields above are accepted conceptual architecture: refresh credentials rotate while a logical session continues, enabling history, concurrency grace, replay detection, logout, session revocation, and auditing. They are not a final Prisma model. Constraints, indexes, relations, nullability, deletion policies, retention, and migrations remain Open until an explicitly approved schema task.

`AdminUser` and `Customer` are independent business identity models unless a future decision changes that boundary. Other entities are discovery inputs, not approved tables. Product variants, SKU ownership, category hierarchy/cardinality, exact vehicle compatibility, inventory location/reservation, pricing history, order snapshots, names, identifiers, deletion behavior, timestamps, and audit fields remain Open or Deferred until their feature/schema planning stage.

## Design principles

Model business invariants with database constraints where practical, not application checks alone. Define nullability, uniqueness, foreign keys, indexes, precision, time zones, and delete policies intentionally. Preserve transaction-time facts on orders rather than relying on mutable catalog records. Avoid N+1 access and verify query plans for important paths.

Every migration requires review for data loss, locking, deployment compatibility, rollback/forward-recovery, backfills, and indexes before application. Raw SQL is acceptable only when justified, reviewed, parameterized, and tested. Production data access, backup/restore, retention, privacy, and zero-downtime migration strategy are open operational decisions.

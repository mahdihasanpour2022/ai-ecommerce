# S2-T02 Clothing Catalog Schema and Migration Proposal

**Status:** Implemented and PostgreSQL-verified by S2-T03

**Owner approval:** 2026-09-03

**Implementation boundary:** This document remains the canonical approved design implemented by S2-T03. The live Prisma schema, reviewed catalog migration, and executable persistence tests are the implementation evidence; later runtime catalog contracts remain separately scoped.

## Design summary

Add seven catalog models to the existing API-owned PostgreSQL/Prisma schema:

1. `Category`
2. `Product`
3. `ProductVariant`
4. `Inventory`
5. `ProductImage`
6. `ProductImageCleanup`
7. `PriceDisplaySetting`

Add three PostgreSQL-backed enums: `ProductStatus`, `ProductImageMediaType`, and `PriceDisplayUnit`. Extend only existing `Role`/`Permission` reference data by registering the five accepted catalog permissions and explicitly granting them to the existing `SUPER_ADMIN` Role.

The design keeps immutable UUID identities, `timestamptz(3)` timestamps, explicit snake-case mappings, named constraints/indexes, and explicit referential actions established in Sprint 1. It introduces no Brand, generic attributes/EAV, multi-category join, Variant image, inventory history/reservation, pricing history, generalized media/job/outbox, or future commerce entity.

## Compact ERD

```text
Category 0..1 ── parent of ── 0..* Category
Category 1    ── contains ─── 0..* Product
Product  1    ── owns ─────── 1..* ProductVariant
ProductVariant 1 ──────────── 1 Inventory
Product  1    ── owns ─────── 0..9 ProductImage

ProductImageCleanup            independent pending object-cleanup records
PriceDisplaySetting            exactly one row, fixed id = 1

Role * ── RolePermission ── * Permission
                             + five catalog Permission rows
```

`ProductVariant.inventory` is nullable in Prisma's object shape because the relation is owned by `Inventory.variantId`; a deferred database invariant requires the row to exist by transaction commit. Likewise, Prisma cannot express “at least one Variant” on the inverse collection, so a deferred database invariant enforces it.

## Proposed Prisma shape

The following is the exact intended logical Prisma addition. S2-T03 must generate a create-only migration and then apply the reviewed SQL customizations described later; this block is not an instruction to edit `schema.prisma` in S2-T02.

```prisma
enum ProductStatus {
  DRAFT
  ACTIVE
  ARCHIVED

  @@map("product_status")
}

enum ProductImageMediaType {
  WEBP
  JPEG
  PNG

  @@map("product_image_media_type")
}

enum PriceDisplayUnit {
  RIAL
  TOMAN

  @@map("price_display_unit")
}

model Category {
  id        String     @id(map: "categories_pkey") @default(uuid()) @db.Uuid
  name      String     @db.VarChar(120)
  nameKey   String     @map("name_key") @db.VarChar(256)
  parentId  String?    @map("parent_id") @db.Uuid
  createdAt DateTime   @default(now()) @map("created_at") @db.Timestamptz(3)
  updatedAt DateTime   @updatedAt @map("updated_at") @db.Timestamptz(3)
  parent    Category?  @relation("CategoryTree", fields: [parentId], references: [id], onDelete: Restrict, onUpdate: NoAction, map: "categories_parent_id_fkey")
  children  Category[] @relation("CategoryTree")
  products  Product[]

  @@unique([parentId, nameKey], map: "categories_parent_id_name_key_key")
  @@map("categories")
}

model Product {
  id           String          @id(map: "products_pkey") @default(uuid()) @db.Uuid
  name         String          @db.VarChar(200)
  description  String?         @db.Text
  categoryId   String          @map("category_id") @db.Uuid
  status       ProductStatus   @default(DRAFT)
  imageVersion Int             @default(1) @map("image_version")
  createdAt    DateTime        @default(now()) @map("created_at") @db.Timestamptz(3)
  updatedAt    DateTime        @updatedAt @map("updated_at") @db.Timestamptz(3)
  category     Category        @relation(fields: [categoryId], references: [id], onDelete: Restrict, onUpdate: NoAction, map: "products_category_id_fkey")
  variants     ProductVariant[]
  images       ProductImage[]

  @@index([updatedAt(sort: Desc), id(sort: Desc)], map: "products_updated_id_idx")
  @@index([categoryId, updatedAt(sort: Desc), id(sort: Desc)], map: "products_category_updated_id_idx")
  @@index([status, updatedAt(sort: Desc), id(sort: Desc)], map: "products_status_updated_id_idx")
  @@index([categoryId, status, updatedAt(sort: Desc), id(sort: Desc)], map: "products_category_status_updated_id_idx")
  @@index([status, createdAt(sort: Desc), id(sort: Desc)], map: "products_status_created_id_idx")
  @@index([categoryId, status, createdAt(sort: Desc), id(sort: Desc)], map: "products_category_status_created_id_idx")
  @@map("products")
}

model ProductVariant {
  id        String     @id(map: "product_variants_pkey") @default(uuid()) @db.Uuid
  productId String     @map("product_id") @db.Uuid
  sku       String     @unique(map: "product_variants_sku_key") @db.VarChar(64)
  size      String?    @db.VarChar(80)
  sizeKey   String?    @map("size_key") @db.VarChar(160)
  color     String?    @db.VarChar(80)
  colorKey  String?    @map("color_key") @db.VarChar(160)
  priceRial BigInt     @map("price_rial") @db.BigInt
  isActive  Boolean    @default(true) @map("is_active")
  createdAt DateTime   @default(now()) @map("created_at") @db.Timestamptz(3)
  updatedAt DateTime   @updatedAt @map("updated_at") @db.Timestamptz(3)
  product   Product    @relation(fields: [productId], references: [id], onDelete: Restrict, onUpdate: NoAction, map: "product_variants_product_id_fkey")
  inventory Inventory?

  @@unique([productId, sizeKey, colorKey], map: "product_variants_product_size_color_key")
  @@index([productId, isActive, id], map: "product_variants_product_active_id_idx")
  @@map("product_variants")
}

model Inventory {
  variantId       String         @id(map: "inventories_pkey") @map("variant_id") @db.Uuid
  onHandQuantity  Int            @default(0) @map("on_hand_quantity")
  version         Int            @default(1)
  createdAt       DateTime       @default(now()) @map("created_at") @db.Timestamptz(3)
  updatedAt       DateTime       @updatedAt @map("updated_at") @db.Timestamptz(3)
  variant         ProductVariant @relation(fields: [variantId], references: [id], onDelete: Restrict, onUpdate: NoAction, map: "inventories_variant_id_fkey")

  @@map("inventories")
}

model ProductImage {
  id         String                @id(map: "product_images_pkey") @default(uuid()) @db.Uuid
  productId  String                @map("product_id") @db.Uuid
  storageKey String                @unique(map: "product_images_storage_key_key") @map("storage_key") @db.VarChar(512)
  mediaType  ProductImageMediaType @map("media_type")
  byteSize   Int                   @map("byte_size")
  width      Int
  height     Int
  position   Int                   @db.SmallInt
  createdAt  DateTime              @default(now()) @map("created_at") @db.Timestamptz(3)
  updatedAt  DateTime              @updatedAt @map("updated_at") @db.Timestamptz(3)
  product    Product               @relation(fields: [productId], references: [id], onDelete: Restrict, onUpdate: NoAction, map: "product_images_product_id_fkey")

  @@unique([productId, position], map: "product_images_product_id_position_key")
  @@map("product_images")
}

model ProductImageCleanup {
  id              String    @id(map: "product_image_cleanups_pkey") @default(uuid()) @db.Uuid
  storageKey      String    @unique(map: "product_image_cleanups_storage_key_key") @map("storage_key") @db.VarChar(512)
  attemptCount    Int       @default(0) @map("attempt_count")
  lastAttemptAt   DateTime? @map("last_attempt_at") @db.Timestamptz(3)
  lastFailureCode String?   @map("last_failure_code") @db.VarChar(64)
  createdAt       DateTime  @default(now()) @map("created_at") @db.Timestamptz(3)
  updatedAt       DateTime  @updatedAt @map("updated_at") @db.Timestamptz(3)

  @@index([createdAt, id], map: "product_image_cleanups_created_id_idx")
  @@map("product_image_cleanups")
}

model PriceDisplaySetting {
  id        Int              @id(map: "price_display_settings_pkey") @default(1) @db.SmallInt
  unit      PriceDisplayUnit @default(TOMAN)
  createdAt DateTime         @default(now()) @map("created_at") @db.Timestamptz(3)
  updatedAt DateTime         @updatedAt @map("updated_at") @db.Timestamptz(3)

  @@map("price_display_settings")
}
```

The existing `Permission` and `Role` Prisma models require no field or relationship change. Their existing `RolePermission` relation owns the new explicit grants.

## Field and normalization decisions

- All catalog entity IDs are Prisma-generated UUIDs. IDs and ownership foreign keys are never caller-generated or mutable through Sprint 2 contracts.
- Display fields are stored after the specification's NFKC/trim/whitespace normalization. `nameKey`, `sizeKey`, and `colorKey` store the deterministic locale-independent case-folded comparison form. They are persistence-only and never enter response DTOs.
- Key columns are wider than their display columns because Unicode case folding can expand text. PostgreSQL enforces presence, pairing, and uniqueness; application validation owns NFKC/case-fold derivation because PostgreSQL does not provide the accepted normalization algorithm as an immutable built-in suitable for a generated constraint.
- SKU itself is the canonical uppercase comparison/display value, so a second SKU key is unnecessary.
- `priceRial` uses PostgreSQL `bigint`; a CHECK caps it at JavaScript's maximum safe integer. Services convert it to a JSON number only after the cap is known and never round it.
- Inventory quantity/version and Product image version use PostgreSQL `integer`. Their positive/non-negative checks keep them inside the JSON-safe range automatically.
- Category `level` and Category paths are derived with a recursive query; storing a redundant depth/path would add synchronization risk and premature hierarchy machinery.
- `ProductImage` rows represent ready metadata only. Staging objects are storage-interface state, not public database rows. `ProductImageCleanup` contains only the generated key and bounded retry metadata required to identify post-commit cleanup; it deliberately has no generic payload, job type, Product relation, original filename, path, or exception text.
- `PriceDisplaySetting.id = 1` is the one accepted global row. No tenant/store/configuration abstraction is introduced.

## Declarative constraints and referential actions

S2-T03 must give every constraint below the stated stable name. Ordinary field shapes, relations, and indexes remain Prisma-declared; CHECK constraints and the SQL properties Prisma cannot express are reviewed migration SQL.

### CHECK constraints

| Name | Exact invariant |
| --- | --- |
| `categories_name_check` | `name` is trimmed and has 1–120 characters. |
| `categories_name_key_check` | `name_key` is trimmed, non-empty, and at most 256 characters. |
| `categories_timestamps_check` | `updated_at >= created_at`. |
| `products_name_check` | `name` is trimmed and has 1–200 characters. |
| `products_description_check` | `description` is null or trimmed and has 1–5,000 characters. HTML/plain-text policy remains application validation. |
| `products_image_version_check` | `image_version` is between 1 and 2,147,483,647. |
| `products_timestamps_check` | `updated_at >= created_at`. |
| `product_variants_sku_format_check` | `sku ~ '^[A-Z0-9][A-Z0-9_-]{0,63}$'`. |
| `product_variants_size_pair_check` | `size` and `size_key` are either both null or both trimmed, non-empty, and within 80/160 characters. |
| `product_variants_color_pair_check` | Same paired rule for `color` and `color_key`. |
| `product_variants_price_rial_check` | `price_rial > 0`, `price_rial % 10 = 0`, and `price_rial <= 9007199254740991`. |
| `product_variants_timestamps_check` | `updated_at >= created_at`. |
| `inventories_quantity_check` | `on_hand_quantity >= 0`. |
| `inventories_version_check` | `version` is between 1 and 2,147,483,647. |
| `inventories_timestamps_check` | `updated_at >= created_at`. |
| `product_images_storage_key_check` | `storage_key` is trimmed, non-empty, and at most 512 characters. Key/path safety remains storage-interface validation. |
| `product_images_byte_size_check` | `byte_size BETWEEN 1 AND 409599`, implementing strict `< 409600`. |
| `product_images_dimensions_check` | Width/height are each 1–8192 and `width::bigint * height::bigint <= 25000000`. |
| `product_images_position_check` | `position BETWEEN 0 AND 8`. |
| `product_images_timestamps_check` | `updated_at >= created_at`. |
| `product_image_cleanups_storage_key_check` | Cleanup key is trimmed, non-empty, and at most 512 characters. |
| `product_image_cleanups_attempt_check` | `attempt_count >= 0`; `last_attempt_at` is null exactly when count is zero; `last_failure_code`, when present, is trimmed/non-empty and requires an attempted cleanup. |
| `product_image_cleanups_timestamps_check` | `last_attempt_at`, when present, and `updated_at` are not before `created_at`. |
| `price_display_settings_singleton_check` | `id = 1`. |
| `price_display_settings_timestamps_check` | `updated_at >= created_at`. |

Insert triggers additionally require initial `Inventory.version = 1` and initial `Product.imageVersion = 1`. Update triggers reject Inventory version changes other than exactly `OLD.version + 1`, and reject Product image-version regression or jumps larger than one. Coupling one image mutation to exactly one image-version increment remains an explicit aggregate-transaction rule because a multi-row reorder/replacement cannot be correctly inferred from independent row triggers.

### Unique constraints/indexes

- `product_variants_sku_key`, `product_images_storage_key_key`, and `product_image_cleanups_storage_key_key` are ordinary unique indexes.
- Customize the generated `categories_parent_id_name_key_key` index as:

  ```sql
  CREATE UNIQUE INDEX "categories_parent_id_name_key_key"
  ON "categories" ("parent_id", "name_key") NULLS NOT DISTINCT;
  ```

  PostgreSQL therefore treats all null `parent_id` values as the same root sibling scope.
- Customize `product_variants_product_size_color_key` the same way with `NULLS NOT DISTINCT`, so `(null, null)` is one reserved default combination and one missing label cannot evade Product-local normalized uniqueness.
- Replace the generated Product Image position unique index with a unique table constraint named `product_images_product_id_position_key` that is `DEFERRABLE INITIALLY IMMEDIATE`. Image reorder/replacement transactions explicitly defer this constraint before changing positions, then rely on commit-time validation. This permits collision-free multi-row reordering without temporary out-of-range positions.

PostgreSQL 18 supports `NULLS NOT DISTINCT` unique indexes and deferrable unique constraints. Prisma 7.10 cannot express these SQL properties completely; following the established Sprint 1 partial-index pattern, they remain documented, migration-managed, and covered by real-PostgreSQL tests. No Preview feature is enabled.

### Foreign keys

| Child → parent | Delete / update | Reason |
| --- | --- | --- |
| `categories.parent_id → categories.id` | `RESTRICT / NO ACTION` | A Category with children is not deletable; no subtree cascade. |
| `products.category_id → categories.id` | `RESTRICT / NO ACTION` | Any Product lifecycle blocks Category deletion. |
| `product_variants.product_id → products.id` | `RESTRICT / NO ACTION` | No Product cascade or Variant hard-delete workflow. |
| `inventories.variant_id → product_variants.id` | `RESTRICT / NO ACTION` | Inventory is mandatory retained state, not silently cascaded. |
| `product_images.product_id → products.id` | `RESTRICT / NO ACTION` | Image removal must pass the storage/cleanup lifecycle. |

The cleanup and singleton tables intentionally have no foreign keys. Product hard delete and Variant hard delete are absent from the API; the restrictive graph makes accidental direct deletion fail until all deliberate child cleanup has occurred.

## Cross-row database invariants

### Category hierarchy trigger

Create `catalog_assert_category_tree()` and a `BEFORE INSERT OR UPDATE OR DELETE` row trigger on `categories`.

1. Acquire one catalog-owned transaction lock with `pg_advisory_xact_lock(1120002, 1)`. Category services acquire the same lock before reading validation state, so concurrent service and direct SQL hierarchy mutations serialize consistently.
2. On insert, reject when 1,000 Categories already exist.
3. On insert or a `parent_id` change, use recursive CTEs to read the proposed ancestor chain and the moved row's current subtree. Reject self/descendant parenting, any repeated ancestor, and `proposed level + subtree height - 1 > 6`.
4. Let the named foreign key reject a missing parent and the `NULLS NOT DISTINCT` unique index reject a sibling-name conflict.
5. On delete, the trigger only takes the structural lock; child/Product foreign keys enforce empty-leaf deletion.

Recursive CTEs use cycle-safe visited UUID arrays rather than assuming valid source data. At the accepted cap, serializing infrequent tree writes and scanning at most 1,000 rows is simpler and safer than storing depth/path, using a closure table, or relying on an isolation-level retry protocol.

### Deferred Product aggregate constraint

Create a shared helper `catalog_assert_product_integrity(product_uuid uuid)` and small `AFTER ROW` constraint-trigger wrappers on `products`, `product_variants`, `inventories`, and `product_images`. Each trigger is `DEFERRABLE INITIALLY DEFERRED` and validates the final transaction state for the affected Product at commit:

- an existing Product owns at least one retained Variant;
- every retained Variant owns exactly one Inventory row;
- active Variants do not mix default and named modes, and there is at most one active default Variant;
- an Active Product has a non-null valid description, at least one active Variant, Inventory for every active Variant, and a ready Image at position 0; and
- a Draft or Archived Product may have no ready Image and may have no active Variant, but still retains at least one Variant and one Inventory per Variant.

The helper first locks the still-existing Product row `FOR UPDATE`. This makes direct database writes use the same aggregate serialization boundary as services, so two transactions cannot each validate an incompatible partial view and both commit. Named row CHECKs and unique indexes remain the first line of enforcement. The deferred trigger exists only for accepted cross-row minimum-cardinality/activation/mode invariants and allows atomic Product creation and completeness-restoring mutations in any safe statement order inside one transaction.

### Deferred Image collection constraint

Create `catalog_assert_product_image_order()` as a `DEFERRABLE INITIALLY DEFERRED AFTER ROW` constraint trigger on Image insert/update/delete. For each affected Product's final state it requires:

- count is at most nine;
- either count is zero, or minimum position is zero and maximum position is `count - 1`; and
- positions are unique through the deferrable unique constraint.

This proves contiguous `0..n-1` ready metadata at commit. The Product aggregate trigger separately prevents an Active Product from ending without position 0.

### Version and ownership triggers

- `catalog_guard_inventory_version()` is a `BEFORE INSERT OR UPDATE` trigger: insert requires version 1; update forbids changing `variant_id` and requires `NEW.version = OLD.version + 1`.
- `catalog_guard_product_image_version()` is a `BEFORE INSERT OR UPDATE` trigger on Product: insert requires image version 1; update permits the same value or exactly `OLD.image_version + 1`, with the integer CHECK preventing overflow.
- `catalog_guard_price_display_singleton()` rejects deletion and `id` mutation of the fixed setting row. Together with the migration insert and `id = 1` CHECK/primary key, this preserves exactly one global setting.
- ProductVariant ownership and ProductImage ownership/storage/content identity are immutable in services. A narrow `BEFORE UPDATE` trigger rejects changes to `ProductVariant.product_id` and to ProductImage `product_id`, `storage_key`, `media_type`, `byte_size`, `width`, `height`, or `created_at`; reorder may change only position/update timestamp. Replacement therefore creates a new Image UUID as accepted.

Trigger failures use named constraints or stable trigger messages that repositories translate to the specification's domain errors; raw PostgreSQL text never reaches an HTTP response.

### Persistence failure mapping

| Database failure family | Contract mapping |
| --- | --- |
| Category parent/name unique violation | `CATEGORY_NAME_CONFLICT` |
| Category cycle/depth trigger | `CATEGORY_MOVE_INVALID` |
| Category cap trigger | `CATEGORY_LIMIT_REACHED` |
| Category child/Product restrictive foreign key on delete | `CATEGORY_NOT_EMPTY` |
| Global SKU unique violation | `SKU_CONFLICT` |
| Product-local size/color unique violation | `VARIANT_COMBINATION_CONFLICT` |
| Active-mode/last-active aggregate violation | `VARIANT_MODE_CONFLICT`, or `PRODUCT_ACTIVATION_INCOMPLETE` when the attempted operation is Product activation/completeness restoration |
| Price/SKU/label scalar CHECK | `VALIDATION_FAILED` after DTO validation has normally rejected it |
| Inventory guarded update affects zero rows | Bounded follow-up classification into not found or `INVENTORY_VERSION_CONFLICT` |
| Inventory quantity/version CHECK or trigger | `VALIDATION_FAILED` for invalid input; unexpected internal version misuse remains a safe server failure |
| Image position/count/order constraint | `PRODUCT_IMAGE_LIMIT_REACHED` or `PRODUCT_IMAGE_ORDER_CONFLICT`, classified from the requested operation and locked final state |
| Active main-Image aggregate violation | `PRODUCT_MAIN_IMAGE_REQUIRED` or `PRODUCT_ACTIVATION_INCOMPLETE` according to the attempted operation |
| Singleton or reference-data assertion during migration | Migration failure; never an HTTP response |

Repositories classify by known constraint/trigger identity plus operation context, not by matching localized PostgreSQL message text.

## Required transaction and locking rules

Database constraints are backstops, not replacements for domain-level error mapping and prechecks.

| Operation | Required bounded transaction behavior |
| --- | --- |
| Category create/rename/move/delete | Acquire `pg_advisory_xact_lock(1120002, 1)` first, then load/recheck the bounded tree and relevant Product references; perform one mutation and let FK/unique/trigger enforcement decide the final race. |
| Product creation | Verify/lock the Category, create the Draft Product, all non-empty initial Variants, and one Inventory per Variant atomically. Deferred aggregate checks run at commit. |
| Product patch/lifecycle | Lock Product `FOR UPDATE`; recheck Category and final Product/active Variant/Inventory/main Image state; apply only an accepted transition and final valid state. |
| Variant create/update/reactivate | Lock owning Product `FOR UPDATE`; reject Archived mutation; write Variant and, on create, Inventory in the same transaction; recheck active mode/completeness. Global SKU and Product-local combination indexes resolve cross-transaction races. |
| Inventory absolute set | Lock owning Product to exclude a concurrent archive transition, reject Archived state, then issue one `UPDATE inventories SET on_hand_quantity = ?, version = version + 1 ... WHERE variant_id = ? AND version = ? RETURNING ...`. Zero affected rows is distinguished by a bounded existence/current-version read into not-found versus `INVENTORY_VERSION_CONFLICT`; it is never retried automatically. |
| Image upload | Validate/stage/promote outside a database transaction. In the transaction, guard-update Product by expected `imageVersion`, lock/recheck lifecycle/count, append at count, and commit. On database failure, compensate the unreferenced promoted object. |
| Image reorder | Lock/guard-update Product by expected `imageVersion`, defer the position unique constraint, validate exact submitted membership, update every position, and commit once. |
| Image replacement/removal | Prepare any new object outside PostgreSQL. In one Product-locked/version-guarded transaction, insert the old generated key into cleanup state, replace/remove ready metadata, preserve/repack contiguous positions, and increment `imageVersion` exactly once. After commit, idempotently delete the old object; delete the cleanup row on success or update bounded retry metadata on failure. |
| Cleanup retry | Claim a small deterministic `(created_at, id)` batch, attempt idempotent external deletion outside the claim transaction, then delete success rows or increment attempts with an allowlisted failure code. No generic scheduler/outbox is introduced. |
| Display unit update | Update only fixed row `id = 1`; changing `unit` never reads or rewrites Variant price rows. |

All Product aggregate writes serialize on the Product row. External filesystem/decoder work is never performed while a database transaction is open.

## Reference data

Reserve stable UUIDs following the Sprint 1 reference range:

| UUID | Permission code |
| --- | --- |
| `00000000-0000-4000-8000-000000000003` | `catalog.read` |
| `00000000-0000-4000-8000-000000000004` | `catalog.manage` |
| `00000000-0000-4000-8000-000000000005` | `inventory.update` |
| `00000000-0000-4000-8000-000000000006` | `product.media.manage` |
| `00000000-0000-4000-8000-000000000007` | `settings.price.display.unit.update` |

The migration inserts Permission rows by fixed UUID/code with `ON CONFLICT (code) DO NOTHING`. A conflicting fixed UUID assigned to another code is an intentional migration failure, not silently overwritten. It then asserts the existing unique `SUPER_ADMIN` Role and all five Permission codes exist, and inserts grants through `INSERT ... SELECT ... ON CONFLICT (role_id, permission_id) DO NOTHING`. No Role, wildcard, boolean bypass, token claim, or non-Super-Admin grant is added.

Insert `price_display_settings(id, unit, created_at, updated_at)` as `(1, 'TOMAN', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)` and fail on unexpected conflicting singleton state. An applied Prisma migration is executed once; conflict handling makes only the reference inserts/grants safely repeatable during reviewed recovery, not the full DDL script manually rerunnable.

## Query and index map

| Approved access path | Index/strategy |
| --- | --- |
| Complete Category tree/path and move validation | Category cap bounds a set query/recursive CTE; PK plus `categories_parent_id_name_key_key` begins with `parent_id` and supports child traversal. |
| Category sibling conflict | `categories_parent_id_name_key_key NULLS NOT DISTINCT`. |
| Admin Product list, no filter / status / Category / both | The four `updated_at DESC, id DESC` Product indexes match the accepted combinations and deterministic order. |
| Public Active Product list, optional exact Category | The two `status, created_at DESC, id DESC` Product indexes match Active-only order, with/without leading Category. |
| Product detail and summary Variant aggregation | `product_variants_product_active_id_idx`; one set query for page Product IDs avoids N+1. The combination unique index also starts with `product_id`. |
| Inventory by Variant | Inventory primary key is `variant_id`; no second index. |
| Ordered/main Product Images | Unique `(product_id, position)` supports the whole ordered collection and position 0. |
| Image content by UUID | ProductImage primary key, then one Product lifecycle join; storage key remains server-only. |
| Oldest cleanup work | `(created_at, id)` supports deterministic bounded batches. |
| Display setting | Fixed primary key `id = 1`; no additional index. |
| Permission lookup/grants | Existing unique Permission code and existing RolePermission primary/reverse indexes; no new authorization index. |

Admin/public list execution uses one bounded Product page query, one bounded aggregate query for the returned Product IDs, and one main-image query rather than per-Product loading. Counts are separate set queries. Detail reads use set-based includes/selects and explicit safe DTO projection. The accepted contract returns all retained/active Variants for one Product and defines no owner-approved maximum Variant count; this proposal does not invent one. Query plans and observed cardinality are reviewed in S2-T09/S2-T10, and any future product-visible cap requires its normal planning decision.

No index is added for Product name/search, description, Image dimensions/media type, Inventory quantity, cleanup attempts/failure code, or setting unit because no approved query uses those columns as a leading lookup/order key.

## Migration sequence

S2-T03 should implement one additive migration, tentatively named `add_clothing_catalog_foundation`, against the approved disposable development database:

1. Add the three enums and seven Prisma models, then run the repository's create-only Prisma migration command.
2. Inspect the generated SQL before application; retain existing Sprint 1 tables, constraints, indexes, and rows unchanged.
3. Wrap the migration in explicit `BEGIN`/`COMMIT`, consistent with Sprint 1 and required because Prisma Migrate does not wrap PostgreSQL migrations by default.
4. Add all named CHECK constraints and customize the two `NULLS NOT DISTINCT` unique indexes and the deferrable Product Image position unique constraint.
5. Add explicit foreign keys and only the justified indexes above.
6. Add the narrow PL/pgSQL functions/triggers for hierarchy, deferred aggregate/Image invariants, version rules, and immutable ownership/content fields.
7. Insert/assert the singleton setting, five Permission rows, and five explicit `SUPER_ADMIN` grants.
8. Apply only after SQL review to disposable development/test databases, then run Prisma validation/generation, schema introspection, rollback-only constraint tests, concurrency tests, migration status, and relevant Sprint 1 regression gates.

### Risk and recovery analysis

- **Data loss/backfill:** none. All catalog tables/enums are new and initially empty; existing authentication/RBAC tables receive only additive reference rows. No existing column/table is dropped, renamed, rewritten, or made non-null.
- **Locks:** new-table/index/trigger DDL does not scan catalog data. Permission/grant inserts take ordinary short row/index locks on small existing reference tables. `CREATE INDEX CONCURRENTLY` is unnecessary and incompatible with the single migration transaction.
- **Compatibility:** the existing API can run while the additive migration is applied because it does not reference the new tables. The later catalog runtime deploy requires the migration first. Existing authentication permission resolution naturally includes the explicit new grants without changing token claims or Sprint 1 semantics.
- **Partial failure:** transactional PostgreSQL DDL/reference inserts roll back together. Trigger/function creation is inside the same transaction. S2-T03 must prove this on disposable databases rather than assume it.
- **Reference conflicts:** duplicate codes/grants are idempotent; mismatched fixed UUIDs, missing/duplicate `SUPER_ADMIN`, or an incompatible singleton row stop the migration for investigation.
- **Drift:** Prisma-inexpressible index/constraint/trigger properties are named, documented here, carried in reviewed migration SQL, and asserted by PostgreSQL tests. Future migrations must preserve them explicitly.
- **Forward recovery:** never edit an applied migration. Before production data exists, add a separately approved corrective migration for any defect. Production backup/restore, zero-downtime operations, hosting, and deployment policy remain release decisions.

## Database test design for S2-T03

Use an isolated `e_commerce_test` database, apply migrations from empty state, and run a rollback-only SQL invariant suite plus two-connection integration tests.

### Structure/reference tests

- Assert all seven tables, three enums, named CHECKs, foreign keys, triggers, functions, ordinary indexes, `NULLS NOT DISTINCT` definitions, and deferrable Image position constraint exist.
- Assert one `TOMAN` singleton row, all five Permission codes, and exactly one grant from each to `SUPER_ADMIN`; rerun only the reference DML inside a rollback transaction to prove conflict safety.
- Prove the pre-existing nine Sprint 1 tables, `admin.access`, `SUPER_ADMIN`, current-token partial index, and original grant remain unchanged.

### Constraint/referential tests

- Reject malformed/empty normalized fields, SKU formats, duplicate SKU, duplicate normalized sibling roots/non-roots, duplicate nullable size/color combinations, invalid/non-divisible/out-of-safe-range prices, negative quantity, invalid versions, oversized/zero Image bytes, invalid dimensions/pixels/positions, duplicate positions/keys, a second setting row, and malformed cleanup retry state.
- Accept same Category name under different parents and same size/color combination under different Products.
- Reject Category cycles, seventh-level creation, subtree overflow, and Category 1,001; accept a six-level valid tree/move.
- Reject deleting a Category with a child or any Product; verify no cascade. Reject deleting Product/Variant/Image through restrictive relationships until deliberately dismantled outside API semantics.
- Commit Product + Variant + Inventory atomically; reject a Product with no Variant, a Variant with no Inventory, mixed active default/named mode, an Active Product without description/main Image/active Variant, and loss of Active completeness. Accept Draft without Images and Active with zero quantity.
- Accept only contiguous Image collections from zero through eight, reject gaps/duplicates/tenth Image, and prove a deferred atomic reorder succeeds.
- Reject Inventory version skip/regression and Product image-version regression/jump; prove one guarded Inventory update increments exactly once.

### Concurrency/transaction tests

- With separate connections, race conflicting root/sibling Category creates and conflicting moves; prove one commits and no cycle, duplicate sibling, or depth overflow exists.
- Race global SKU and Product-local nullable-combination inserts; prove uniqueness chooses one winner.
- Race two Inventory updates from the same version; prove exactly one update succeeds and the stored quantity/version matches it.
- Race two Image mutations with one `imageVersion`; prove exactly one aggregate mutation commits and ready ordering remains contiguous.
- Force database failure after external promotion in a media test harness and verify compensation; force post-commit deletion failure and verify cleanup state remains retryable without exposing its key publicly. Runtime media failure-path ownership remains S2-T08.

The SQL suite rolls back its fixtures. Concurrency and media integration tests own explicit cleanup and never target `e_commerce_dev`.

## Minimum Sufficient Scope review

- **Missing:** Every accepted Category, Product/Variant, Inventory, rial price/display setting, Product Image/cleanup, permission, public-query, concurrency, migration, and test dependency maps to a field, constraint/index/trigger, transaction rule, or later implementation task. Prisma-inexpressible assumptions are explicit.
- **Over-planning:** No Brand, EAV, multi-category, Variant images, Product/Variant delete/history, slug/SEO/search/filter entity, exact public stock, discount/tax/price history, reservation/location/history, Cart/Order/Payment, additional Role, generalized cleanup job/outbox, production storage, or legacy identifier rename is introduced.
- **Placement:** S2-T02 contains proposal/documentation only. S2-T03 owns schema/migration/database tests; S2-T04–T09 own runtime contracts; S2-T10 owns final cross-slice verification. No future Sprint UI or commerce design is pulled forward.
- **Dependency:** Stable Product/Variant UUIDs, retained Variants, canonical rial price, restrictive catalog references, Product-owned ordered Images, and safe public indexes preserve known Sprint 3–6 dependencies without designing their UI, Cart, Order snapshots, Checkout, or Payment behavior.

## Validation record

- On 2026-09-03, `yarn db:status`, `yarn db:health`, and `yarn db:verify` passed: the repository PostgreSQL 18.6 container was healthy and `e_commerce_dev`/`e_commerce_test` were reachable and isolated. These checks did not mutate either database.
- Prisma 7.10.0 `migrate status` reported the one existing migration applied and both database schemas up to date. The status commands were read-only.
- The proposal was reconciled with the installed Prisma/Prisma Client 7.10.0 schema/configuration, the applied Sprint 1 migration source and rollback-only constraint suite, and the repository's Prisma/PostgreSQL workflow.
- Current Prisma documentation confirms custom PostgreSQL trigger SQL belongs in a reviewed create-only migration and PostgreSQL migrations are not transaction-wrapped by default. PostgreSQL 18 documentation confirms `NULLS NOT DISTINCT`, deferrable constraint triggers, recursive CTEs, and transaction-level advisory locks used by this proposal.
- Required coverage-marker, Minimum Sufficient Scope, local Markdown-target, trailing-whitespace, and `git diff --check` inspections passed.
- No Prisma schema/configuration, migration, application, database data, dependency, lockfile, environment, generated artifact, or OpenAPI file is changed by S2-T02.
- No proposed Prisma candidate was validated, migration was generated/applied, database invariant test was run, or application gate was run in this documentation-only task; those executable checks belong to S2-T03 after separate approvals.

## Authoritative technical references

- [Prisma — unsupported database features and customized migration SQL](https://www.prisma.io/docs/orm/prisma-migrate/workflows/unsupported-database-features)
- [Prisma — development and production migration workflow](https://www.prisma.io/docs/orm/prisma-migrate/workflows/development-and-production)
- [PostgreSQL 18 — unique indexes and null treatment](https://www.postgresql.org/docs/18/indexes-unique.html)
- [PostgreSQL 18 — `CREATE TRIGGER` and deferred constraint triggers](https://www.postgresql.org/docs/18/sql-createtrigger.html)
- [PostgreSQL 18 — recursive `WITH` queries](https://www.postgresql.org/docs/18/queries-with.html)
- [PostgreSQL 18 — advisory locking](https://www.postgresql.org/docs/18/explicit-locking.html)

## Owner approval boundary

The Owner approved this persistent model, its migration-owned constraints/indexes/triggers, reference data, and migration/test approach on 2026-09-03. S2-T03 implements this proposal only after its own separate implementation approval.

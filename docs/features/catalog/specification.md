# Clothing Catalog Specification

**Status:** Approved for Sprint 2 implementation; persistence, protected Category/Product/Variant/Inventory, and protected/public price-display-setting contracts implemented

## Required Context

- [Sprint 2 plan](../../sprints/sprint-02.md)
- [Backend Architecture](../../architecture/backend-architecture.md)
- [Database Architecture](../../architecture/database.md)
- [API Conventions](../../api/conventions.md)
- [Security Baseline — File and media safety](../../security/baseline.md#file-and-media-safety)
- [Authorization](../../security/authorization.md)
- [Backend Standards](../../standards/backend.md)
- [Testing Standards](../../standards/testing.md)

This specification owns observable clothing-catalog behavior. The Sprint plan owns timing and scope; architecture/security documents own implementation boundaries; the accepted S2-T02 design owns detailed persistence decisions. Later tasks should narrow this list to the exact sections their changes require.

## Purpose

Sprint 2 establishes the minimum persistent Backend contract needed for Sprint 3 Admin catalog management and Sprint 4 public catalog discovery. It models a Product as the customer-facing clothing root and a Product Variant as the exact sellable SKU. It does not implement either frontend or any Cart, Checkout, Order, Payment, production-storage, or generalized catalog platform behavior.

## Domain overview

```text
Category (parent -> children, maximum six levels)
  -> Product (exactly one Category; DRAFT | ACTIVE | ARCHIVED)
       -> ProductVariant (one or more; sellable SKU, price, active state)
            -> Inventory (exactly one; on-hand quantity and version)
       -> ProductImage (zero to nine; ordered, Product-owned)

PriceDisplaySetting (one global RIAL | TOMAN value)
```

Product/Variant UUIDs are stable catalog identities. A future Order Item may copy Variant ID, SKU, price, and descriptive facts into an immutable snapshot, but Sprint 2 creates no Order model or order-time behavior.

## Shared normalization and validation

- UUID route/body identifiers must be canonical valid UUIDs. Invalid identifiers fail validation rather than becoming database queries.
- Human-readable names/labels use Unicode NFKC normalization, trim surrounding whitespace, and collapse internal whitespace runs to one space unless the field is multiline description text.
- Case-insensitive uniqueness uses the normalized comparison value while preserving the normalized display value.
- Unknown request fields are rejected. Empty strings do not stand in for `null`.
- Lengths count Unicode code points after normalization:
  - Category name: 1–120.
  - Product name: 1–200.
  - Product description: 1–5,000 when present.
  - Variant size label: 1–80 when present.
  - Variant color label: 1–80 when present.
  - SKU: 1–64 ASCII characters matching `^[A-Z0-9][A-Z0-9_-]*$` after trim and uppercase normalization.
- Product and Category names may contain Persian or other required display text. HTML is not accepted as description content; descriptions are plain text.
- Canonical rial prices and Inventory quantities are JSON safe integers. Persistence may use a wider database integer, but DTOs must reject values outside JavaScript's safe-integer range rather than lose precision.
- All timestamps returned by protected contracts use ISO 8601 UTC strings. Public DTOs omit internal timestamps unless a later approved requirement needs them.

### Technical choice rationale

- The field bounds are deliberately generous for Persian clothing content while bounding validation, storage, logging, and response work. Changing a bound later is additive policy work, not a schema/domain redesign.
- Page-based pagination is the simplest correct MVP contract at the known scale. Fixed timestamp-plus-UUID ordering makes it deterministic; Sprint 4 may add allowlisted sorts without breaking this baseline.
- The 1,000-Category cap bounds the owner-approved complete-tree response. It is an application/catalog limit, not a generic hierarchy platform decision, and may be raised through later evidence-based planning.
- Immutable Image UUID/content identity supports safe caching; replacement creates a new identity rather than serving new bytes from a stale URL.
- Retaining inactive Variants avoids premature deletion/history rules while stable Variant UUID and canonical price make later Cart validation and Order snapshots possible.
- Product-specific cleanup state is required because file storage and PostgreSQL cannot share one atomic transaction. It addresses the known Product Image lifecycle without introducing a generalized outbox, queue, or media system.

## Category

### State and invariants

- Category has immutable UUID `id`, required normalized `name`, nullable `parentId`, and implementation timestamps.
- `parentId = null` identifies a root. Any non-null parent must exist.
- The root is level 1 and the maximum allowed level is 6.
- Normalized names are case-insensitively unique among siblings. Root Categories share one sibling scope. The same name may appear under different parents.
- Category has no Sprint 2 publication/archive workflow. Public Category retrieval returns the complete accepted tree, including empty Categories.
- Each Product references exactly one Category. Moving a Category or ancestor never changes Product membership.

### Create, rename, and move

- Creation validates the resulting level and sibling-name uniqueness atomically.
- Renaming rejects a normalized sibling-name collision.
- Moving a Category moves its entire subtree. The operation locks/rechecks the affected Category and required ancestry/subtree state within one bounded transaction.
- A move is rejected if the target is the Category itself, a descendant, missing, would place any subtree node beyond level 6, or creates a target sibling-name collision.
- Concurrent moves/renames must not commit a cycle, excessive depth, or duplicate normalized sibling name; the schema proposal must define the database constraints/locking needed to make service checks race-safe.

### Delete

- Only an empty leaf Category may be hard-deleted.
- Any direct child or any Product reference—including Draft or Archived Products—returns a conflict.
- Deletion never cascades to a child Category or Product. Callers must move Products/children explicitly first.

## Product

### Fields and lifecycle

- Product has immutable UUID `id`, normalized `name`, nullable normalized plain-text `description`, required `categoryId`, lifecycle `status`, and implementation timestamps.
- Product creation requires name, Category, and at least one Variant in one atomic operation. New Products always begin `DRAFT`; clients cannot create them directly as Active or Archived.
- `DRAFT` is editable and neither public nor purchasable.
- `ACTIVE` is publicly retrievable. Only its active Variants are returned publicly.
- `ARCHIVED` is retained, immutable except for transition back to Draft, and neither public nor purchasable.
- Allowed transitions are Draft to/from Active, Draft or Active to Archived, and Archived to Draft. Other transitions return a conflict.
- Sprint 2 has no Product hard-delete contract.

### Activation and continued validity

Activation is atomic and requires:

- non-empty valid name and description;
- an existing Category;
- exactly one ready main Product Image at position 0;
- at least one active valid Variant; and
- every active Variant to satisfy SKU, mode, price, and Inventory invariants.

An Active Product cannot be mutated into an invalid Active state. Removing/replacing its main image, deactivating its last active Variant, changing Variant mode, or otherwise breaking activation completeness requires an atomic valid replacement or a prior/same-transaction transition to Draft. Zero Inventory is valid and changes only availability, not Product lifecycle.

## Product Variant

### Fields and ownership

- Product Variant has immutable UUID `id`, required `productId`, globally unique normalized `sku`, nullable normalized `size`, nullable normalized `color`, required positive `priceRial`, boolean `isActive`, and implementation timestamps.
- Variant owns the exact sellable identity, price, active state, and its one-to-one Inventory record.
- SKU remains globally unique across active and inactive Variants. Reusing an inactive Variant's SKU for another row is forbidden.
- `priceRial` is an integer greater than zero and exactly divisible by 10. Invalid prices are rejected; the Backend never rounds.
- Size/color combination uniqueness is case-insensitive within one Product after normalization. Two null labels represent the default unnamed combination.

### Default and named modes

- A default unnamed Variant has `size = null` and `color = null`.
- A named/selectable Variant has at least one non-null size or color label.
- Active Variants of one Product operate in exactly one mode: either one active default unnamed Variant or one or more active named Variants, never both.
- Inactive retained Variants do not participate in the Product's current selectable mode, but their SKU and normalized size/color combination remain reserved. Reusing the retained row through update/reactivation is required instead of creating a duplicate identity.
- Every Product retains at least one Variant row. An Active Product retains at least one active Variant.
- Sprint 2 exposes no Variant hard-delete contract. Variants are deactivated and retained, preserving a stable future reference boundary without adding Variant history/audit models.

### Mutation behavior

- Product creation creates all initial Variants and their Inventory rows atomically.
- Adding/updating/reactivating a Variant rejects global SKU conflicts, within-Product combination conflicts, mixed active default/named mode, and any operation that leaves an Active Product without an active Variant.
- An Archived Product must first return to Draft before Product, Variant, Inventory, or Image mutation.
- Variant SKU, labels, price, and active state may be updated while preserving its immutable UUID. Future Order Item snapshots, not mutable catalog fields, will own historical purchase facts.

## Pricing and display setting

### Canonical price

- The only persisted/wire monetary value in Sprint 2 catalog contracts is `priceRial`.
- Backend protected/public Product/Variant DTOs accept or return `priceRial` regardless of the display setting.
- `priceRial` is a required positive safe integer divisible by 10.
- Sprint 2 does not model sale price, compare-at price, discount, tax, exchange rate, multi-currency, price history, or order totals.

### Global display/input unit

- Exactly one global setting has value `RIAL` or `TOMAN`; initial value is `TOMAN`.
- Public and protected reads return `{ "unit": "RIAL" | "TOMAN" }`.
- Only a caller with `settings.price.display.unit.update` may update it, and the state-changing request requires valid session CSRF.
- The Admin frontend later interprets Toman input as a positive integer and multiplies by 10 before submitting canonical `priceRial`. Toman display divides `priceRial` by 10 exactly.
- Setting changes affect display/input only. They do not update Product Variant rows, change public price values, or affect Backend/payment calculations.
- A later payment provider begins with canonical rial values and may convert only at its approved provider boundary.

## Inventory

### State and availability

- Every Variant has exactly one Inventory record created in the same transaction, with non-negative integer `onHandQuantity` and positive integer `version` initially equal to 1.
- Initial quantity defaults to 0; Product creation may provide a valid non-negative initial value.
- Sprint 2 `availableQuantity` equals `onHandQuantity`; no reserved quantity is persisted.
- A Variant is publicly available only when Product is Active, Variant is active, and on-hand quantity is greater than zero.
- Protected catalog reads include exact `onHandQuantity` and `version`. Public DTOs expose boolean `isAvailable` only.

### Update and concurrency

- The protected update is an absolute set operation with required `onHandQuantity` and last-read `version`.
- The service performs one guarded atomic update that matches Variant Inventory and expected version, rejects negative/out-of-range quantity, and increments version exactly once.
- A missing Variant/Inventory returns not found. A stale version returns `409 INVENTORY_VERSION_CONFLICT` with the current value omitted; the caller must refetch before retrying.
- The Backend does not automatically retry a stale write and does not use last-write-wins behavior.
- Multi-location stock, reservations, adjustment/event history, allocation, distributed locking, Redis, and Checkout decrement/release semantics are outside Sprint 2. Later purchase mutations may add guarded atomic decrement/reservation behavior without changing on-hand ownership.

## Product Images

Implementation status: the protected upload, reorder, immutable-identity replacement, eligible removal and content routes, the Active-only public content route, strict static-image validation, development/test local storage, and durable cleanup retry described below are implemented. Production storage remains deliberately unavailable pending a separately approved provider.

### Ready image model

- A ready Product Image has immutable UUID, Product ownership, generated opaque storage key, detected media type, byte size, decoded width/height, integer position, and implementation timestamps.
- Product owns a positive `imageVersion` concurrency token for its ready-image collection. Every successful upload, reorder, replacement, or removal increments it exactly once.
- Ready positions are Product-unique and contiguous from 0. Position 0 is the single main image. A Product has at most nine ready images.
- Image bytes are immutable for an image UUID. Replacement creates a new image UUID/storage key and atomically takes the old position, preventing stale public caches from serving replaced content.
- Draft may have zero ready images. Active requires position 0 and cannot lose it without atomic replacement/reorder or transition to Draft.
- Variant-level ownership, captions/galleries beyond ordering, video, transformation, DAM, and production delivery topology are excluded.

### Upload validation

- Multipart upload contains exactly one file; unexpected fields/files are rejected.
- Raw file size is greater than zero and strictly less than 409,600 bytes.
- Allowed declared and detected types are static WebP (`image/webp`), JPEG/JPG (`image/jpeg`), and PNG (`image/png`). Declared type, signature, and decoder result must agree.
- SVG, polyglot/undecodable content, animated/multipage images, malformed/truncated data, and files containing trailing executable/embedded payload inconsistent with the decoder are rejected.
- Decoded width and height must each be between 1 and 8,192 pixels and total pixel count must not exceed 25,000,000. These limits mitigate decompression/resource abuse without imposing a product-design aspect ratio or minimum resolution.
- The original filename is untrusted, is never used in a path/key, and need not be persisted. Generated keys use trusted random/UUID components and an allowlisted extension derived from detected content.

### Storage and compensation

- PostgreSQL stores metadata/keys, never image bytes. Development/test storage is an application-owned configured directory behind a Product Image-specific interface.
- Resolved filesystem targets must remain within the configured root. Symlink/path traversal, absolute paths, caller-supplied keys, and overwriting an existing key are forbidden.
- Upload first validates to an isolated staging key, then coordinates promotion and metadata visibility. A failed database/promotion step compensates by deleting staged/final unreferenced bytes where possible.
- Replacement/removal first makes the old object durably identifiable as pending cleanup while atomically publishing the new ready metadata/order or removing public metadata. Object deletion is idempotent; success clears the cleanup record.
- Failed post-commit cleanup is not exposed publicly, is logged without paths/payloads, and remains durably retryable by the next media maintenance/mutation operation. Sprint 2 adds only the narrow persistence/state needed for Product Image cleanup, not a generalized job/outbox/media platform.
- Production upload/configuration fails closed until an approved production object-storage implementation exists. Development/test local storage must never be inferred as a production default.

### Ordering and retrieval

- Upload appends at the next position; the first upload becomes position 0.
- Reorder submits every current ready image UUID exactly once in desired order with the last-read `imageVersion`. Missing, duplicate, foreign-Product, stale, or extra IDs reject the whole operation.
- Every Image mutation supplies the last-read `imageVersion`. Reorder and replacement preserve contiguous positions in one transaction; a stale version conflicts rather than partially applying or silently overwriting another Image mutation.
- Protected Product/Image reads require `catalog.read`; image mutations require `product.media.manage` and session CSRF.
- Public metadata/content retrieval succeeds only for ready images whose Product is Active. Protected retrieval may access ready Draft/Archived Product images.
- Public/protected content responses use detected allowlisted `Content-Type`, `X-Content-Type-Options: nosniff`, safe inline disposition without the original filename, and cache behavior appropriate to immutable image UUIDs. Missing, pending-cleanup, unsafe, or ineligible content returns a safe not-found/error without leaking keys or paths.

## Authorization

| Permission | Protected capability |
| --- | --- |
| `catalog.read` | Read Categories, Products, Variants, exact Inventory, Image metadata/content, and the setting through Admin contracts. |
| `catalog.manage` | Create/rename/move/delete eligible Categories and create/update/transition Products and Variants. |
| `inventory.update` | Set absolute Variant on-hand quantity using optimistic version. |
| `product.media.manage` | Upload, reorder, replace, and remove Product Images. |
| `settings.price.display.unit.update` | Change the global rial/toman display/input unit. |

- The migration registers all five Permission rows and explicitly grants each to the existing `SUPER_ADMIN` Role. There is no wildcard, Role-name bypass, or token permission claim.
- Sprint 1 current Admin/session/permission checks remain authoritative for every protected operation. Missing authentication returns the applicable stable `401`; authenticated insufficient permission returns `403 INSUFFICIENT_PERMISSION` and never triggers refresh.
- Every protected state-changing request requires accepted Origin/Fetch-Metadata/session-CSRF enforcement. Safe reads do not change state and do not require CSRF.
- Public contract groups below require no Admin authentication. They expose only explicitly allowed Active-catalog/display-setting fields.
- Sprint 2 creates no Role-management behavior and makes no non-Super-Admin grant decision.

## HTTP contract map

All routes use the `/api/v1` prefix, explicit DTOs, the standard error envelope, and exact Swagger/OpenAPI documentation in their implementation task. Names below are the stable resource contract; implementation may organize NestJS controllers/modules without changing paths or behavior.

### Protected Admin contracts

| Method and path | Permission | CSRF | Success behavior |
| --- | --- | --- | --- |
| `GET /api/v1/admin/catalog/categories` | `catalog.read` | No | Complete Category tree, bounded by the catalog Category cap. |
| `POST /api/v1/admin/catalog/categories` | `catalog.manage` | Yes | Create Category; `201` with Category DTO. |
| `PATCH /api/v1/admin/catalog/categories/{categoryId}` | `catalog.manage` | Yes | Rename and/or atomically move; `200` with Category DTO. |
| `DELETE /api/v1/admin/catalog/categories/{categoryId}` | `catalog.manage` | Yes | Delete eligible empty leaf; `204`. |
| `GET /api/v1/admin/catalog/products` | `catalog.read` | No | Page-bounded protected Product summaries. |
| `GET /api/v1/admin/catalog/products/{productId}` | `catalog.read` | No | Full protected Product, Variant, exact Inventory, and ready Image metadata. |
| `POST /api/v1/admin/catalog/products` | `catalog.manage` | Yes | Atomically create Draft Product, initial Variants, and Inventory; `201`. |
| `PATCH /api/v1/admin/catalog/products/{productId}` | `catalog.manage` | Yes | Update Product fields and/or perform one allowed lifecycle transition; `200`. |
| `POST /api/v1/admin/catalog/products/{productId}/variants` | `catalog.manage` | Yes | Create Variant plus Inventory; `201`. |
| `PATCH /api/v1/admin/catalog/variants/{variantId}` | `catalog.manage` | Yes | Update SKU/labels/price/active state; `200`. |
| `PUT /api/v1/admin/catalog/variants/{variantId}/inventory` | `inventory.update` | Yes | Guarded absolute quantity update; `200` with quantity/version. |
| `POST /api/v1/admin/catalog/products/{productId}/images` | `product.media.manage` | Yes | Validate/store/append one ready image; `201`. |
| `PUT /api/v1/admin/catalog/products/{productId}/images/order` | `product.media.manage` | Yes | Atomically reorder all current ready images; `200` with ordered metadata. |
| `POST /api/v1/admin/catalog/product-images/{imageId}/replacements` | `product.media.manage` | Yes | Create a replacement with a new immutable Image identity at the same position; `201`. |
| `DELETE /api/v1/admin/catalog/product-images/{imageId}` | `product.media.manage` | Yes | Remove eligible image metadata/order and schedule recoverable cleanup; `204`. |
| `GET /api/v1/admin/catalog/product-images/{imageId}/content` | `catalog.read` | No | Controlled ready image content for any Product lifecycle. |
| `GET /api/v1/admin/catalog/settings/price-display-unit` | `catalog.read` | No | Current global unit. |
| `PUT /api/v1/admin/catalog/settings/price-display-unit` | `settings.price.display.unit.update` | Yes | Replace global unit; `200`. |

Protected Product list uses `page` default 1 and `pageSize` default 25, maximum 100, ordered by `updatedAt DESC, id DESC`. It may filter by exact `categoryId` and lifecycle `status`; other filters/sorts are rejected in Sprint 2. Category tree creation is capped at 1,000 total Categories so its complete response remains bounded; exceeding the cap returns conflict.

### Protected mutation DTO boundaries

- Create Category JSON: required `name`; optional nullable `parentId`, default `null`.
- Patch Category JSON: optional `name` and optional nullable `parentId`; at least one field must be present. Supplying `parentId: null` moves it to the root.
- Create Product JSON: required `name`, `categoryId`, and non-empty `variants`; optional nullable `description`. Product status is server-owned `DRAFT`.
- Initial/Create Variant JSON: required `sku` and `priceRial`; optional nullable `size`/`color`; optional `isActive`, default `true`; optional `onHandQuantity`, default `0`.
- Patch Product JSON: optional `name`, nullable `description`, `categoryId`, and `status`; at least one field must be present. A lifecycle transition and completeness-restoring field updates may be submitted together for one atomic validation. Archived Product requests may contain only `status: "DRAFT"`.
- Patch Variant JSON: optional `sku`, nullable `size`/`color`, `priceRial`, and `isActive`; at least one field must be present.
- Put Inventory JSON: exactly `{ "onHandQuantity": <non-negative safe integer>, "version": <positive integer> }`.
- Product Image upload/replacement multipart: exactly one `file` plus required positive integer `imageVersion`; no caller position, filename, path, key, Product ownership, or media metadata is trusted.
- Product Image reorder JSON: exactly `{ "imageIds": [<UUID>], "imageVersion": <positive integer> }`; the array contains every current ready Image once and may be empty only for a Draft Product.
- Product Image delete uses required positive integer `imageVersion` as an explicit query parameter because a DELETE request body is not accepted.
- Put display setting JSON: exactly `{ "unit": "RIAL" | "TOMAN" }`.

Normalized values returned by successful mutations are authoritative. Validation rejects ambiguous mixed representations such as `price` plus `priceRial`, a Toman amount sent to a canonical Product contract, empty-string nullable labels, or caller-supplied lifecycle/storage fields.

### Minimum protected DTO boundaries

- Category: `id`, `name`, `parentId`, `level`, `children`; protected responses may include `createdAt`/`updatedAt`.
- Product summary: `id`, `name`, `category`, `status`, Variant count, active Variant count, main Image metadata if present, minimum/maximum `priceRial`, exact aggregate on-hand quantity, `createdAt`, `updatedAt`.
- Product detail: Product fields plus all retained Variants with `id`, `sku`, `size`, `color`, `priceRial`, `isActive`, Inventory `{ onHandQuantity, version }`; ordered ready Images; `imageVersion`; timestamps.
- Mutations return the smallest complete affected DTO needed for the Admin to update state without guessing. They never return persistence-only normalized keys, cleanup state, or storage paths/keys.

### Public contracts

Implementation status: the bounded public Category tree, Active Product summary list with exact-Category filtering, and Active Product detail projections below are implemented alongside the existing public Image content and price-display-setting reads.

| Method and path | Success behavior |
| --- | --- |
| `GET /api/v1/catalog/categories` | Complete six-level Category tree of at most 1,000 Categories. |
| `GET /api/v1/catalog/products` | Page-bounded deterministic Active Product summaries; optional exact `categoryId`. |
| `GET /api/v1/catalog/products/{productId}` | Active Product detail by UUID. |
| `GET /api/v1/catalog/product-images/{imageId}/content` | Controlled immutable ready image bytes only when owning Product is Active. |
| `GET /api/v1/catalog/settings/price-display-unit` | Current global `RIAL`/`TOMAN` unit. |

Public Product list uses `page` default 1 and `pageSize` default 24, maximum 60, ordered by `createdAt DESC, id DESC`. Only optional exact `categoryId` is accepted. Descendant-inclusive filtering, selectable sorting, search, and advanced filters are deferred.

Public pagination response:

```json
{
  "items": [],
  "page": 1,
  "pageSize": 24,
  "totalItems": 0,
  "totalPages": 0
}
```

Public Product summary contains:

- `id`, `name`;
- Category `{ id, name }`;
- main Image `{ id, url, width, height, mediaType }`;
- `minimumPriceRial`, `maximumPriceRial` across active Variants; and
- aggregate `isAvailable`, true when any active Variant has positive on-hand quantity.

Public Product detail contains summary fields plus plain-text `description`, Category path from root to assigned Category, all ordered ready Images, and all active Variants with `id`, nullable `size`/`color`, `priceRial`, and boolean `isAvailable`. It omits SKU, exact Inventory, optimistic version, lifecycle fields, timestamps, normalized comparison keys, cleanup/storage metadata, and inactive Variants.

Public requests for Draft/Archived Products, inactive/foreign Images, or unknown IDs return the same `404` resource-not-found boundary so lifecycle/existence is not disclosed. Public Category filtering by a valid but empty Category returns an empty page; unknown Category returns `404 CATEGORY_NOT_FOUND`.

## Stable failure semantics

All failures use the accepted top-level error envelope with safe Persian display text and the stable English code. Validation details may identify safe field names/reasons but never SQL, paths, keys, internal state, or existence that public filtering intentionally hides.

| Status | Stable code | Meaning |
| --- | --- | --- |
| `400` | `VALIDATION_FAILED` | Malformed UUID/query/body, unknown fields, invalid normalization/length/range, invalid price/SKU/Variant shape, or unsafe pagination. |
| `401` | Existing authentication code | Protected request lacks valid current authentication/session state. |
| `403` | `INSUFFICIENT_PERMISSION` | Authenticated Admin lacks the exact permission. |
| `403` | `CSRF_VALIDATION_FAILED` | Protected state-changing request fails accepted CSRF/origin policy. |
| `404` | `CATEGORY_NOT_FOUND` | Protected request or public exact filter references unavailable Category. |
| `404` | `PRODUCT_NOT_FOUND` | Protected Product is missing, or public Product is missing/ineligible. |
| `404` | `PRODUCT_VARIANT_NOT_FOUND` | Protected Variant is missing. |
| `404` | `PRODUCT_IMAGE_NOT_FOUND` | Protected Image is missing, or public Image is missing/ineligible. |
| `409` | `CATEGORY_NAME_CONFLICT` | Normalized sibling name already exists. |
| `409` | `CATEGORY_MOVE_INVALID` | Move creates a cycle, exceeds depth, or targets invalid hierarchy state. |
| `409` | `CATEGORY_NOT_EMPTY` | Category has children or any Product reference. |
| `409` | `CATEGORY_LIMIT_REACHED` | The bounded 1,000-Category catalog cap is reached. |
| `409` | `PRODUCT_LIFECYCLE_CONFLICT` | Transition is disallowed or Archived content is mutated before restoration. |
| `409` | `PRODUCT_ACTIVATION_INCOMPLETE` | Activation or Active-state mutation violates completeness. |
| `409` | `SKU_CONFLICT` | Normalized SKU is already owned by another Variant. |
| `409` | `VARIANT_COMBINATION_CONFLICT` | Normalized size/color combination already exists in the Product. |
| `409` | `VARIANT_MODE_CONFLICT` | Active default/named exclusivity or last-active-Variant invariant would fail. |
| `409` | `INVENTORY_VERSION_CONFLICT` | Expected optimistic version is stale. |
| `409` | `PRODUCT_IMAGE_LIMIT_REACHED` | Product already has nine ready images. |
| `409` | `PRODUCT_IMAGE_ORDER_CONFLICT` | Image collection version is stale or submitted membership/order is invalid. |
| `409` | `PRODUCT_MAIN_IMAGE_REQUIRED` | Operation would leave an Active Product without position zero. |
| `413` | `PRODUCT_IMAGE_TOO_LARGE` | Upload is not strictly below 409,600 bytes. |
| `415` | `PRODUCT_IMAGE_TYPE_UNSUPPORTED` | Declared/detected type is not an allowed matching static format. |
| `422` | `PRODUCT_IMAGE_CONTENT_INVALID` | Bytes are undecodable, malformed, animated/multipage, polyglot, or otherwise invalid. |
| `422` | `PRODUCT_IMAGE_DIMENSIONS_INVALID` | Decoded dimensions/pixel count exceed accepted bounds. |
| `503` | `PRODUCT_IMAGE_STORAGE_UNAVAILABLE` | Safe storage/compensation cannot complete; no false success is returned. |

Database uniqueness/concurrency violations must map to these domain errors rather than leak Prisma/PostgreSQL details. Unexpected failures return the existing safe server envelope and are logged with correlation context but without catalog payloads, paths, image bytes, or protected metadata.

## Transaction and consistency requirements

- Product creation atomically inserts Product, all initial Variants, and exactly one Inventory per Variant.
- Product activation and Active-state mutations lock/recheck Product, active Variants, Inventory existence, Category, and ready main Image as needed before commit.
- Category move/delete locks/rechecks the affected hierarchy and Product references; service prechecks alone are insufficient under concurrency.
- SKU, normalized Variant combination, normalized sibling Category name, Inventory non-negativity, Product Image position/count/version, and singleton setting integrity require database constraints/indexes where PostgreSQL can enforce them.
- Inventory update is one version-matched atomic mutation.
- Image metadata/order updates are atomic; external file operations never hold a database transaction open. Staging/compensation and durable cleanup state bridge that boundary.
- Public reads apply lifecycle/Variant/Image eligibility in the authoritative query/service, not only response filtering after loading protected rows.
- Important list/detail queries are bounded, deterministically ordered, avoid N+1 access, and receive only indexes justified by these known contracts.

The accepted and implemented S2-T02 design owns exact Prisma models, database constraint/index forms, isolation/locking, cleanup persistence shape, and migration SQL. Later tasks must preserve those decisions unless a separately approved change alters the accepted semantics above.

## Swagger / OpenAPI requirements

S2-T04 through S2-T09 must document within the same implementation task:

- exact method/path and operation summary;
- path/query parameters, defaults, maximums, enums, normalization, and multipart constraints;
- explicit request/response DTO schemas and pagination metadata;
- cookie authentication and permission descriptions for protected routes;
- CSRF header requirement for protected unsafe methods;
- success statuses and every applicable stable failure status/code;
- public-versus-protected field differences;
- canonical `priceRial` semantics and display-setting enum;
- upload byte/type/content/dimension rules; and
- representative safe examples without credentials, paths, storage keys, or internal fields.

Generated OpenAPI must match tested behavior before each HTTP task is Done. Production Swagger exposure remains unchanged and disabled.

## Testing requirements

Each implementation task owns its meaningful tests; S2-T10 verifies integration and gaps rather than retroactively supplying ordinary task coverage.

### Persistence

- Real PostgreSQL migration/constraint tests for referential actions, normalized uniqueness, singleton/reference data, non-negative Inventory, version behavior, price divisibility, Image positions/count/main representation, and any raw SQL constraint/index.
- Migration review for data loss, locks, compatibility, forward recovery, indexes, and explicit `SUPER_ADMIN` grants.

### Category

- Unit/integration/API coverage for create/rename/move/delete success, six levels, subtree overflow, self/descendant cycle, sibling conflict, referenced deletion, concurrency, authorization, CSRF, validation, stable errors, and exact OpenAPI.

### Product and Variant

- Unit/integration/API coverage for atomic create, required/default/named Variants, normalized SKU/combination conflicts, price rules, lifecycle transitions, activation completeness, last active Variant, Archived immutability, zero-stock visibility semantics, authorization, CSRF, stable errors, and OpenAPI.

### Inventory

- PostgreSQL/API concurrency coverage proving one matching version update succeeds, stale writes fail without overwrite, quantity never becomes negative, version increments once, exact Admin/public field separation, authorization/CSRF, stable errors, and OpenAPI.

### Product Images

- Validation tests with real representative signatures/decoding for all allowed formats and rejected SVG, mismatch, malformed, animated/multipage, oversized, excessive-dimension, traversal/filename, and duplicate/foreign-order cases.
- Integration/failure-path coverage for append/main behavior, nine-image cap, image-version increments/stale conflicts, atomic reorder/replacement/removal, Active main-image protection, staging/compensation, durable retryable cleanup, controlled public/protected retrieval, header safety, authorization/CSRF, redaction, and OpenAPI.

### Settings and public catalog

- Coverage for default Toman state, protected update, exact unit enum, permission/CSRF, unchanged canonical prices, safe public read, Active-only Product/Variant/Image filtering, exact-Category behavior, page bounds/order/tie-breaker, summary price range/availability, detail field allowlist, not-found equivalence, query behavior, and OpenAPI.

### Regression and completion

- Relevant Sprint 1 regression coverage proves current authentication, `401`/`403`, CSRF, permission resolution, disabled Admin behavior, and explicit `SUPER_ADMIN` grants continue to work.
- Relevant API typecheck/lint/build, Prisma validate/generate, migration/database validation, formatting, documentation links, generated-output/scope inspection, and security checks pass according to each task and the Sprint exit gate.

## Explicit deferrals

This specification does not approve Brand, multi-category membership, generic attributes/EAV, Variant images, Product/Variant deletion, final public slugs/URLs, SEO, selectable sorting, descendant-inclusive browsing, search, advanced filters, exact public stock, Admin/Storefront UI, image transformations, video, CDN/DAM, production object storage, multiple currencies, discounts/tax/history, multi-location/reservations/history, Cart, Checkout, Order, Payment, additional Roles, generalized audit/job infrastructure, BFF, Redis, microservices, or unrelated legacy identifier renaming.

Adding these requires the roadmap's later planning/approval path or a new explicit owner decision. Additive refactoring caused by genuinely new later requirements is acceptable; Sprint 2 must avoid breaking rework caused by contradicting the already accepted semantics above.

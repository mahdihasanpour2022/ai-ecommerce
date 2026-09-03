# Sprint 2: Clothing Catalog Domain & Persistence Foundation

**Status:** Planning — Awaiting Sprint Plan Approval

## Required Context

- [Project Roadmap](../roadmap.md#sprint-2--catalog-domain--persistence-foundation)
- [Product Requirements](../product/requirements.md)
- [Minimum Viable Product](../product/mvp.md)
- [Domain Glossary](../product/domain-glossary.md)
- [Backend Architecture](../architecture/backend-architecture.md)
- [Database Architecture](../architecture/database.md)
- [API Conventions](../api/conventions.md)
- [Security Baseline](../security/baseline.md)
- [Authorization](../security/authorization.md)
- [Backend Standards](../standards/backend.md)
- [Testing Standards](../standards/testing.md)

Task preparation after Sprint activation must narrow this list to the Minimum Sufficient Required Context for that task. No task-level context exists while this plan awaits approval.

## Goal

Deliver a reviewed, secure, and tested Backend foundation for a minimum clothing catalog: nested Categories, Product roots, sellable size/color Product Variants, canonical rial pricing with a global rial/toman display setting, Variant-owned inventory, and Product-owned images. The resulting persistence and explicit contracts must support Sprint 3 Admin workflows and Sprint 4 public discovery without pulling their user interfaces or later Cart, Checkout, Order, or Payment behavior into Sprint 2.

## Scope

### Domain specification and contracts

- Specify only the accepted Product, Product Variant, SKU, Category, lifecycle, price, inventory, Product Image, display-setting, permission, and minimum public-read behavior.
- Define explicit protected and public DTOs, validation, stable errors, bounded list behavior, authorization, transaction boundaries, and OpenAPI requirements before implementation.
- Preserve immutable Product/Variant identifiers and Variant-owned SKU/price/inventory so later Cart and Order flows can identify and snapshot the exact sellable item without implementing those future domains now.

### Persistence

- Produce a separately reviewable Prisma schema and migration proposal, including a compact ERD, cardinality, nullability, constraints, referential actions, justified indexes, lifecycle fields, transaction-sensitive invariants, and migration implications.
- After separate owner approval of that proposal, implement only the approved additive catalog schema and migration.
- Database-enforce integrity where practical and cover invariants that Prisma schema syntax alone cannot express with reviewed migration SQL and PostgreSQL tests.

### Protected Backend capabilities

- Manage the accepted nested Category hierarchy, including safe atomic moves and restrictive deletion.
- Create, retrieve, update, activate, archive, restore, and otherwise manage Products and their required Variants within the accepted lifecycle.
- Read exact Inventory and update absolute Variant on-hand quantity using optimistic concurrency.
- Upload, retrieve, atomically reorder, replace, and remove Product Images through the accepted secure storage lifecycle.
- Read and update the singleton rial/toman display/input setting without changing canonical prices.
- Register and enforce the accepted catalog, inventory, Product Image, and display-setting permissions through the existing Sprint 1 RBAC architecture.

### Public Backend capabilities

- Retrieve the complete bounded six-level Category tree.
- Retrieve a page-bounded, deterministic list of Active Products using explicit public summary DTOs and the accepted exact-Category filter.
- Retrieve Active Product detail by immutable Product UUID with Category path, ordered images, and active Variant price/availability data.
- Retrieve Product Image content through controlled identifiers/URLs without exposing filesystem paths or storage keys.
- Retrieve the global display unit without allowing it to affect canonical Backend price meaning.

### Quality and verification

- Keep Swagger/OpenAPI synchronized inside every task that creates or changes an HTTP contract.
- Add meaningful unit, PostgreSQL integration, API/e2e, authorization, validation, transaction/concurrency, media-security, and failure-path coverage as applicable to each behavior.
- Finish with cross-slice verification and relevant Sprint 1 authentication/authorization regression coverage; the final task is not a substitute for tests owned by earlier implementation tasks.

## Out of Scope

- Admin catalog, inventory, media, or settings UI; these belong to Sprint 3.
- Storefront listing/detail UI, gallery interaction, fallback presentation, enlargement, zoom, final URLs/slugs, SEO, selectable sorting, descendant-category browsing UX, text search, or advanced filtering; these belong to Sprint 4 or later approval.
- Multi-category Product membership.
- Brand management unless a future approved requirement establishes a concrete need.
- Generic attribute/EAV systems, arbitrary option frameworks, or speculative Variant abstractions beyond optional size/color labels and the default unnamed Variant.
- Variant-owned images, video, generalized media/DAM systems, transformation pipelines, CDN design, or production object-storage provisioning.
- Hard-delete Product contracts or cascading Category/Product deletion.
- Multiple currencies, exchange rates, discounts, promotions, tax, price history, or rewriting prices when the display unit changes.
- Multi-location inventory, reservations, allocation, adjustment history, Redis, distributed locking, warehouse management, Checkout stock decrement/release, or payment-failure stock behavior.
- Cart, Customer, Checkout, Address, Order, Order Item, Payment, fulfillment, or Admin Order Management models and behavior.
- Additional Roles, role-management UI, generalized enterprise RBAC, or the final non-Super-Admin permission matrix.
- Generalized audit frameworks, background-job infrastructure, specialized search infrastructure, BFF, microservices, or unrelated legacy technical-identifier renaming.
- Production deployment, provider selection, operational object storage, or Sprint 9 hardening.

## Dependencies

- Sprint 0 engineering, PostgreSQL/Prisma, NestJS, OpenAPI, environment, CI, and testing foundations are complete.
- Sprint 1 Admin authentication, session security, CSRF/CORS behavior, current-state RBAC enforcement, and explicit `SUPER_ADMIN` reference-data model are complete.
- The accepted direct browser-to-API Modular Monolith, PostgreSQL, Prisma, and OpenAPI architecture remains unchanged.
- Any persistence implementation requires the approved disposable PostgreSQL/Docker preflight and a separately approved Sprint 2 schema/migration proposal.

## Accepted Decisions

### Product, Variant, and identifiers

- Product owns name, description, exactly one Category, lifecycle, and Product Images.
- Product Variant is the sellable size/color combination and owns globally unique SKU, canonical price, active status, and Inventory.
- Every Product has at least one Variant. A Product uses either one default unnamed Variant or one or more named size/color Variants, never both.
- A named Variant has at least one normalized size or color label; normalized combinations are unique within the Product.
- Product and Variant use immutable opaque UUIDs. Final Storefront URL/slug strategy is deferred to Sprint 4.
- SKU is trimmed, uppercase-normalized, case-insensitively globally unique, and limited to letters, digits, hyphens, and underscores. Exact length bounds are specification/schema details.
- Generic attribute/EAV and speculative Variant systems are excluded.

### Product lifecycle and public eligibility

- Product lifecycle is `DRAFT`, `ACTIVE`, or `ARCHIVED`.
- Draft is editable and never public/purchasable. Active is public and exposes only active Variants. Archived is retained but not public/purchasable.
- Allowed transitions are Draft to/from Active, either state to Archived, and Archived to Draft for revalidation.
- Sprint 2 exposes no hard-delete Product contract.
- Product requires name and Category from creation; description and one main image are activation requirements.
- Active Product must retain at least one active valid Variant. Zero inventory does not hide or deactivate it; it remains visible as unavailable.

### Category

- Category uses immutable opaque UUID, required normalized name, and nullable self-referencing parent; `null` means root.
- Hierarchy depth is at most six levels. Normalized names are case-insensitively unique among siblings but may repeat under different parents.
- Atomic subtree moves reject self/descendant placement, excessive resulting depth, and target sibling-name conflicts. Products remain attached to the moved Category.
- Only an empty leaf may be deleted. Children or any Product, including Draft/Archived Products, block deletion. No deletion cascades to children or Products.
- Every Product belongs to exactly one Category; multi-category membership is Deferred.

### Pricing and display unit

- Variant price is a required positive integer rial value divisible by 10. Invalid values are rejected without rounding.
- Backend Product/Variant contracts always accept and return canonical `priceRial` independent of UI settings.
- A singleton `RIAL`/`TOMAN` display/input setting defaults to `TOMAN` and is read consistently by Admin and Storefront.
- `1 toman = 10 rials`. Toman input is converted to canonical rials before submission and Toman display divides canonical rials exactly.
- Changing the setting never rewrites stored prices. Later payment behavior starts with canonical rial values and performs provider-specific conversion only at the provider boundary.
- Multi-currency, exchange rates, discounts, tax, and price history are Deferred.

### Inventory

- Every Variant has exactly one Inventory record, created transactionally with the Variant and initialized to zero unless an approved initial quantity is supplied.
- Inventory stores database-constrained non-negative integer on-hand quantity and an optimistic version.
- Sprint 2 available quantity equals on-hand quantity. A Variant is available only when Product and Variant are Active and quantity is greater than zero.
- Protected reads expose exact quantity. Public reads expose availability only.
- Protected absolute-quantity updates require the last-read version and reject stale writes rather than silently overwrite.
- Multi-location, reservations, adjustment history, and purchase decrement/release behavior are Deferred.

### Product Images

- Images belong only to Product. A Product has positions zero through eight: position zero is its single main image and up to eight additional images follow contiguously.
- Draft may have no images; Active requires exactly one main image. Reorder is atomic, and an Active main image can be removed only by atomic replacement/reorder or after returning the Product to Draft.
- Each upload is strictly smaller than 400 KiB (409,600 bytes), content-verified and decodable WebP, JPEG/JPG, or PNG. Uploaded SVG is always forbidden. Conservative decoded pixel/dimension bounds are specification details.
- PostgreSQL stores generated keys and required metadata, never image binaries or trusted original filenames.
- Development/test use application-owned local filesystem storage through a narrow Product Image interface. Production upload remains disabled until later object-storage approval.
- Upload/replacement/deletion use recoverable staging or compensation; failed post-commit cleanup remains durably identifiable for retry without a generalized media/job platform.
- Public reads return ordered images only for Active Products. Authorized Admin reads may include Draft/Archived images.

### Authorization

- Sprint 2 registers `catalog.read`, `catalog.manage`, `inventory.update`, `product-media.manage`, and `settings.price-display-unit.update`.
- Protected operations remain Backend-enforced and default-deny. Public Active-catalog and display-setting reads use explicit safe DTOs and require no Admin permission.
- Existing `SUPER_ADMIN` receives explicit persisted grants for all five permissions; there is no wildcard or hard-coded authorization bypass.
- Sprint 2 adds no other Role or role-management workflow. Future staff Role composition is deferred to Sprint 3.

### Minimum public contracts

- Public Category retrieval returns the bounded six-level tree using immutable IDs and names.
- Public Product listing returns only Active Products, uses simple page-based bounded pagination and deterministic fixed ordering, and initially supports only an optional exact-Category filter.
- Product summaries contain Product ID, name, Category summary, main image, minimum/maximum active-Variant `priceRial`, and aggregate availability.
- Product detail uses Product UUID and returns description, Category path, ordered images, and active Variants with Variant ID, size/color, canonical price, and availability.
- Exact stock is never public. Image contracts never reveal filesystem paths/storage keys. Prisma rows are never serialized directly.
- Exact page bounds and fixed ordering are specification details. Final URLs/slugs, SEO, selectable sorting, descendant-inclusive browsing, search, and advanced filters remain Sprint 4 decisions.

## Remaining Open Decisions

No unresolved owner decision blocks Sprint 2 plan approval. The following are deliberately routed later and must not be silently pulled into Sprint 2:

- Sprint 3: non-Super-Admin Role composition, Admin workflow/UX, and any required catalog audit retention.
- Sprint 4: final public URLs/slugs, SEO, selectable sorting, descendant browsing presentation, text search, advanced filters, exact-stock presentation, and gallery/fallback interaction.
- Sprints 5–7: Cart identity, reservation/decrement/release semantics, Checkout/order snapshots beyond compatible identifiers/prices, and payment provider behavior.
- Sprint 9: production object storage/provider, deployment, operations, and integrated release hardening.

Exact field-length bounds, decoded-image limits, page caps, deterministic fixed ordering, error-code names, transaction implementation, justified indexes, and storage compensation mechanics are bounded technical details owned by S2-T01/S2-T02. They must remain within the accepted decisions above and cannot change product semantics without a new owner decision.

## Exit Criteria

- The accepted clothing catalog specification and explicit protected/public contracts are complete and consistent with this plan.
- The owner separately approved the documented Prisma schema/migration proposal before persistence implementation.
- Reviewed migrations implement only the approved Category, Product, Product Variant, Inventory, Product Image/storage-lifecycle, display-setting, and permission-reference scope.
- PostgreSQL constraints and transaction behavior enforce applicable UUID/cardinality, normalized uniqueness, six-level/cycle-safe Category behavior, Variant mode, SKU, price, Inventory, image count/order/main-image, and lifecycle invariants.
- Protected contracts enforce current Sprint 1 authentication, CSRF where state-changing, and exact accepted permissions with safe `401`/`403` behavior.
- Public contracts return only Active safe DTOs, never exact inventory, draft/archived data, Prisma rows, local paths, storage keys, or sensitive internals.
- Category, Product/Variant, Inventory, Product Image, display-setting, and public-read success/failure/concurrency behavior is implemented with stable errors and synchronized Swagger/OpenAPI.
- Product Image validation enforces the accepted byte/type/content/decoding policy and recoverable storage lifecycle; uploaded SVG and unsafe filenames/paths are rejected.
- Relevant unit, PostgreSQL integration, API/e2e, authorization, concurrency, failure-path, OpenAPI drift, and Sprint 1 regression tests pass with no skipped required database coverage.
- Relevant API and repository typecheck, lint, build, Prisma validation/generation, migration review, formatting, security inspection, and documentation validation pass according to actual task scope.
- No Admin/Storefront catalog UI, future commerce entities, speculative abstraction/infrastructure, unrelated dependency change, or unapproved schema/migration is introduced.
- The Backend is ready for Sprint 3 Admin catalog management and Sprint 4 Storefront discovery without a foreseeable breaking schema/domain/contract refactor caused by a known Sprint 2 shortcut.

## Ordered Task Queue

The canonical ordered queue is maintained in [Sprint 2 Queue](../work/sprint-02/queue.md). Every task is Queued; none is Current while this Sprint awaits plan approval.

## Approval State

Awaiting Sprint Plan Approval. This document does not authorize implementation, schema changes, migration generation/application, dependency changes, or task preparation.

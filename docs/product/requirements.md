# Product Requirements

Status labels prevent plans from being mistaken for commitments:

- **Known requirement:** explicitly required for the product direction.
- **Planned requirement:** expected but awaiting detailed specification or prioritization.
- **Open decision:** user approval or discovery is required.
- **Future consideration:** intentionally outside the near-term scope.

## Product domains

| Domain | Status | Current understanding |
| --- | --- | --- |
| Product catalog | Known requirement | Authorized staff manage products; customers browse listings and details. |
| Categories | Known requirement | Authorized staff manage self-referencing nested Categories to a maximum depth of six levels. Immutable UUID identifies each Category; normalized names are case-insensitively unique among siblings. Moves are atomic, preserve Product membership, and reject cycles, excessive resulting depth, and sibling-name conflicts. Only empty leaf Categories may be deleted, with no cascading child/Product deletion. Each Product belongs to exactly one Category; multi-category membership is Deferred. The hierarchy supports the example `shirts / men's shirts / formal shirts / French shirts`; final public slugs/URLs remain a Sprint 4 decision. |
| Clothing products and variants | Known requirement | Product owns name, description, Category, lifecycle, and Product Images. `ProductVariant` represents the sellable item/size-color combination and owns globally unique SKU, price, active status, and inventory. Product and Variant use immutable opaque UUID identifiers. Product requires name and Category at creation; description and one main image are required for activation. Every Product has at least one Variant and uses either one default unnamed Variant or named size/color Variants, never both. Named Variants require a size or color label, normalized combinations are Product-unique, and every Variant requires normalized globally unique SKU, integer-rial price, active status, and inventory. Product lifecycle is `DRAFT`, `ACTIVE`, or `ARCHIVED`; only Active Products and their active Variants are public, while zero inventory remains visible as unavailable. Sprint 2 has no hard-delete Product contract. Generic attribute/EAV systems and speculative variant abstractions are excluded; final Storefront slugs/URLs remain a Sprint 4 decision. |
| Product media | Known requirement | Images belong only to Product. A Product supports contiguous positions zero through eight: position zero is one main image and up to eight additional images follow. Draft may have none; Active requires a main image. Reordering is atomic. Uploads are strictly smaller than 400 KiB (409,600 bytes), content-verified and decodable WebP, JPEG/JPG, or PNG, and never SVG; conservative decoded limits are finalized in the implementation specification. PostgreSQL stores generated keys/metadata, while development/test use application-owned local storage behind a narrow interface and production upload remains disabled pending approved object storage. Replacement/deletion use recoverable compensation with failed cleanup durably retryable. Public reads expose only Active Product images; Admin may retrieve Draft/Archived images. |
| Inventory | Known requirement | Each Product Variant has exactly one transactionally created Inventory record with database-constrained non-negative integer on-hand quantity. Sprint 2 availability equals on-hand quantity, further gated by active Product and Variant state. Admin sees exact quantity; minimum public contracts expose availability only. Absolute Admin updates require the last-read optimistic version and reject stale writes. Multi-location stock, reservations, adjustment history, and Checkout decrement/release behavior are Deferred. |
| Pricing display | Known requirement | Every Variant price is a required positive integer rial value divisible by 10 and Backend catalog contracts always use canonical `priceRial`. A singleton global setting, defaulting to Toman, selects rial or toman display/input consistently across Admin and Storefront at `1 toman = 10 rials`; invalid values are rejected without rounding and setting changes never rewrite prices. Payment later starts from canonical rials and converts only at the provider boundary. Multi-currency, exchange rates, discounts, tax, and price history are Deferred. |
| Cart | Known requirement | Customers add, update, and remove purchasable products and see calculated totals. Persistence/identity strategy is open. |
| Customers | Known requirement | Checkout requires approved customer/contact and delivery information. Guest, authenticated, or both and any persistent account behavior are open. |
| Checkout | Known requirement | A valid cart becomes a server-validated persisted pending-payment order. Shipping, tax, address, identity, and idempotency details are open. |
| Payments | Known requirement | An external gateway is initiated and the Backend verifies the authoritative result. Provider and provider-specific flows are open. |
| Orders | Known requirement | Orders/order items preserve transaction-time facts, payment relationship, and minimum lifecycle; authorized Admins manage resulting orders. Exact lifecycle is open. |
| Admin users | Known requirement | Only authenticated and authorized staff may enter protected administration workflows. |
| Roles and permissions | Known requirement | Backend-enforced RBAC protects administrative operations. Sprint 2 uses the accepted five catalog/inventory/media/display-setting permissions with explicit `SUPER_ADMIN` grants; future non-Super-Admin Role composition remains open for Sprint 3. |

## Quality requirements

The Storefront prioritizes Persian RTL product discovery and purchase, SEO, accessibility, responsive design, performance, and Core Web Vitals. Admin prioritizes Persian RTL forms, tables, catalog/inventory/order workflows, authorization-aware UX, accessibility, and maintainability. The API must provide validated stable contracts, Persian user-display messages, stable English error codes, server-side authorization, transactional integrity, idempotency where required, and Backend-authoritative payment verification. A successful frontend redirect alone never proves payment success.

## Open decisions

Future non-Super-Admin catalog Role composition, cart persistence, guest/account checkout, checkout/address/shipping details, order snapshots/statuses, payment provider/verification/retry behavior, localization, search, audit retention, production operations, and legal/compliance requirements need feature-level decisions. Sprint 2's accepted permissions are `catalog.read`, `catalog.manage`, `inventory.update`, `product-media.manage`, and `settings.price-display-unit.update`, with explicit `SUPER_ADMIN` grants and no wildcard bypass.

## Future considerations

Advanced customer-account features, recommendations, advanced discounts/analytics, specialized search, complex fulfillment/shipping and returns/refunds, advanced media systems, BFF, Redis, event-driven integrations, and distributed services require explicit approval and evidence from real requirements or scale.

The implemented planning boundary for the minimum clothing catalog is canonical in the [Clothing Catalog specification](../features/catalog/specification.md).

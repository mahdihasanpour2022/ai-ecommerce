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
| Categories and brands | Known requirement | Products require discoverable classification and manufacturer/brand context. Exact hierarchy is open. |
| Automotive compatibility | Known requirement | Products may fit vehicle brands, models, and trims. Fitment rules and source quality are open decisions. |
| Product media | Known requirement | Products require approved images in Admin and Storefront. WebP, JPEG/JPG, and PNG uploads are allowed; SVG uploads are forbidden. Storage/lifecycle details are open. |
| Inventory | Known requirement | Track availability for administration, customer display, and purchase consistency. Reservation, decrement/release, and payment-failure behavior are open. |
| Cart | Known requirement | Customers add, update, and remove purchasable products and see calculated totals. Persistence/identity strategy is open. |
| Customers | Known requirement | Checkout requires approved customer/contact and delivery information. Guest, authenticated, or both and any persistent account behavior are open. |
| Checkout | Known requirement | A valid cart becomes a server-validated persisted pending-payment order. Shipping, tax, address, identity, and idempotency details are open. |
| Payments | Known requirement | An external gateway is initiated and the Backend verifies the authoritative result. Provider and provider-specific flows are open. |
| Orders | Known requirement | Orders/order items preserve transaction-time facts, payment relationship, and minimum lifecycle; authorized Admins manage resulting orders. Exact lifecycle is open. |
| Admin users | Known requirement | Only authenticated and authorized staff may enter protected administration workflows. |
| Roles and permissions | Known requirement | Backend-enforced RBAC protects administrative operations; the final matrix is open. |

## Quality requirements

The Storefront prioritizes Persian RTL product discovery and purchase, SEO, accessibility, responsive design, performance, and Core Web Vitals. Admin prioritizes Persian RTL forms, tables, catalog/inventory/order workflows, authorization-aware UX, accessibility, and maintainability. The API must provide validated stable contracts, Persian user-display messages, stable English error codes, server-side authorization, transactional integrity, idempotency where required, and Backend-authoritative payment verification. A successful frontend redirect alone never proves payment success.

## Open decisions

Catalog identifiers/lifecycle, category cardinality, variant modeling, fitment precision, inventory purchase semantics, pricing/currency/tax, media ownership/storage, cart persistence, guest/account checkout, checkout/address/shipping details, order snapshots/statuses, payment provider/verification/retry behavior, localization, search, audit retention, production operations, and legal/compliance requirements need feature-level decisions.

## Future considerations

Advanced customer-account features, recommendations, advanced discounts/analytics, specialized search, complex fulfillment/shipping and returns/refunds, advanced media systems, BFF, Redis, event-driven integrations, and distributed services require explicit approval and evidence from real requirements or scale.

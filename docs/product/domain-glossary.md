# Domain Glossary

| Term | Definition |
| --- | --- |
| Product | A customer-facing clothing catalog entry with an immutable opaque UUID that owns its name, description, Category, lifecycle, and Product Images. Name and Category are required at creation; description and one main image are required for activation. It is not itself the sellable SKU/inventory unit. |
| Product Variant | The sellable size/color combination with an immutable opaque UUID belonging to a Product. It owns globally unique SKU, integer-rial price, active status, and inventory. Every Product has at least one Variant and uses either one default unnamed Variant or named size/color Variants, never both. |
| SKU | A Product Variant-owned business identifier that is trimmed, uppercase-normalized, case-insensitively globally unique, and limited to letters, digits, hyphens, and underscores. Exact length limits are schema-proposal details. |
| Category | An immutable-UUID, self-referencing navigational grouping of clothing Products with a maximum six-level hierarchy. Names are normalized and sibling-unique. Moves preserve Product membership and reject cycles/depth/name conflicts; only empty leaves may be deleted. Each Product belongs to one Category and multi-category membership is Deferred. |
| Brand | An optional future commercial brand associated with a clothing Product; Brand management is not automatically part of the minimum Sprint 2 scope. |
| Inventory | The one-to-one stock state owned by a Product Variant, storing non-negative integer on-hand quantity and an optimistic version. Multi-location support is Deferred. |
| Available Quantity | For Sprint 2, the Variant's on-hand quantity. Public availability additionally requires an Active Product, active Variant, and quantity greater than zero; future reservation semantics may refine the calculation without redefining on-hand stock. |
| Reserved Quantity | Stock temporarily allocated to pending demand and therefore not freely available. Reservation triggers and expiry are open. |
| Display Unit | The singleton global `RIAL` or `TOMAN` Admin/Storefront display and Admin-input setting, defaulting to Toman. Canonical Backend prices remain positive integer rials divisible by 10; `1 toman = 10 rials`, and the setting never changes stored value or later payment arithmetic. |
| Product Lifecycle | `DRAFT`, `ACTIVE`, or `ARCHIVED`. Draft is not public/purchasable; Active is public and exposes only active Variants; Archived is retained but not public/purchasable. Zero inventory does not itself change lifecycle. |
| Product Image | A Product-owned ordered image. Position zero is the single main image and positions one through eight are optional additional images. Variant-level image ownership is excluded. |
| Customer | A person or organization purchasing or intending to purchase products. Guest-account behavior is open. |
| Admin User | A staff identity eligible for Admin Panel access, subject to status and permissions. It is independent from the Customer identity model. |
| Role | A named grouping of permissions assigned to an Admin User. |
| Permission | A granular authorization capability for a protected action or resource. |
| Order | A commercial record representing a customer's requested or completed purchase. Lifecycle is open. |
| Order Item | A line in an Order capturing the selected sellable item, quantity, and transaction-time commercial facts. |
| Authentication Session | One authenticated Admin browser/device session with independently revocable refresh capability. Its final persistence model is open. |

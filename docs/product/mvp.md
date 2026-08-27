# Minimum Viable Product

## Outcome

The Commerce MVP proves a secure production purchase path: an authorized Admin manages products, required images, inventory, and resulting orders; a customer discovers products, maintains a cart, checks out, creates an order, completes an external payment-gateway round trip, and sees the Backend-verified order/payment result.

Product discovery alone is a **Catalog Milestone**, not the final Commerce MVP.

## Included capabilities

1. Admin authentication, protected Admin workflows, and Backend-enforced authorization.
2. Minimum management of Categories, Brands, fitment data, inventory, Products, and approved Product Images.
3. Product creation, listing, viewing, and editing through Admin and stable documented Backend contracts.
4. PostgreSQL persistence with reviewed Prisma schemas/migrations for each approved feature slice.
5. Product images visible in Admin and Storefront; uploads allow WebP, JPEG/JPG, and PNG, forbid SVG, and preserve trusted source-controlled SVG assets.
6. Accessible, responsive Persian RTL Storefront product listing and detail pages.
7. Cart add, quantity update, removal, totals, and stale/unavailable-product handling.
8. Checkout with approved customer/contact and required delivery/address information; guest, authenticated, or both remains Open.
9. Final server-side product, price, availability, and total validation before idempotent order creation.
10. Persisted order/item historical facts including approved product/SKU identity, unit price, quantity, and totals rather than relying only on mutable Product records.
11. Payment initiation, external gateway redirect/connection, return/callback handling, and Backend-to-provider verification.
12. Persisted payment/order outcomes, duplicate-callback protection, and safe failed/cancelled/ambiguous behavior.
13. Customer-visible Persian final order/payment result and minimum authorized Admin order management.
14. Essential loading, empty, error, unauthorized, security, payment-failure, accessibility, and consistency behavior with meaningful automated tests.
15. Production hardening/deployment for the complete commerce path, including PostgreSQL, product-media object storage, HTTPS, protected Swagger, backup/recovery, logging, health/readiness, and runbooks.

## Open MVP decisions

- Exact product/variant, identifiers, lifecycle, category, fitment, pricing, inventory, and media ownership/storage rules.
- Cart persistence and identity strategy.
- Guest checkout, customer-account checkout, or both; customer account registration/login is not automatically required.
- Minimum checkout/contact/address, shipping, tax, discount, currency, and rounding requirements.
- Availability checks, reservation need/timing, stock decrement/release, and payment-failure inventory behavior.
- Order lifecycle, expiration, historical snapshots, idempotency, and payment relationship.
- Payment provider, sandbox, initiation/return/callback/verification flows, retry/re-payment, status model, network ambiguity, and credentials.
- Minimum Admin order lifecycle/permissions and production provider/operational requirements.

## Milestones

The **Catalog Milestone** is reached when an authorized Admin can create a valid product with required images and a customer can discover it on accessible Storefront listing/detail pages.

The **Commerce MVP** is reached only when that catalog path continues through Cart, Checkout, Order, external Payment, Backend verification, customer result, minimum Admin order management, and production release validation.

## Excluded or deferred

Advanced customer profile/account features, password recovery, MFA, social/SSO login, advanced discounts, recommendations, analytics, specialized search infrastructure, complex fulfillment/shipping integrations, advanced returns/refunds, advanced media systems, BFF, Redis without concrete need, event-driven architecture, microservices, Kafka, Kubernetes, speculative infrastructure, and nonessential design-system abstraction are excluded unless separately approved.

## MVP success

An authorized Admin can manage a purchasable product and its images; a customer can browse it, maintain a cart, submit valid Checkout information, create an order, complete the selected gateway flow, and receive a Backend-verified result; the resulting order is visible/manageable to an authorized Admin; and the deployed system preserves secure, tested, recoverable order/payment/inventory behavior without exposing sensitive details.

# Project Roadmap

## Roadmap Principles

- This roadmap is intentionally high-level. Sprint specifications and ordered task queues are refined only as a Sprint approaches implementation.
- Feature and task context is created incrementally under `docs/work/sprint-XX/` after the required scope and decisions are ready.
- Future work exists at two levels: the roadmap carries long-term objectives, milestones, major dependencies/sequencing, and useful known Open Decisions; only the Active or next planning-horizon Sprint receives a detailed plan, exit criteria, ordered queue, and task execution metadata.
- Do not create detailed task queues, `current.md` files, task Required Context lists, or implementation plans for distant future Sprints merely for completeness.
- Roadmap planning does not reopen Accepted architecture. Changes require an explicit owner decision and the appropriate architecture record.
- Future scope may move as product requirements are clarified, but the MVP boundary must not expand or contract silently.
- A planned or future Sprint is not authorization to implement it. Only the active approved task may be implemented.
- The initial browser topology remains direct browser-to-API; BFF is Deferred. PostgreSQL remains primary persistence; Redis requires a concrete future need.

## Sprint 0 — Engineering Foundation

**Status:** Complete

### Goal

Create a reproducible, secure, quality-gated Yarn Workspaces/Turborepo monorepo foundation for Storefront, Admin, and API without implementing business functionality.

### Major Workstreams

- Preserve and deliberately place the existing Next.js starter.
- Establish the application/package boundaries and minimal Turborepo orchestration.
- Bootstrap the separate Storefront, Admin, and NestJS API foundations.
- Establish strict quality, environment, PostgreSQL, Prisma, OpenAPI/Swagger, CI, and onboarding foundations without speculative business schema or infrastructure.

### Major Exit Criteria

All three empty application foundations are reproducible with the accepted Yarn toolchain; required quality gates pass; local database/environment and migration-review workflows are documented; the API documentation foundation exists; and no business feature or speculative package has been introduced.

See [Sprint 0](sprints/sprint-00.md) for canonical scope and `docs/work/sprint-00/` for active execution state.

## Sprint 1 — Admin Authentication & Authorization

**Status:** Active

### Goal

Deliver a complete accessible Admin authentication slice with Backend-enforced authorization, secure session behavior, and protected Persian RTL Admin entry.

### Major Features

- Independent Admin identity and minimum Role/Permission foundation.
- Secure first-Super-Admin provisioning.
- Login, authenticated bootstrap, refresh recovery, current-session logout, and disabled-account enforcement.
- Backend-authoritative access control, CSRF/CORS behavior, stable errors, and synchronized OpenAPI contracts.
- Accessible Persian RTL login and protected Admin shell with meaningful security and concurrency tests.

### Major Exit Criteria

An eligible Admin can authenticate, enter the protected Admin application, recover safely from normal access expiry, and log out the current session; invalid, disabled, unauthenticated, and unauthorized behavior is enforced and tested without sensitive disclosure.

### Decisions Required Before Sprint

Resolve only the authentication blockers identified by the existing specification, including final session/token schema details, legitimate in-grace recovery, the minimum permission representation, ineligible-login behavior, and cross-origin CSRF delivery/session binding.

See [Sprint 1](sprints/sprint-01.md) and the [Admin Authentication specification](features/admin-auth/specification.md).

## Future Sprints

Future Sprints remain high-level until their entry decisions are resolved. Their numbers express the current dependency order, not fixed delivery dates.

## Sprint 2 — Catalog Domain & Persistence Foundation

**Status:** Future

### Goal

Turn the approved catalog concepts into a reviewed persistent Backend foundation for products, required reference data, minimum inventory, and product images.

### Major Features

- Feature specifications for Product, Product Image, Category, Brand, minimum vehicle compatibility, and minimum inventory behavior.
- Reviewed Prisma model and migrations for only the approved catalog scope.
- Validated, authorized Backend contracts for managing and retrieving approved catalog data and images.
- Minimum product-media policy for WebP, JPEG/JPG, and PNG with SVG uploads forbidden; trusted source-controlled SVG assets remain allowed.
- Transactional invariants, lifecycle behavior, stable errors, meaningful tests, and synchronized OpenAPI documentation.

### Depends On

Sprint 0 foundation and Sprint 1 Admin authentication/authorization.

### Decisions Required Before Sprint

- **Open:** Product versus variant boundary, identifiers/SKU ownership, required fields, and lifecycle/publication behavior.
- **Open:** Category hierarchy/cardinality and Brand relationships.
- **Open:** Minimum fitment precision, supported vehicle dimensions, and source-quality expectations.
- **Open:** Minimum inventory scope, availability meaning, location depth, and purchase-relevant quantity semantics.
- **Open:** Pricing/currency representation required for catalog and later order totals.
- **Open:** Product-image ownership, ordering, limits, storage lifecycle, and approved storage boundary. Advanced galleries, video, transformation pipelines, and DAM systems are Deferred.

### Exit Outcome

The Backend can securely persist and retrieve the approved minimum catalog, inventory, and product-image model with reviewed migrations and tested contracts, ready for Admin workflows and public browsing.

## Sprint 3 — Admin Catalog Management

**Status:** Future

### Goal

Enable authorized staff to manage the catalog data and required product images needed to create and maintain a Storefront-visible product.

### Major Features

- Protected Persian RTL management for Categories and Brands.
- Minimum vehicle compatibility and inventory administration.
- Product creation, listing, viewing, and editing with approved lifecycle behavior.
- Required product-image upload, visibility, ordering/removal behavior, and safe validation under the accepted media policy.
- Authorization-aware UX, validation, loading/empty/error states, meaningful automated tests, and end-to-end Admin/API verification.

### Depends On

Sprint 1 protected Admin foundation and Sprint 2 catalog persistence/contracts.

### Decisions Required Before Sprint

- **Open:** Minimum catalog/media permission matrix and which roles may perform each operation.
- **Open:** Admin workflow and validation rules for product completeness and publication/readiness.
- **Open:** Inventory adjustment semantics and concurrency expectations.
- **Open:** Media upload/storage UX and minimum image-management lifecycle.
- **Open:** Required audit history and retention for catalog changes.

### Exit Outcome

An authorized Admin can create and maintain all prerequisite data, inventory, required images, and a valid persisted product through the protected Admin application and Backend API.

## Sprint 4 — Storefront Catalog Discovery

**Status:** Future

### Goal

Make approved persisted products and their images discoverable to customers through an accessible, responsive, Persian RTL Storefront.

### Major Features

- Public product listing and product detail experiences with required product images.
- Approved Category, Brand, fitment, availability, and pricing presentation.
- Bounded browsing/filtering needed for the approved catalog scope; specialized search infrastructure is excluded.
- Safe image fallback plus essential loading, empty, not-found, error, and unavailable/inactive product states.
- SEO, accessibility, responsive behavior, performance, and meaningful Storefront/API tests.

### Depends On

Sprint 2 public catalog/media contracts and sufficient Admin-managed data from Sprint 3.

### Decisions Required Before Sprint

- **Open:** Public product visibility/publication rules and inactive-product behavior.
- **Open:** Public URL/identifier strategy and exact safe response fields.
- **Open:** Pagination, sorting, filtering, and whether text search is required for the Commerce MVP.
- **Open:** Customer-facing fitment and inventory/availability presentation.
- **Open:** Product-image ordering, responsive delivery, and fallback behavior.
- **Open:** Final localization and SEO metadata requirements for catalog pages.

### Exit Outcome

A customer can discover an Admin-created persisted product and its images on accessible Storefront listing and detail pages, with approved catalog failure states handled safely.

## Catalog Milestone

The Catalog Milestone completes at the exit of **Sprint 4 — Storefront Catalog Discovery**. It includes catalog persistence, required product media, Admin catalog management, and Storefront product discovery.

This is a useful tested vertical slice, but it is **not** the final e-commerce MVP because a customer cannot yet complete a purchase.

## Sprint 5 — Cart & Purchase Preparation

**Status:** Future

### Goal

Allow customers to create and maintain a purchase cart from available Storefront products.

### Major Features

- Add products to cart, update quantities, remove items, and calculate displayed totals.
- Revalidate product status, price, and availability at appropriate purchase boundaries.
- Handle inactive, unavailable, insufficient-quantity, and changed-price outcomes safely.
- Persist cart state according to the separately approved identity/persistence strategy.
- Accessible Persian RTL cart UX with meaningful state, calculation, interaction, and failure-path tests.

### Depends On

Sprint 4 usable public catalog and the Sprint 2 inventory/pricing foundation.

### Decisions Required Before Sprint

- **Open:** Guest cookie/session, local storage, Backend cart identity, customer-account cart, or an approved combination.
- **Open:** Whether MVP purchasing is guest checkout, authenticated customer checkout, or both; customer authentication is not automatically required.
- **Open:** Cart lifetime, merge behavior if accounts exist, maximum quantities/items, and stale-cart handling.
- **Open:** Which displayed totals are estimates and when authoritative server recalculation occurs.
- **Open:** Purchase-boundary availability checks needed before Checkout without prematurely designing reservation.

### Exit Outcome

A customer can maintain a validated Persian RTL cart and proceed toward Checkout, while the Backend remains authoritative for purchasability and final totals.

## Sprint 6 — Checkout & Order Creation

**Status:** Future

### Goal

Convert a valid cart into a persisted order with historical purchase facts and a pending-payment state.

### Major Features

- Accessible Persian RTL checkout flow and required customer/contact information.
- Delivery/address information where required by the approved fulfillment scope.
- Final server-side price, product-state, and availability validation.
- Authoritative order-total calculation and idempotent order creation.
- Order-safe snapshots of purchased product/SKU identity, unit price, quantity, totals, and other approved transaction-time facts.
- Persisted pending-payment order ready for gateway initiation, with meaningful validation, persistence, concurrency, and failure-path tests.

### Depends On

Sprint 5 cart and approved purchase-relevant inventory behavior from Sprint 2/3.

### Decisions Required Before Sprint

- **Open:** Guest checkout, authenticated customer checkout, or both, plus minimum identity/contact requirements.
- **Open:** Address/delivery fields and minimum shipping policy; do not assume advanced carrier integration.
- **Open:** Tax, delivery charge, discount, currency, rounding, and final total rules required for MVP.
- **Open:** What inventory quantity means; when availability is checked; whether/when reservation occurs; when stock is decremented/released; and how payment failure/expiration affects stock.
- **Open:** Required product/SKU, unit-price, quantity, totals, and descriptive snapshots so mutable Product records are not the only historical source.
- **Open:** Minimum order lifecycle, pending-order expiration, duplicate-submit handling, and initial payment relationship.

### Exit Outcome

A valid cart can produce exactly one consistent persisted pending-payment order with approved customer/delivery data and immutable transaction-time purchase facts.

## Sprint 7 — Payment Gateway Integration

**Status:** Future

### Goal

Allow a customer to pay for an order through an external gateway while the Backend securely verifies and persists the authoritative outcome.

### Major Features

- Backend-created payment initiation/request associated with an eligible pending order.
- Customer redirect/connection to the selected external gateway.
- Return/callback handling and server-to-provider payment verification.
- Persisted payment status and consistent order/payment state transitions.
- Successful, failed, cancelled, expired, retry/re-payment, duplicate callback, and network-ambiguity behavior as approved.
- Customer-visible Persian order/payment result.
- Security, idempotency, integration/failure-path tests and synchronized Swagger/OpenAPI contracts.

The frontend and a successful browser redirect are never the source of truth for payment success. Only successful Backend verification through the provider's approved flow may mark payment/order state accordingly.

### Depends On

Sprint 6 pending-payment orders and an approved provider integration design.

### Decisions Required Before Sprint

- **Open:** Payment gateway/provider and sandbox/test environment.
- **Open:** Initiation contract, return/callback URL flow, and server-side verification flow.
- **Open:** Payment request expiration and failed/cancelled behavior.
- **Open:** Duplicate callback/verification handling and idempotency scope.
- **Open:** Retry/re-payment policy and whether one order may have multiple payment attempts.
- **Open:** Payment/order status model and synchronization invariants.
- **Open:** Timeout, uncertain network outcome, delayed-provider-response, and reconciliation behavior.
- **Open:** Provider credentials, secret configuration, logging/redaction, and operational ownership.

### Exit Outcome

A customer can leave for the gateway, return, and receive a reliable Persian result while the Backend independently verifies and persists the authoritative payment/order outcome.

## Sprint 8 — Admin Order Management

**Status:** Future

### Goal

Allow authorized Admin users to inspect and manage orders produced by Checkout and Payment.

### Major Features

- Persian RTL Admin order list and order details.
- Payment status and payment-attempt visibility appropriate to support/fulfillment.
- Required customer/contact/delivery and immutable purchased-item information.
- Minimum approved order status management.
- Backend-enforced permissions, stable contracts, meaningful tests, and synchronized Swagger/OpenAPI documentation.

### Depends On

Sprint 6 order creation, Sprint 7 payment outcomes, and Sprint 1 authorization foundation.

### Decisions Required Before Sprint

- **Open:** Minimum operational order lifecycle and allowed Admin transitions.
- **Open:** Order-management permissions and sensitive customer/payment field visibility.
- **Open:** Minimum fulfillment information and whether any manual notes/history are required.
- **Open:** Cancellation behavior required for MVP; complex fulfillment, returns, and refunds remain Deferred unless explicitly approved.
- **Open:** Audit/event retention required for Admin order actions.

### Exit Outcome

An authorized Admin can find an order, understand its customer/items/payment state, and perform only the approved minimum operational status changes.

## Sprint 9 — Commerce Hardening & Production Release

**Status:** Future

### Goal

Validate, harden, deploy, and operate the complete commerce path as the first production-ready MVP.

### Major Features

- End-to-end verification across Admin authentication, catalog/media, Storefront, cart, Checkout, order creation, payment, customer result, and Admin order management.
- Payment failure/retry/ambiguity and order/payment/inventory consistency verification.
- Security, authentication/authorization, CSRF/CORS/cookie, accessibility, RTL, SEO, performance, and regression review.
- Production PostgreSQL, required product-media object storage, environment/secrets configuration, domains/subdomains, HTTPS, and protected production Swagger.
- CI/release gates, backup/recovery, health/readiness, structured logging, operational diagnostics, and release/runbook validation.
- Provider/deployment planning and configuration near release rather than making early development depend on purchased production services.

Enterprise infrastructure is not implied. BFF and Redis remain Deferred unless concrete evidence requires them.

### Depends On

Completion of Sprints 0–8 and a stable integrated purchase flow.

### Decisions Required Before Sprint

- **Open:** Hosting/provider topology, final domains, environments, direct-API origins, TLS termination, and release strategy; whether Liara or another provider is selected remains unapproved.
- **Open:** Production secret management and exact Swagger protection mechanism.
- **Open:** PostgreSQL hosting, backup/restore, retention, migration deployment, and recovery expectations.
- **Open:** Product-media object storage provider, access policy, backup/lifecycle, and delivery topology.
- **Open:** Minimum monitoring, alerting, payment reconciliation, security-event retention, and incident/runbook ownership.
- **Open:** Measurable performance/reliability targets and release acceptance thresholds.
- **Open:** Applicable privacy, legal, payment, content, and operational compliance requirements.

### Exit Outcome

The full purchase path is deployed and operable: an authorized Admin manages catalog and orders; a customer browses products/images, maintains a cart, checks out, creates an order, completes the gateway round trip, receives a Backend-verified result, and the system preserves consistent inventory, payment, and order state.

## Commerce MVP

The first production-ready Commerce MVP is complete at the exit of **Sprint 9 — Commerce Hardening & Production Release**.

Commerce MVP requires:

- usable catalog persistence and required product media;
- protected Admin catalog management;
- Storefront product listing/detail discovery;
- cart add/update/remove and totals;
- Checkout with approved customer/contact/delivery information;
- server-validated order creation with historical item/price facts;
- payment-gateway initiation, return/callback handling, and Backend verification;
- customer-visible final order/payment result;
- minimum authorized Admin order management; and
- production hardening, deployment, and operational validation.

Customer account registration/login is not automatically required. Guest checkout, authenticated checkout, or both remains an entry decision for Cart/Checkout.

## Post-MVP / Deferred

The following remain Deferred or Future considerations unless separately approved:

- Advanced customer account/profile features, password recovery, MFA, and social/SSO login.
- Advanced discounts, recommendations, analytics, and specialized search infrastructure such as Elasticsearch.
- Complex fulfillment, carrier integrations, advanced shipping, returns, refunds, and post-purchase automation beyond the approved minimum lifecycle.
- Advanced media galleries, video, transformation pipelines, and DAM systems.
- Broader staff/role administration, enterprise session management, and `logout-all`.
- BFF adoption without a concrete security, aggregation, deployment, or client-contract need.
- Redis without a concrete need such as proven distributed locking, rate limiting at scale, caching, queues, or ephemeral state.
- Event-driven integrations, Kafka, microservices, Kubernetes, advanced tracing/telemetry, WAF/bot services, and other specialized infrastructure without evidence from requirements or scale.
- Nonessential design-system or shared-package abstraction.

## Just-In-Time Sprint Planning

Use these context levels:

```text
Roadmap = long-term direction
Next Sprint Plan = near-term detailed planning
current.md = immediate execution context
```

When the final task of the Active Sprint is Done, verify the Sprint exit criteria and mark it `Completed` only when they pass. If they do not pass, keep the Sprint `Active`, record and report the unmet criteria, and do not begin a Sprint transition. After successful completion, read this roadmap to identify the next intended Sprint; never invent a Sprint that has no roadmap direction.

### Next Sprint is not yet detailed

Do not activate it. Ask exactly:

`Sprint N is complete. Plan Sprint N+1 from the roadmap?`

After owner approval, plan only that next Sprint using its roadmap objective, outcomes/decisions from completed Sprints, actual repository state, accepted architecture/ADRs, relevant feature specifications, dependencies, and unresolved Open Decisions. Produce or update:

- Sprint Goal;
- Scope and Out of Scope;
- dependencies and relevant Open Decisions;
- exit criteria; and
- an appropriately scoped ordered task queue.

Do not prepare task-level Required Context/current files during Sprint-plan drafting, prematurely design distant implementation details, or implement anything. Do not silently resolve an explicitly documented Open Decision. Ask the owner to approve the completed Sprint plan.

After plan approval, mark that Sprint `Active`, automatically select its first `Queued` task, mark it `Current`, and populate its `current.md` with Minimum Sufficient **Required Context** and every required task section. Set `Approval State: Awaiting Implementation Approval`, stop before implementation, and ask only for implementation approval of that prepared task.

### Next Sprint already has an approved detailed plan

Ask exactly:

`Sprint N is complete. Activate Sprint N+1 and prepare its first Current task?`

After approval, activate it and perform the same automatic first-task preparation/stop boundary above.

Detailed planning normally exists only for the Active Sprint and the single next Sprint being planned. Future roadmap entries remain high-level so newly completed work and owner decisions can shape the next plan without maintaining speculative queues.

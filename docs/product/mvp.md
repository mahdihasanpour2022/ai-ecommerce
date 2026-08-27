# Minimum Viable Product

## Outcome

The MVP proves one secure end-to-end catalog path: an authorized admin authenticates, manages prerequisite catalog data, creates a product through the Backend API, and a customer can browse the persisted product in the Storefront.

## Included capabilities

1. Admin authentication and a protected admin area.
2. Backend-enforced authorization for required catalog operations.
3. Minimal management of required categories, brands, fitment data, and inventory.
4. Product creation, listing, viewing, and editing through Admin and the API.
5. PostgreSQL persistence with a reviewed Prisma schema and migrations.
6. Accessible, responsive Storefront product listing and detail pages.
7. Essential loading, empty, error, and unauthorized states plus meaningful tests.

The exact product fields, fitment depth, inventory semantics, and publication workflow remain open until catalog specifications are approved. Destructive product deletion is not required for the first catalog MVP; prefer a reviewed lifecycle such as `ACTIVE` and `INACTIVE`.

## Excluded or deferred

Recommendation engines, microservices, event-driven architecture, complex analytics and discounts, Elasticsearch, Redis without a concrete use case, Kubernetes, speculative infrastructure, and nonessential design-system abstraction are excluded. Checkout, payment, shipping, customer accounts, and complete order management are not assumed to be MVP until explicitly approved.

## MVP success

An authorized admin can create a valid product, persistence and authorization are verified through the API, and the resulting product is discoverable on accessible Storefront listing/detail pages. Authentication and catalog failure paths are handled without exposing sensitive details.

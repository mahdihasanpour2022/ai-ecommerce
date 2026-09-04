# Current Task

## S2-T09 — Implement Minimum Public Catalog Contracts

## Goal

Implement the accepted bounded unauthenticated Category tree, deterministic page-bounded Active Product summaries, optional exact-Category filtering, and Active Product detail contracts using explicit safe DTOs, existing ordered Product Image metadata/content identifiers, active Variant price/availability data, stable failures, and synchronized Swagger/OpenAPI.

## Why

The catalog persistence and protected management slices are complete, and controlled public Image content now exists. Sprint 4 Storefront discovery needs one minimal Backend-owned public catalog projection that exposes only currently Active, purchasable-domain data without leaking Admin lifecycle, exact Inventory, retained inactive Variants, or persistence-only fields.

## Minimum Sufficient Required Context

- [Clothing Catalog specification](../../features/catalog/specification.md), narrowed to public Category/Product routes, public DTO allowlists, Active/Variant/Image eligibility, paging/filtering/order, price/availability projection, stable errors, Swagger/OpenAPI, and public-query tests.
- [Sprint 2 plan](../../sprints/sprint-02.md), especially minimum public reads, authorization, Out of Scope, and Exit Criteria.
- [Implemented S2-T02 persistence design](s2-t02-schema-proposal.md), narrowed to Product/Variant/Image/Category indexes and public-query access paths.
- Implemented Category, Product/Variant, Product Image, and price-display-setting boundaries under `apps/api/src/catalog/`, including existing Product Image public content URLs and DTO metadata conventions.
- [Backend standards](../../standards/backend.md), [Backend architecture](../../architecture/backend-architecture.md), [API conventions](../../api/conventions.md), [security baseline](../../security/baseline.md), and [testing standards](../../standards/testing.md), narrowed to explicit public projections, bounded queries, safe errors, caching, OpenAPI, and meaningful PostgreSQL HTTP coverage.

Frontend/Next.js guides, Storefront or Admin UI, final URLs/slugs/SEO, search, selectable sorting, descendant-Category browsing, advanced filters, recommendations, caching infrastructure, Product Image mutation/storage changes, Inventory mutation, Cart/Checkout/Order/Payment behavior, and deployment are not required.

## Scope

- Add public `GET /api/v1/catalog/categories` returning the accepted complete deterministic Category tree within the existing 1,000-Category/six-level bounds.
- Add public `GET /api/v1/catalog/products` returning only Active Product summaries with deterministic bounded pagination and optional exact `categoryId` filtering.
- Add public `GET /api/v1/catalog/products/{productId}` returning only an Active Product with active Variants, public price/availability fields, ordered ready Image metadata/content identifiers, and the accepted safe Category projection.
- Reuse the implemented global public price-display-setting route rather than duplicating its unit in Product responses.
- Express availability without exposing exact Inventory quantities; exclude inactive Variants and every Admin/persistence-only field.
- Use stable validation/not-found/safe-error envelopes and indistinguishable missing-versus-ineligible Product behavior.
- Add focused query/projection, real-PostgreSQL HTTP, lifecycle/filter/paging, security, failure-path, and exact Swagger/OpenAPI tests.
- Update only narrow public-catalog implementation-reality and Sprint execution documentation after executable verification passes.

## Out of Scope

- Storefront/Admin components, routes, gallery behavior, fallback presentation, enlargement, zoom, or client data fetching.
- Slugs, final Storefront URL strategy, SEO metadata, sitemap, canonical URLs, or redirect policy.
- Search, text relevance, descendant-Category inclusion, multi-Category filters, selectable sort, cursor pagination, facets, recommendations, related Products, or merchandising.
- Exact public Inventory counts, retained inactive Variants, Draft/Archived Products, Admin timestamps/state, storage keys/paths, cleanup state, normalized comparison keys, or internal concurrency versions.
- Product Image upload/order/replacement/removal, transformations, thumbnails, production object storage, CDN/DAM, or media schema changes.
- Cart, Checkout, reservations, Orders, Payments, customer identity, deployment, observability expansion, or caching infrastructure.
- Prisma schema/migration/reference-data/dependency changes or unrelated authentication/catalog refactors.
- Staging, committing, pushing, rebasing, branching, or destructive database/storage reset without separate authorization.

## Expected Changes

- Focused public catalog DTO/parser, controller, service, repository/query, and stable error mapping under `apps/api/src/catalog/`, reusing existing Category/Product/Image conventions where safe.
- Minimal catalog module registration and explicit OpenAPI decorators/schemas.
- Focused public catalog unit and real-PostgreSQL integration/security/OpenAPI tests under `apps/api/test/`.
- Narrow project/catalog/backend documentation and Sprint records after verification.

No Prisma schema, migration, reference-data, package/lockfile, Admin, Storefront, Product Image storage, or authentication change is expected.

## Constraints

- Public routes are unauthenticated and must not inherit Admin cookie security, permission guards, or CSRF requirements.
- Return only Active Products. Detail lookup must use the same not-found response for missing, Draft, and Archived IDs.
- Return only active Variants and safe availability derived from Inventory (`available` when on-hand quantity is greater than zero); never expose exact quantities or Inventory versions.
- Return ordered ready Product Image metadata using controlled Image content identifiers/URLs; never expose storage keys, paths, cleanup state, or original filenames.
- Product list defaults to page 1 and page size 24, caps page size at 60, and orders by `createdAt DESC, id DESC`; exact Category filtering does not include descendants.
- Public Category tree remains complete, deterministic, bounded at the existing database-enforced limits, and uses the accepted nested DTO rather than leaking normalized keys.
- Use explicit selects and bounded database work. Confirm existing indexes support actual predicates/order before adding any query; surface a schema/index gap rather than changing persistence in this task.
- Reuse stable catalog error envelopes and generated OpenAPI behavior; production Swagger remains disabled.

## Acceptance Criteria

- Public Category read returns the complete deterministic nested Category DTO, including empty state, without authentication or internal fields.
- Public Product list returns only Active Products, applies default/max page bounds, deterministic tie-breaking, and optional exact-Category filtering, with correct empty/page metadata.
- Public Product summaries expose only the accepted identity/name/Category/main-Image/price-range/availability fields; they exclude lifecycle management, exact stock, inactive Variants, storage, normalized, and persistence-only data.
- Public Product detail returns only an Active Product, only active Variants with canonical `priceRial` and boolean availability, and all ready Product Images in contiguous order with controlled content identifiers.
- Missing, Draft, and Archived Product detail requests return the same stable not-found envelope; malformed UUID/query input returns stable validation failure; unexpected failures remain safe.
- Existing public Product Image content and price-display-setting routes interoperate with returned identifiers/values without contract duplication or security regression.
- Generated Swagger/OpenAPI exactly documents all three public operations, bounded query/path parameters, explicit response schemas/statuses, stable failures, and no Admin cookie security or CSRF.
- Meaningful unit and real-PostgreSQL lifecycle/filter/order/page/projection/failure tests pass, along with relevant Sprint 1 and S2-T03 through S2-T08 regressions.
- API typecheck/lint/build/test, formatting, scope, query/index review, database cleanup, and Git checks pass with no unrelated or unapproved changes.

## Testing Impact

Full Backend public-query, projection, PostgreSQL HTTP, lifecycle/security, and OpenAPI coverage required.

- Unit-test exact query parsing/bounds and safe DTO projection where logic is not already covered through HTTP.
- Use real PostgreSQL fixtures for empty and populated Category trees, Active/Draft/Archived Products, active/inactive Variants, zero/positive Inventory, zero-to-nine ordered Images, exact-Category filtering, deterministic page ties, and missing/ineligible detail equivalence.
- Assert no authentication/CSRF requirement and no protected/internal fields in response bodies or generated OpenAPI.
- Assert exact price ranges/availability from active Variants only and main/all-Image ordering using the implemented metadata/content contract.
- Add safe repository/controller failure coverage and retain relevant authentication/catalog/Image regressions.

## Swagger / OpenAPI Impact

Required. Document public Category tree, Product collection, and Product detail operations; page/pageSize/categoryId and productId inputs; explicit summary/detail/Variant/Image/page schemas; success and stable failure statuses; and absence of Admin cookie security and CSRF. Generated documentation remains development/test-only.

## Validation

- Preflight the approved isolated PostgreSQL test environment before expensive query work.
- Inspect actual existing Product/Variant/Image/Category indexes and explain the selected public query shapes; do not add an index without a separately approved persistence task.
- Run focused public parser/projection and real-PostgreSQL HTTP/lifecycle/filter/paging/security/failure/OpenAPI tests plus relevant existing catalog/Image/authentication regressions.
- Run API test, typecheck, lint, and build gates.
- Run repository formatting, changed-document local-link validation, `git diff --check`, prohibited-scope/dependency/schema/migration/frontend/generated-artifact, database cleanup, and read-only Git-index inspections.
- Record only checks actually executed and their real results.

## Documentation Impact

Update public catalog/API implementation reality and Sprint records only after executable verification passes. On success, archive S2-T09 and automatically prepare S2-T10; stop before final catalog-foundation verification implementation.

## Approval State

Awaiting Implementation Approval

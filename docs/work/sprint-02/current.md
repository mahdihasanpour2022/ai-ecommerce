# Current Task

## S2-T08 — Implement Secure Product Image Contracts

## Goal

Implement secure Product-owned image upload, authorized/public retrieval, optimistic-version ordering, replacement, eligible removal, and recoverable development/test local-storage cleanup with strict content validation, stable errors, and synchronized Swagger/OpenAPI.

## Why

Product activation already requires a ready main image, but no supported media mutation or controlled content-delivery boundary exists. Sprint 3 Admin workflows and Sprint 4 public Product discovery require a complete safe Product Image slice before broader public catalog contracts can rely on ordered immutable image identities.

## Minimum Sufficient Required Context

- [Clothing Catalog specification](../../features/catalog/specification.md), narrowed to Product lifecycle/image invariants, upload validation, storage/compensation, ordering/retrieval, protected/public image routes and DTOs, authorization, stable failures, transactions, Swagger/OpenAPI, and Product Image tests.
- [Sprint 2 plan](../../sprints/sprint-02.md), especially Product Images, authorization, Out of Scope, and Exit Criteria.
- [Implemented S2-T02 persistence design](s2-t02-schema-proposal.md), narrowed to ProductImage/ProductImageCleanup fields and constraints, Product `imageVersion`, locking/version transactions, cleanup state, indexes, and failure behavior.
- [Security baseline](../../security/baseline.md), narrowed to file/media safety, path confinement, content validation, response headers, and sensitive-data handling.
- [Environment strategy](../../environment.md), narrowed to application-owned development/test storage configuration and production fail-closed behavior.
- Implemented Product aggregate, catalog guard, error-envelope, Prisma, environment, and OpenAPI patterns in `apps/api/src/catalog/`, `apps/api/src/config/`, `apps/api/src/application.ts`, and `apps/api/src/database/prisma.service.ts`.
- [Backend standards](../../standards/backend.md), [Backend architecture](../../architecture/backend-architecture.md), [Authorization](../../security/authorization.md), [API conventions](../../api/conventions.md), and [Testing standards](../../standards/testing.md), narrowed to multipart/content boundaries, authorization/CSRF, transactions/external side effects, safe errors, OpenAPI, and security/failure-path coverage.

Frontend/Next.js guides, Admin/Storefront image UX, transformations/thumbnails, CDN/DAM/production object storage, generalized jobs/outbox, Variant images, broader public Product contracts, Inventory/settings changes, and later commerce domains are not required.

## Scope

- Implement protected Product Image upload, content retrieval, atomic full-collection reorder, immutable-identity replacement, and eligible removal using the accepted routes and exact permissions.
- Implement public content retrieval only for ready images whose owning Product is Active, without exposing storage keys/paths or lifecycle eligibility distinctions.
- Accept exactly one multipart image file plus required `imageVersion` for upload/replacement; validate declared type, signature, full decode/static structure, byte/dimension/pixel limits, and reject SVG/polyglot/trailing payload/unsafe content.
- Generate trusted opaque storage keys and confine all filesystem operations to an application-owned development/test root; production upload/storage must fail closed until an approved provider exists.
- Preserve zero-to-nine contiguous positions, position-zero main image, immutable image content identity, Product lifecycle rules, and exactly-once Product `imageVersion` increments under Product locking and optimistic concurrency.
- Coordinate staging/promotion with database publication and compensate unreferenced files on failure; durably record and retry idempotent post-commit cleanup without a generalized job platform.
- Return explicit safe metadata/content responses with allowlisted media headers and stable failures.
- Add focused validation, storage, PostgreSQL transaction/concurrency, authorization, compensation/cleanup, content-response, and OpenAPI tests.
- Update only narrow media/API/environment documentation required by implemented reality.

## Out of Scope

- Admin Panel or Storefront upload/gallery/fallback/enlargement/zoom UX.
- Image transformation, resizing, thumbnails, optimization pipeline, video, SVG, captions, Variant images, DAM/CDN, remote URLs, or production object-storage provider selection.
- Generic file service, generalized outbox/queue/scheduler/worker platform, broad audit framework, or unrelated cleanup infrastructure.
- Broader public Category/Product listing/detail, SEO/slugs, search/filtering, Inventory, settings, Cart, Checkout, Order, or Payment behavior.
- Prisma schema/migration/reference-data changes, dependency changes, unapproved environment changes, or unrelated catalog/authentication refactors.
- Staging, committing, pushing, rebasing, branching, or destructive database/storage reset without separate authorization.

## Expected Changes

- Focused Product Image DTO/error/service/repository/controller, validation/decoder, and storage/cleanup boundaries under `apps/api/src/catalog/`.
- Minimal catalog module, application multipart/static-response, and validated environment additions only where the accepted local-storage contract requires them.
- Focused `apps/api/test/` fixtures and unit/PostgreSQL HTTP/concurrency/security/failure-path/OpenAPI coverage.
- Generated OpenAPI is verified through tests rather than committed unless an existing tracked workflow requires it.
- Narrow media/API/environment documentation and Sprint execution records only.

No Prisma schema, migration, package manifest, lockfile, Admin, or Storefront change is expected. Any dependency or persistent-contract gap must be surfaced rather than silently added.

## Relevant Existing Architecture

- The API is a NestJS Modular Monolith with one API-owned Prisma client and PostgreSQL database.
- S2-T03 implemented Product-owned ready Image metadata, Product `imageVersion`, durable cleanup rows, zero-to-nine/contiguous/main-image/lifecycle constraints, immutable identities, and relevant indexes/triggers.
- S2-T05 exposes ready ordered metadata and serializes aggregate mutations on the Product row; activation requires position zero.
- The catalog guard enforces current authentication, exact permission metadata, and session-bound CSRF for unsafe methods.
- No generic upload/storage abstraction or production object-storage provider is approved; the implementation must remain Product Image-specific and fail closed in production.

## API Changes

- Add protected `POST /api/v1/admin/catalog/products/{productId}/images` requiring `product.media.manage` and CSRF; success `201` with appended ready image metadata and updated collection state required by the accepted DTO.
- Add protected `PUT /api/v1/admin/catalog/products/{productId}/images/order` requiring `product.media.manage` and CSRF; success `200` with ordered metadata.
- Add protected `POST /api/v1/admin/catalog/product-images/{imageId}/replacements` requiring `product.media.manage` and CSRF; success `201` with a new immutable Image identity at the old position.
- Add protected `DELETE /api/v1/admin/catalog/product-images/{imageId}?imageVersion=...` requiring `product.media.manage` and CSRF; success `204`.
- Add protected `GET /api/v1/admin/catalog/product-images/{imageId}/content` requiring `catalog.read`.
- Add public `GET /api/v1/catalog/product-images/{imageId}/content` with Active/ready eligibility filtering and no Admin authentication.
- Use accepted validation/authentication/authorization codes plus `PRODUCT_NOT_FOUND`, `PRODUCT_IMAGE_NOT_FOUND`, `PRODUCT_LIFECYCLE_CONFLICT`, `PRODUCT_IMAGE_LIMIT_REACHED`, `PRODUCT_IMAGE_ORDER_CONFLICT`, `PRODUCT_MAIN_IMAGE_REQUIRED`, `PRODUCT_IMAGE_TOO_LARGE`, `PRODUCT_IMAGE_TYPE_UNSUPPORTED`, `PRODUCT_IMAGE_CONTENT_INVALID`, `PRODUCT_IMAGE_DIMENSIONS_INVALID`, `PRODUCT_IMAGE_STORAGE_UNAVAILABLE`, and safe `500` as applicable.

## Database Changes

None. Use the implemented Product `imageVersion`, ProductImage, and ProductImageCleanup persistence, constraints, triggers, and indexes. No schema, migration, seed, or reference-data change is authorized.

## Security Implications

- Backend `product.media.manage` is authoritative for mutations; protected content uses `catalog.read`; public retrieval is filtered by ready Image and Active Product eligibility.
- Every mutation requires trusted Origin/session-bound CSRF and strictly validated UUID/version/multipart input.
- Original filenames and caller paths/keys are never trusted or persisted; generated keys and all resolved targets remain within the configured storage root, with symlink/path traversal and overwrite protection.
- Declared MIME, signature, decoder result, static-image structure, complete consumption, size, dimensions, and pixel count must agree before publication; SVG and executable/trailing payloads fail closed.
- Responses use detected allowlisted `Content-Type`, `X-Content-Type-Options: nosniff`, safe inline disposition, and lifecycle-appropriate caching without exposing paths or keys.
- Logs/errors omit image bytes, credentials, storage paths/keys, database internals, and public eligibility distinctions.

## Edge Cases

- Missing/extra multipart fields/files, empty or oversized bodies, false extensions/MIME, allowed signatures with malformed/truncated/animated/multipage/trailing content, excessive dimensions/pixels, SVG/polyglot input, and unsafe filenames.
- Malformed UUID/version, zero/negative/out-of-range version, stale Product `imageVersion`, missing/foreign Image IDs, duplicate or incomplete reorder membership, and nine-image limit.
- First upload becomes main; append remains contiguous; reorder submits every ready Image once; replacement preserves position but creates a new UUID/key; removal compacts positions.
- Draft permits zero images; Active cannot lose main/valid ready state; Archived mutation is rejected while protected retrieval remains eligible.
- Database failure before publication compensates staged/promoted unreferenced bytes; post-commit deletion failure remains durably retryable and invisible publicly.
- Concurrent same-version mutations select one winner, increment `imageVersion` once, and never publish partial order or leaked/unreferenced visible state.
- Missing authentication, wrong exact permission, invalid CSRF/origin, disabled/revoked sessions, unavailable storage, and safe unexpected failures.

## Constraints

- Preserve Product ownership, immutable ready Image identity/content, contiguous order, one main image, nine-image cap, lifecycle completeness, and optimistic collection version semantics.
- Lock the owning Product and perform bounded validation/classification inside the accepted transaction; never hold a database transaction open during decoding or unreliable filesystem work.
- Keep local storage Product Image-specific and development/test-only; production mutations fail closed until approved object storage exists.
- Reuse existing catalog authorization, Product aggregate, error-envelope, Prisma, environment, and Swagger patterns without speculative generalized infrastructure.
- Do not modify S2-T03 persistence or pull UI, transformations, broader public catalog, CDN/object storage, or later commerce behavior forward.
- No dependency, environment-contract, schema/migration, reference-data, or generated-artifact changes without separate approval.

## Acceptance Criteria

- Protected upload validates exactly one accepted static image and publishes trusted metadata/content with contiguous append position, new immutable UUID/key, and exactly one `imageVersion` increment; unsafe inputs publish neither metadata nor bytes.
- Protected reorder atomically accepts only exact current membership with matching version and returns the complete contiguous order; stale/duplicate/missing/foreign input rolls back.
- Replacement creates a new immutable identity at the same position; eligible removal compacts order; lifecycle/main-image rules and version increments remain correct.
- Protected content permits authorized ready images across Product lifecycles; public content returns only Active ready images and uses indistinguishable not-found behavior for missing/ineligible state.
- Content responses have exact detected media type, nosniff, safe disposition/cache headers, and never expose original filename, local path, or storage key.
- Staging/promotion/database failures compensate unreferenced bytes; failed post-commit deletion is durably recorded and safely retried idempotently.
- Authentication, exact permissions, CSRF/origin, disabled/revoked state, validation, storage failure, and safe error-envelope behavior match existing conventions.
- Meaningful unit and real-PostgreSQL transaction/concurrency/security/failure-path tests pass with representative allowed/rejected image fixtures.
- Generated Swagger/OpenAPI exactly documents multipart bodies, UUID/version parameters, response metadata/content schemas, cookie security only on protected routes, CSRF mutation headers, statuses, stable failures, and production exposure behavior.
- Relevant Sprint 1 and S2-T03 through S2-T07 regressions, API typecheck/lint/build/test, formatting, scope, storage cleanup, and Git checks pass.

## Testing Impact

Full Backend validation, storage, HTTP, PostgreSQL, concurrency, authorization, and failure-path testing required.

- Unit-test signature/decoder/static-content validation, byte/dimension/pixel limits, generated-key/root confinement, strict multipart/version/reorder parsing, response headers, and error classification.
- Use small representative WebP/JPEG/PNG fixtures plus malformed/truncated/animated/multipage/mismatched/SVG/polyglot/trailing-payload and excessive-dimension cases.
- Add real-PostgreSQL API coverage for append/main, cap, order, replacement/removal, lifecycle, optimistic races, rollback, exact permissions/CSRF/current state, protected/public eligibility, and OpenAPI.
- Add storage failure injection for staging, promotion, database publication, compensation, post-commit cleanup persistence/retry, idempotence, and leftover-file audits.
- Run relevant authentication and catalog regressions.

## Swagger / OpenAPI Impact

Required. Document all protected/public Image operations, multipart schemas and limits, UUID/version inputs, metadata/content responses and media types, cookie security only for protected routes, CSRF only for mutations, success statuses, and all stable failure responses. Generated OpenAPI must match tested behavior and remain disabled in production.

## Validation

- Preflight the approved PostgreSQL test identity, required image-decoding capability, and an isolated application-owned test storage root before implementation; do not install dependencies or reset database/storage without separate approval.
- Run focused Product Image unit/integration/security/storage/concurrency/OpenAPI tests and relevant authentication/catalog regressions.
- Run API test, typecheck, lint, and build gates.
- Run repository formatting, local Markdown-target, `git diff --check`, prohibited-scope, dependency/lockfile/schema/migration/frontend, generated-artifact, database/storage cleanup, and read-only Git-index inspections.
- Record only checks actually executed and their real results.

## Documentation Impact

Update media/storage/API implementation reality and Sprint records only after executable verification passes. On success, archive S2-T08 and automatically prepare S2-T09; stop before broader public catalog implementation.

## Approval State

Awaiting Implementation Approval

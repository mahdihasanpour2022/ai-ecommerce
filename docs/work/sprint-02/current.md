# Current Task

## S2-T07 — Implement Rial/Toman Display-Setting Contracts

## Goal

Implement consistent protected update and safe Admin/public read contracts for the singleton Toman-default display/input setting while preserving canonical `priceRial` values and enforcing the dedicated permission and CSRF boundary.

## Why

S2-T05 established canonical rial Variant prices. Sprint 3 Admin and Sprint 4 public consumers need one authoritative display/input-unit setting before presenting or accepting price values, without rewriting stored prices or introducing currency, conversion, localization, or frontend behavior.

## Minimum Sufficient Required Context

- [Clothing Catalog specification](../../features/catalog/specification.md), narrowed to canonical pricing, global display/input unit, protected/public setting routes and DTOs, authorization, stable failures, and settings tests.
- [Sprint 2 plan](../../sprints/sprint-02.md), especially Pricing and display, Authorization, Out of Scope, and Exit Criteria.
- [Implemented S2-T02 persistence design](s2-t02-schema-proposal.md), narrowed to the singleton `PriceDisplaySetting`, accepted fixed-row update, initial Toman state, constraints, and permission reference data.
- Implemented catalog and authentication patterns in `apps/api/src/catalog/`, `apps/api/src/authentication/`, `apps/api/src/application.ts`, and `apps/api/src/database/prisma.service.ts`.
- [Backend standards](../../standards/backend.md), [Backend architecture](../../architecture/backend-architecture.md), [Authorization](../../security/authorization.md), and [Testing standards](../../standards/testing.md), narrowed to explicit protected/public DTOs, current authorization/CSRF, safe errors, OpenAPI, and PostgreSQL HTTP coverage.

Frontend/Next.js guides, Product/Variant/Inventory mutation changes, Product Image operations, broader public catalog behavior, multiple currencies, exchange rates, formatting/localization policy, discounts/tax, Checkout/payment conversion, and future Role composition are not required.

## Scope

- Implement protected `GET /api/v1/admin/catalog/settings/price-display-unit` requiring `catalog.read`.
- Implement protected `PUT /api/v1/admin/catalog/settings/price-display-unit` requiring `settings.price.display.unit.update` plus session-bound CSRF.
- Implement public `GET /api/v1/catalog/settings/price-display-unit` with no Admin authentication.
- Accept and return exactly `{ "unit": "RIAL" | "TOMAN" }`; preserve the implemented singleton initial `TOMAN` state.
- Update only fixed setting row `id = 1`; never read, rewrite, convert, or reinterpret persisted Variant `priceRial` values.
- Add strict validation, explicit response projection, stable safe failures, matching Swagger/OpenAPI, and focused unit/PostgreSQL/authorization tests.
- Update only narrow setting/API documentation required by implemented reality.

## Out of Scope

- Admin Panel or Storefront UI, price input/display formatting, Persian numerals, locale formatting, rounding, exchange rates, multiple currencies, discounts, tax, promotions, or price history.
- Product/Variant price contract or persistence changes, batch price conversion, Checkout/Order/Payment behavior, or provider conversion.
- Product Image, Inventory, Category, broader protected/public catalog, media, or search behavior.
- Prisma schema/migration/reference-data changes, dependency changes, environment changes, production infrastructure, or unrelated catalog/authentication refactors.
- Staging, committing, pushing, rebasing, branching, or destructive database reset without separate authorization.

## Expected Changes

- Focused display-setting DTO/error/service/repository/controller additions under `apps/api/src/catalog/`, reusing existing catalog guard and public-controller patterns where coherent.
- Minimal catalog module registration.
- Focused `apps/api/test/` validation, PostgreSQL HTTP, authorization, canonical-price non-mutation, and OpenAPI coverage.
- Generated OpenAPI is verified through tests rather than committed unless an existing tracked workflow requires it.
- Narrow catalog/API documentation and Sprint execution records only.

No Prisma schema, migration, package manifest, lockfile, Admin, or Storefront change is expected.

## Relevant Existing Architecture

- The API is a NestJS Modular Monolith with one API-owned Prisma client and PostgreSQL database.
- S2-T03 implemented the fixed `price_display_settings` singleton with initial `TOMAN`, database enum/check integrity, and the dedicated update permission granted explicitly to `SUPER_ADMIN`.
- S2-T05 stores and exposes canonical positive `priceRial`; display-setting changes must remain independent from those rows.
- The catalog guard enforces current authentication, exact permission metadata, and session-bound CSRF for unsafe protected methods.

## API Changes

- Add protected `GET /api/v1/admin/catalog/settings/price-display-unit` requiring `catalog.read`.
- Add protected `PUT /api/v1/admin/catalog/settings/price-display-unit` requiring `settings.price.display.unit.update` and CSRF.
- Add public `GET /api/v1/catalog/settings/price-display-unit` with no cookie authentication.
- Each success returns `200` with exactly `{ "unit": "RIAL" | "TOMAN" }`.
- Use `400 VALIDATION_FAILED`, existing authentication failures, `403 INSUFFICIENT_PERMISSION`/`CSRF_VALIDATION_FAILED`, and safe `500` behavior as applicable.

## Database Changes

None. Read or update only the implemented fixed singleton row `price_display_settings.id = 1`. No schema, migration, seed, reference-data, or Variant price change is authorized.

## Security Implications

- Backend `settings.price.display.unit.update` enforcement is authoritative; `catalog.manage`, UI visibility, or possession of an Admin cookie is insufficient for mutation.
- Protected mutation requires the trusted Origin/session-bound CSRF boundary; protected read requires current `catalog.read`; public read exposes only the non-sensitive unit enum.
- Strict allowlisting prevents caller-supplied singleton identity, timestamps, price values, or other persistence fields.
- Unexpected singleton corruption or database failures use the safe internal envelope without leaking persistence details.

## Edge Cases

- Missing body, unknown fields, lowercase/mixed-case strings, null, numbers, arrays, and values outside exact `RIAL`/`TOMAN`.
- Replacing the setting with its current value remains a consistent successful absolute set.
- Repeated `RIAL`/`TOMAN` transitions do not mutate any Product Variant price or change canonical rial meaning.
- Missing authentication, wrong exact permission, invalid CSRF/origin, disabled/revoked sessions, and safe unexpected failures.
- Public read remains unauthenticated and contains no timestamps, row identity, or other internal fields.

## Constraints

- Preserve canonical rial storage/calculation and treat the setting as display/input preference only.
- Use fixed singleton identity `id = 1`; do not create fallback rows or silently repair corrupt/missing state.
- Reuse existing catalog authorization, error-envelope, Prisma, and Swagger patterns without speculative abstraction.
- Do not pull frontend formatting, conversion, multiple-currency, Product price mutation, Checkout/payment, media, or broader public catalog work forward.
- No dependency, environment, schema/migration, reference-data, or generated-artifact changes without separate approval.

## Acceptance Criteria

- Protected and public reads return exactly the current `{ unit }` DTO; the public route requires no Admin authentication and exposes no persistence internals.
- The protected `PUT` route implements the exact method/path/status, dedicated permission/CSRF boundary, strict request validation, and minimal response DTO.
- `RIAL`, `TOMAN`, and same-value absolute updates persist consistently while every existing Variant `priceRial` remains byte-for-byte unchanged.
- Authentication, exact permission, CSRF/origin, disabled/revoked state, validation, singleton failure, and safe error-envelope behavior match existing API conventions.
- Meaningful unit and real-PostgreSQL integration/authorization tests pass, including default/current reads, both transitions, same-value update, invalid bodies, and canonical-price non-mutation.
- Generated Swagger/OpenAPI exactly documents all three paths, request/response enum schemas, cookie authorization only where applicable, CSRF header, statuses, and stable failures; production documentation exposure remains unchanged.
- Relevant Sprint 1 and S2-T03 through S2-T06 regressions, API typecheck/lint/build/test, formatting, scope, and Git checks pass.

## Testing Impact

Full Backend HTTP and PostgreSQL behavior testing required.

- Unit-test strict display-setting request parsing and explicit DTO projection where meaningful.
- Add real-PostgreSQL API coverage for protected/public reads, both and same-value updates, canonical-price non-mutation, exact permission, CSRF, and current account/session state.
- Verify public/protected response allowlists and exact OpenAPI security/schema/status behavior.
- Run relevant authentication and catalog regressions.

## Swagger / OpenAPI Impact

Required. Add exact protected read/update and public read operations, request/response enum DTOs, cookie security only on protected routes, CSRF header only on the mutation, success status, and stable error responses. Generated OpenAPI must match tested behavior and remain disabled in production.

## Validation

- Preflight the approved PostgreSQL test identity before integration work; no reset without separate approval.
- Run focused setting unit/integration/authorization/OpenAPI tests and relevant authentication/catalog regressions.
- Run API test, typecheck, lint, and build gates.
- Run repository formatting, local Markdown-target, `git diff --check`, prohibited-scope, dependency/lockfile/environment/schema/migration/frontend, generated-artifact, database-cleanup, and read-only Git-index inspections.
- Record only checks actually executed and their real results.

## Documentation Impact

Update catalog/API implementation reality and Sprint records only after executable verification passes. On success, archive S2-T07 and automatically prepare S2-T08; stop before Product Image implementation.

## Approval State

Awaiting Implementation Approval

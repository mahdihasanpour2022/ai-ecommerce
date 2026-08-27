# Current Task

## Task ID

S0-T07

## Title

Bootstrap NestJS API and OpenAPI Foundation

## Status

Current

## Goal

Create the strict-TypeScript NestJS Modular Monolith foundation with generated OpenAPI and environment-aware Swagger UI availability, without business modules or speculative infrastructure.

## Why This Task Exists

Storefront and Admin now have independent application boundaries, but the shared Backend API remains only a reserved target. Future features require a buildable NestJS authority with a versioned REST prefix and an OpenAPI foundation that evolves with every implemented contract.

## Required Context

- `docs/sprints/sprint-00.md`
- `apps/README.md`
- `docs/00-project-overview.md`
- `docs/architecture/system-architecture.md`
- `docs/architecture/backend-architecture.md`
- `docs/architecture/adr/0005-use-nestjs-for-backend.md`
- `docs/architecture/adr/0008-start-with-modular-monolith.md`
- `docs/architecture/adr/0012-use-openapi-swagger-for-api-documentation.md`
- `docs/api/conventions.md`
- `docs/standards/general.md`
- `docs/standards/backend.md`
- `docs/standards/testing.md`
- `docs/standards/git.md`
- `docs/security/baseline.md`
- `package.json`
- `turbo.json`

## Scope

- Resolve and approve exact compatible NestJS, OpenAPI, TypeScript, lint, and focused integration-test dependency versions through current official documentation.
- Create the private `@automotive-commerce/api` Yarn Workspace and minimal strict-TypeScript NestJS application/module bootstrap.
- Configure the versioned REST prefix `/api/v1` without adding a business endpoint merely to populate documentation.
- Generate OpenAPI from the application and expose Swagger UI at `/api/docs` in non-production development/test contexts as explicitly configured.
- Keep Swagger UI and its generated document routes unavailable in production until a separately approved protection mechanism exists.
- Structure Swagger setup so future modules can document controllers/DTOs naturally within their implementation tasks.
- Add focused automated integration coverage for Swagger availability/exposure rules and preserve safe, empty API behavior.
- Update concise application/API reality and Sprint 0 execution documentation.

## Out of Scope

- Authentication, authorization, product/catalog/order modules, Prisma, PostgreSQL, migrations, queues, Redis, or other business/infrastructure behavior.
- Inventing endpoints solely to make Swagger non-empty.
- Selecting the future protected production Swagger mechanism; production access remains disabled.
- Broad environment strategy, deployment, CORS/domain decisions, advanced observability, or shared packages.
- Modifying Storefront/Admin behavior or adding frontend dependencies.
- Staging, committing, pushing, branching, or other Git writes.

## Expected Changes

- Minimal `apps/api` NestJS workspace, source bootstrap, configuration, and focused tests.
- Explicit approved root dependency/lockfile changes required by the Backend foundation.
- API/application reality documentation and Sprint 0 execution records.

## Testing Impact

Automated tests required

Add focused integration coverage proving non-production Swagger/OpenAPI availability at the documented route, production unavailability, and absence of invented business routes. Also run strict typecheck, lint, build, Workspace integrity, and repository-wide regression gates.

## Swagger / OpenAPI Impact

Creates the Backend documentation foundation. The application must generate an OpenAPI description, expose Swagger UI predictably at `/api/docs` only in approved non-production contexts, keep documentation unavailable in production, and allow future controllers/DTOs to extend the generated contract within their own tasks.

## Constraints

- Use Context7/current official NestJS documentation before selecting versions or writing framework code.
- Keep the application a single empty Modular Monolith foundation; do not create placeholder domain modules.
- Production Swagger remains disabled because no protection mechanism is approved.
- OpenAPI metadata/examples must contain no secrets or sensitive implementation details.
- Use the accepted Yarn toolchain and exact reviewed dependency versions; avoid unrelated resolution churn.
- Never stage or commit without separate approval.

## Acceptance Criteria

- `apps/api` is a valid private Yarn Workspace with strict TypeScript and compatible exact NestJS/OpenAPI tooling.
- The NestJS application builds and starts with `/api/v1` as its REST prefix without an invented business endpoint.
- A generated OpenAPI document and Swagger UI are available at `/api/docs` in the approved non-production configuration.
- Swagger UI and generated document routes are unavailable in production unless a future protection mechanism is separately approved and configured.
- Automated integration tests cover Swagger exposure rules and pass; OpenAPI behavior matches the tested application.
- API and repository-wide typecheck/lint/build/test-relevant gates pass without breaking Storefront or Admin.
- No business module, database schema, auth behavior, speculative infrastructure, or unrelated dependency change is introduced.

## Validation

- Verify Workspace discovery, exact installed versions, Yarn integrity, and reviewed lockfile scope.
- Run focused Swagger/OpenAPI integration tests in non-production and production configurations.
- Inspect the generated OpenAPI document/routes and confirm no business route was invented.
- Run API typecheck, lint, and build, then repository-wide applicable quality/build gates.
- Confirm Swagger/OpenAPI documentation and concise source-of-truth docs match implementation.
- Review read-only Git diff/index state for exact scope.

## Documentation Impact

Update `apps/README.md`, project/system/API reality documentation as directly required, and Sprint 0 execution records. Broader environment/onboarding work remains S0-T09/S0-T13.

## Approval State

Awaiting Implementation Approval

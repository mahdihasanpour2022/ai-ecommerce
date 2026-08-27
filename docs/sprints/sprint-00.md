# Sprint 0: Engineering Foundation

**Plan only. Do not execute without explicit approval.**

## Goal

Create a reproducible, secure, quality-gated monorepo foundation for Storefront, Admin, and API without implementing business functionality.

## Task-Scoped Required Context

Read only the context for the active workstream in addition to `AGENTS.md` and this sprint plan.

### Workspace and package manager

- [Project overview](../00-project-overview.md)
- [System architecture](../architecture/system-architecture.md)
- [ADR 0001: Monorepo](../architecture/adr/0001-use-monorepo.md)
- [ADR 0013: Yarn Workspaces](../architecture/adr/0013-use-yarn-workspaces.md)
- [ADR 0003: Turborepo](../architecture/adr/0003-use-turborepo.md)
- [General standards](../standards/general.md)
- [Git standards](../standards/git.md)

### Web application bootstrap

- [Frontend architecture](../architecture/frontend-architecture.md)
- [ADR 0004: Next.js](../architecture/adr/0004-use-nextjs-for-web-apps.md)
- [ADR 0009: Separate Admin and Storefront](../architecture/adr/0009-separate-admin-and-storefront-apps.md)
- [Frontend standards](../standards/frontend.md)

### API and database bootstrap

- [API conventions](../api/conventions.md)
- [Backend architecture](../architecture/backend-architecture.md)
- [Database architecture](../architecture/database.md)
- [ADR 0005: NestJS](../architecture/adr/0005-use-nestjs-for-backend.md)
- [ADR 0006: PostgreSQL](../architecture/adr/0006-use-postgresql.md)
- [ADR 0007: Prisma](../architecture/adr/0007-use-prisma.md)
- [ADR 0008: Modular Monolith](../architecture/adr/0008-start-with-modular-monolith.md)
- [Backend standards](../standards/backend.md)

### CI and environment baseline

- [General standards](../standards/general.md)
- [Testing standards](../standards/testing.md)
- [Security baseline](../security/baseline.md)

## Scope

- Preserve and deliberately place the existing root Next.js 16.3.2 starter while retaining accepted Yarn and its dependency baseline.
- Verify and configure Yarn Workspaces and a minimal Turborepo task graph.
- Create the approved `apps/storefront`, `apps/admin`, `apps/api`, and minimal justified package structure.
- Bootstrap Storefront/Admin Next.js and NestJS API with strict TypeScript; establish its environment-aware OpenAPI/Swagger foundation.
- Establish shared TypeScript, ESLint, formatting, environment-validation, and script conventions.
- Decide and document local PostgreSQL and Docker/local-infrastructure strategy.
- Configure Prisma without product schema speculation; agree migration workflow.
- Add minimal useful CI quality checks and confirm this documentation foundation.

## Out of Scope

Authentication, RBAC implementation, catalog/inventory/orders, product schemas/migrations, UI design, production infrastructure, deployment, Redis, Elasticsearch, queues, microservices, and other business functionality.

## Tasks

1. Inventory the starter, versions, user changes, and installed packages; approve its destination and a reversible migration sequence. Preserve useful installed dependencies unless removal is explicitly approved, without forcing their use.
2. Verify the existing Yarn Classic setup and configure the private root for `apps/*` and `packages/*` Yarn Workspaces without unnecessary dependency reinstallation or lockfile churn.
3. Approve application bootstrapping options and exact framework versions; read installed/current framework docs before generation.
4. Bootstrap the NestJS API foundation with generated OpenAPI, a predictable development Swagger UI route, and production disabled unless an approved protection mechanism is configured; do not add business endpoints.
5. Configure Turborepo tasks with correct dependencies, inputs, outputs, and safe environment handling.
6. Create a shared configuration package only if actual reuse already justifies it; otherwise keep configuration local and consistent.
7. Establish strict TypeScript, ESLint, formatting, typecheck, and consistent scripts. Add test tooling when real tests require it; do not create fake placeholder tests.
8. Define typed environment variables, example files without secrets, local ports, and domain/origin strategy.
9. Decide native versus containerized local PostgreSQL, lifecycle, health checks, test database, and data reset policy.
10. Initialize Prisma tooling and migration-review conventions only after dependency approval; do not invent business entities.
11. Add minimal CI for install integrity, typecheck, lint, and builds; add tests when real suites exist. Remote caching is not required.
12. Update README/onboarding and architecture records to reflect what actually exists.

## Acceptance Criteria

- Fresh documented setup reproduces all three empty application foundations with one approved package manager.
- Filtered and repository-wide typecheck, lint, and build commands are defined and pass. Test commands/checks are required only if real tests exist.
- Runtime foundation behavior receives meaningful automated or integration-smoke coverage where warranted; configuration and documentation tasks use explicit validation instead. No placeholder test is created merely to satisfy policy.
- No starter behavior/user work is lost; its migration is reviewable.
- Local PostgreSQL strategy and environment contract are documented and secrets remain untracked.
- CI runs approved quality gates; cache inputs do not leak secrets or reuse invalid output.
- The NestJS foundation generates OpenAPI and exposes Swagger UI at a predictable development route; production exposes neither anonymously and remains disabled unless an approved protection mechanism is configured.
- The foundation lets future Backend modules document routes, DTOs, statuses, security requirements, and API-visible errors as part of their implementation tasks.
- No business module, authentication, product schema, or speculative shared package is implemented.

## Definition of Done

All approved tasks and acceptance criteria are met; required automated tests and task-appropriate validation pass; dependency/lockfile and generated changes were explicitly reviewed; relevant checks pass from a clean install; docs match reality; no unrelated changes exist; and Git staging/commit/push has not occurred without separate approval.

## Risks / Open Questions

- Does the current root app become Storefront, and how are its dependencies handled?
- Exact Node/Turborepo/framework versions and the approved workspace execution/validation sequence. Changing the established Yarn major is a separate decision.
- Bootstrap tools/options and whether HeroUI/Ant Design are installed now or in feature work.
- Native versus Docker PostgreSQL; CI provider and remote-cache policy.
- Test runner timing, formatter policy, deployment environments, ports, and final domains. Shared-contract generation is Deferred until a real contract-sharing need exists.
- Final Swagger documentation route and exact production protection mechanism; the latter remains Open until deployment/security planning and does not permit public production access meanwhile.
- Remote Turborepo caching, Redis, Kafka, microservices, a full observability stack, complex deployment infrastructure, and premature design-system/shared-package work are not Sprint 0 blockers.

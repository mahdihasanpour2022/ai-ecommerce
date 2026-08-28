# Sprint 0 Queue

Sprint 0 is Complete. Its goal, scope, and Definition of Done remain canonical in [Sprint 0](../../sprints/sprint-00.md).

## S0-T01 — Inventory Existing Starter and Propose Placement

Status: Done

Objective:
Inventory the repository, existing useful dependencies, user changes, and starter constraints; propose its target placement and a reversible migration sequence.

## S0-T02 — Verify and Configure Yarn Workspaces

Status: Done

Objective:
Use the existing Yarn setup as the monorepo package-management foundation and configure Yarn Workspaces without unnecessary dependency reinstallation.

Execution History:
The previous Yarn-to-pnpm formulation was cancelled before completion and superseded by owner decision. It is not Done.

## S0-T03 — Establish Monorepo Application and Package Layout

Status: Done

Objective:
Create the approved `apps/*` and justified `packages/*` filesystem structure on the configured Yarn Workspace foundation.

## S0-T04 — Configure Minimal Turborepo Orchestration

Status: Done

Objective:
Add the minimal dependency-aware task graph for repository quality and build commands without remote caching.

## S0-T05 — Place and Bootstrap Storefront

Status: Done

Objective:
Place or bootstrap the Storefront according to the approved starter decision while preserving existing behavior.

## S0-T06 — Bootstrap Admin Application

Status: Done

Objective:
Create the independent strict-TypeScript Next.js Admin foundation without implementing authentication or other features.

## S0-T07 — Bootstrap NestJS API

Status: Done

Objective:
Create the strict-TypeScript NestJS Modular Monolith foundation without business modules, including generated OpenAPI and environment-aware Swagger UI availability.

Swagger / OpenAPI Impact:
Creates the Backend documentation foundation. Swagger UI must have a predictable development route, future modules must be able to add contract documentation naturally, and production must remain unavailable unless an approved protection mechanism is configured.

Acceptance Criteria:
The foundation generates an OpenAPI document and provides Swagger UI in development; the selected route is documented and consistent with API conventions; production has no anonymous/public Swagger access; and no business endpoint is introduced merely to populate documentation.

## S0-T08 — Align TypeScript, Lint, and Formatting

Status: Done

Objective:
Establish consistent TypeScript and ESLint quality configuration plus a root-owned Prettier formatting/check workflow, sharing or duplicating configuration only where actual reuse or a concrete Workspace need justifies it.

## S0-T09 — Define Environment Strategy

Status: Done

Objective:
Define validated environment configuration, safe examples, local ports, and development origin conventions without secrets.

## S0-T10 — Establish Local PostgreSQL Development

Status: Done

Objective:
Implement the approved lightweight local PostgreSQL lifecycle, health, test-database, and reset approach.

## S0-T11 — Bootstrap Prisma

Status: Done

Objective:
Initialize Prisma tooling and migration-review workflow without creating product, authentication, or other business schemas.

## S0-T12 — Add Minimal CI Quality Checks

Status: Done

Objective:
Run approved install-integrity, typecheck, lint, and build checks in CI without fake tests or advanced infrastructure.

## S0-T13 — Align Onboarding and Foundation Documentation

Status: Done

Objective:
Update README, onboarding, and architecture records to match the repository that Sprint 0 actually produced.

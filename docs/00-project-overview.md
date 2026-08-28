# Project Overview

## Vision

Build a production-quality automotive replacement-parts commerce platform that helps customers discover parts and authorized staff manage catalog and inventory data. Initial product families include braking, lighting, glass, mirrors, and body parts.

## Users and applications

- Customers browse the **Storefront** at the planned `example.com` domain.
- Authorized staff use the separate **Admin Panel** at planned `admin.example.com`.
- Both clients use the **Backend API** at planned `api.example.com`.

These are placeholder production domains; final names, environments, and DNS are open decisions.

## Intended repository model

The accepted target is a Yarn Workspaces/Turborepo monorepo containing `apps/storefront`, `apps/admin`, `apps/api`, and only justified shared packages. It should enable atomic contract changes, consistent tooling, and selective builds without coupling application deployment.

## Current stage and repository reality

Sprint 0's engineering foundation is complete, while product implementation has not begun. The repository uses Yarn Classic 1.22.22 Workspaces with Turborepo orchestration. The preserved Next.js 16.3.2 App Router starter and its dependency baseline live in `apps/storefront`; `apps/admin` contains an independent Persian RTL Next.js foundation; `apps/api` contains the empty strict-TypeScript NestJS Modular Monolith and OpenAPI foundation; and the root owns repository orchestration.

Persian (`fa-IR`) and right-to-left layout are the accepted frontend language and direction. The initial browser topology communicates directly with the API; a BFF is deferred.

No Admin authentication or business UI, API business module or endpoint, database schema/model, runtime persistence integration, authentication flow, or product behavior described in these documents currently exists. The API reserves `/api/v1` for future REST contracts and exposes generated Swagger/OpenAPI at `/api/docs` only in development and test; production documentation remains disabled.

Local development uses non-conflicting ports: Storefront `3000`, Admin `3001`, and API `3002`. Application-owned environment values, safe examples, validation behavior, and browser-exposure rules are defined in the [environment strategy](environment.md). The accepted local database contract uses pinned PostgreSQL 18.6 through Docker Compose with isolated development and test databases. The API owns model-free Prisma tooling; application schema, migrations, and runtime database integration remain unimplemented.

GitHub Actions provides the minimal repository quality gate for pull requests and pushes to `main`. It reproduces the frozen Yarn installation and runs Prisma validation/generation, formatting, typecheck, lint, build, and all real tests without deployment or database infrastructure. See [continuous integration](development/ci.md).

## Out of scope now

Schemas and migrations, authentication, catalog behavior, infrastructure, deployment, and unapproved dependency changes require their separately approved tasks. Microservices, event-driven architecture, Kafka, Kubernetes, Elasticsearch, Redis, recommendation engines, advanced analytics, and speculative shared packages are not initial requirements.

See [product requirements](product/requirements.md), [MVP](product/mvp.md), [system architecture](architecture/system-architecture.md), and [task execution/context-efficiency standards](standards/execution.md).

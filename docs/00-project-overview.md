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

The project is establishing its engineering foundation before product implementation. The repository now uses Yarn Classic 1.22.22 Workspaces with Turborepo orchestration. The preserved Next.js 16.3.2 App Router starter and its dependency baseline live in `apps/storefront`; `apps/admin` contains an independent Persian RTL Next.js foundation; `apps/api` contains the empty strict-TypeScript NestJS Modular Monolith and OpenAPI foundation; and the root owns repository orchestration.

Persian (`fa-IR`) and right-to-left layout are the accepted frontend language and direction. The initial browser topology communicates directly with the API; a BFF is deferred.

No Admin authentication or business UI, API business module or endpoint, PostgreSQL/Prisma model, authentication flow, or product behavior described in these documents currently exists. The API reserves `/api/v1` for future REST contracts and exposes generated Swagger/OpenAPI at `/api/docs` only in development and test; production documentation remains disabled.

## Out of scope now

Schemas and migrations, authentication, catalog behavior, infrastructure, deployment, and unapproved dependency changes require their separately approved tasks. Microservices, event-driven architecture, Kafka, Kubernetes, Elasticsearch, Redis, recommendation engines, advanced analytics, and speculative shared packages are not initial requirements.

See [product requirements](product/requirements.md), [MVP](product/mvp.md), and [system architecture](architecture/system-architecture.md).

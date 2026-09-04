# Project Overview

## Vision

Build a production-quality clothing-commerce platform that helps customers discover apparel and authorized staff manage nested categories, products, images, pricing, and inventory data.

## Users and applications

- Customers browse the **Storefront** at the planned `example.com` domain.
- Authorized staff use the separate **Admin Panel** at planned `admin.example.com`.
- Both clients use the **Backend API** at planned `api.example.com`.

These are placeholder production domains; final names, environments, and DNS are open decisions.

## Intended repository model

The accepted target is a Yarn Workspaces/Turborepo monorepo containing `apps/storefront`, `apps/admin`, `apps/api`, and only justified shared packages. It should enable atomic contract changes, consistent tooling, and selective builds without coupling application deployment.

## Current stage and repository reality

Sprint 0's engineering foundation, Sprint 1's complete initial Admin authentication/authorization slice, and Sprint 2's complete catalog persistence and protected/public Backend foundation are implemented and verified. Sprint 3 Admin catalog management is Active; its behavior/UX specification, exact approved Admin UI/test foundation, protected catalog shell/client boundary, and Category management are complete, while Product listing and Draft creation are next. The product direction is now clothing commerce; legacy `automotive` workspace, database, issuer, and audience identifiers remain implemented technical identifiers until a separately approved compatibility-safe rename. The repository uses Yarn Classic 1.22.22 Workspaces with Turborepo orchestration. The preserved Next.js 16.3.2 App Router starter and its dependency baseline live in `apps/storefront`; `apps/admin` contains the protected Persian RTL authentication and catalog route shells, exact permission-aware responsive navigation, typed protected catalog client, accessible Category tree and create/rename/move/eligible-delete workflows, shared route states, Ant Design/App Router, React Hook Form, JSDOM interaction-test, and Chromium Playwright foundations; `apps/api` contains the strict-TypeScript NestJS Modular Monolith/OpenAPI foundation, Admin identity/session/authentication boundary, and catalog module; and the root owns repository orchestration.

Persian (`fa-IR`) and right-to-left layout are the accepted frontend language and direction. The initial browser topology communicates directly with the API; a BFF is deferred.

The Backend implements `POST /api/v1/auth/login`, `POST /api/v1/auth/refresh`, `POST /api/v1/auth/logout`, `GET /api/v1/auth/csrf`, `GET /api/v1/auth/me`, protected Category management, bounded protected Product reads, atomic Draft Product/Variant/Inventory creation, Product lifecycle/update, retained Variant update/reactivation, optimistic-version absolute Inventory update, secure Product Image upload/order/replacement/removal and controlled protected/public image content, protected/public singleton rial/toman display-setting routes, and minimum public Category tree plus Active Product summary/detail routes, along with strict Access-cookie/current-state enforcement, exact catalog permissions, session-bound mutation CSRF, refresh rotation/recovery/reuse handling, current-session logout, and trusted one-shot first-Super-Admin provisioning. Development/test Product Image bytes use a configured application-owned local directory; production image storage fails closed until a provider is approved. The Admin provides a Persian RTL login, memory-only CSRF/session bootstrap, protected-entry gate, responsive permission-aware catalog shell and route states, strictly parsed protected catalog reads and Category mutations over centralized credentialed Axios/error handling, accessible permission-aware Category management, single-flight expired-Access recovery with bounded refresh retry and one-time request replay, and accessible current-session logout. Product mutation workflows, final public URLs/slugs/SEO, search, and advanced discovery behavior remain later tasks. Generated Swagger/OpenAPI remains available at `/api/docs` only in development and test; production documentation is disabled.

Local development uses non-conflicting ports: Storefront `3000`, Admin `3001`, and API `3002`. Application-owned environment values, safe examples, validation behavior, and browser-exposure rules are defined in the [environment strategy](environment.md). The accepted local database contract uses pinned PostgreSQL 18.6 through Docker Compose with isolated development and test databases. The API owns Prisma 7.10 tooling, the implemented sixteen-model Admin/catalog persistence boundary and two reviewed migrations, and the documented [first-Super-Admin provisioner](development/admin-provisioning.md); later Sprint 2 tasks own the remaining catalog runtime contracts.

GitHub Actions provides the minimal repository quality gate for pull requests and pushes to `main`. It reproduces the frozen Yarn installation and runs Prisma validation/generation, formatting, typecheck, lint, build, all real workspace tests, and the focused Admin production-build Chromium smoke without deployment or database infrastructure. See [continuous integration](development/ci.md).

## Out of scope now

Further schemas/migrations, catalog behavior beyond approved active tasks, infrastructure, deployment, and unapproved dependency changes require separately approved tasks. Microservices, event-driven architecture, Kafka, Kubernetes, Elasticsearch, Redis, recommendation engines, advanced analytics, and speculative shared packages are not initial requirements.

See [product requirements](product/requirements.md), [MVP](product/mvp.md), [system architecture](architecture/system-architecture.md), and [task execution/context-efficiency standards](standards/execution.md).

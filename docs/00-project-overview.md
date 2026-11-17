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

The Admin identity boundary now has a third reviewed additive migration for required unique canonical usernames. Login accepts either a normalized email or a 3–20-character lowercase-ASCII username and enforces exactly six ASCII password digits across the Admin and Backend. A trusted one-shot updater assigns the migrated initial Admin credentials without exposing an HTTP reset surface.

The engineering foundation, independent Admin and Customer authentication boundaries, and catalog persistence plus protected/public Backend contracts are implemented. Final Customer-auth regression gates, owner usability review, and UI-team visual design remain pending. The former Admin catalog frontend routes and their route-specific UI, hooks, and tests have been removed so future frontend work can proceed one owner-selected route at a time from a supplied UI reference and an explicitly approved bounded plan. The product direction is clothing commerce, and Workspaces/runtime identifiers use the approved `e-commerce` naming with SQL-safe `e_commerce` PostgreSQL identifiers. The repository uses Yarn Classic 1.22.22 Workspaces with Turborepo orchestration. The Next.js 16.3.2 Storefront includes a Persian RTL three-route OTP login/registration slice, same-origin BFF, Customer session provider, and TanStack Query hooks; `apps/admin` contains the protected Persian RTL login and authenticated root, first-render-safe user-selectable light/dark theming, independent exact Tailwind 4 utilities, application-local shared UI primitives alongside Ant Design, TanStack Query-backed authentication mutations over the existing Axios/BFF security path, JSDOM interaction tests, and Chromium Playwright foundations; `apps/api` contains the strict-TypeScript NestJS Modular Monolith/OpenAPI foundation, independent Admin and Customer identity/session/authentication boundaries, and catalog module; and the root owns repository orchestration.

Persian (`fa-IR`) and right-to-left layout are the accepted frontend language and direction. Admin uses a same-origin Next.js BFF and pre-render Proxy authentication gate. Storefront browsing remains public, and its optional Customer authentication uses a separate same-origin BFF, cookies, session state, and Backend namespace.

The Backend implements the Admin `/api/v1/auth/**` boundary and the Customer `/api/v1/customer-auth/**` OTP request, verification, registration, flow, bootstrap, refresh, and logout contracts, plus protected Category management, bounded protected Product reads, atomic Draft Product/Variant/Inventory creation, Product lifecycle/update, retained Variant update/reactivation, optimistic-version absolute Inventory update, secure Product Image upload/order/replacement/removal and controlled protected/public image content, protected/public singleton rial/toman display-setting routes, and minimum public Category tree plus Active Product summary/detail routes. Customer OTP delivery is isolated behind a server-only Ghasedak adapter; opaque flow authority, Access, and Refresh stay in Customer-specific HttpOnly cookies, while browser JavaScript reads only the session CSRF cookie. The Admin currently provides its protected authentication experience and no catalog frontend routes. Storefront exposes temporary minimal `/auth`, `/auth/verify`, and `/auth/register` forms; final visual design remains deferred pending UI-team input. Storefront Product detail URLs use the immutable Product UUID plus the percent-encoded current full Product name; ID-only and stale-name URLs permanently redirect to that canonical route without persisting a slug. Generated Swagger/OpenAPI remains available at `/api/docs` only in development and test; production documentation is disabled.

Local development uses non-conflicting ports: Storefront `3000`, Admin `3001`, and API `3002`. Application-owned environment values, safe examples, validation behavior, and browser-exposure rules are defined in the [environment strategy](environment.md). The accepted local database contract uses pinned PostgreSQL 18.6 through Docker Compose with isolated development and test databases. The API owns Prisma 7.10 tooling, the implemented Admin, Customer-auth, and catalog persistence boundaries with additive migrations, and the documented [first-Super-Admin provisioner](development/admin-provisioning.md).

GitHub Actions provides the minimal repository quality gate for pull requests and pushes to `main`. It reproduces the frozen Yarn installation and runs Prisma validation/generation, formatting, typecheck, lint, build, all real workspace tests, and the focused Admin production-build Chromium smoke without deployment or database infrastructure. See [continuous integration](development/ci.md).

## Out of scope now

Further schemas/migrations, catalog behavior beyond approved active tasks, infrastructure, deployment, and unapproved dependency changes require separately approved tasks. Microservices, event-driven architecture, Kafka, Kubernetes, Elasticsearch, Redis, recommendation engines, advanced analytics, and speculative shared packages are not initial requirements.

See [product requirements](product/requirements.md), [MVP](product/mvp.md), [system architecture](architecture/system-architecture.md), and [task execution/context-efficiency standards](standards/execution.md).

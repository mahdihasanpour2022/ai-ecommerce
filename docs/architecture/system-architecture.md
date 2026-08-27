# System Architecture

## Target structure

```text
apps/
  storefront/  # Next.js customer experience
  admin/       # Next.js staff experience
  api/         # NestJS REST API
packages/      # Only proven shared tooling/contracts/components
```

Storefront now exists at `apps/storefront`; Admin and API remain target boundaries until their approved bootstrap tasks. The original Next.js starter and its dependency baseline were preserved during placement, while the root owns Yarn Workspace and Turborepo orchestration.

```mermaid
flowchart LR
  Customer -->|HTTPS| Storefront[Storefront\nexample.com]
  Staff -->|HTTPS| Admin[Admin Panel\nadmin.example.com]
  Storefront -->|Direct browser HTTPS REST /api/v1| API[Backend API\napi.example.com]
  Admin -->|Direct browser HTTPS REST /api/v1| API
  API --> PostgreSQL[(PostgreSQL)]
```

## Boundaries and rationale

Storefront and Admin are separate Next.js applications because their audiences, security exposure, UI systems, performance/SEO needs, release risk, and navigation differ. They share one API so business rules, authorization, and transactional consistency have one backend authority.

A Yarn Workspaces/Turborepo monorepo supports coordinated contract changes, reuse of the existing dependency installation, shared quality configuration, and selective builds while retaining independent deployability. Sprint 0 configures the existing Yarn environment rather than replacing it. Shared packages are created only after a real cross-application need; application-specific business logic does not migrate into generic packages by default.

The API begins as a domain-oriented **Modular Monolith**. Modules own cohesive behavior and expose explicit internal boundaries while sharing one deployment and database. This minimizes distributed-system cost. Microservices are deferred until measurable ownership, scale, isolation, or deployment requirements justify them.

## Communication boundaries

Browsers initially communicate directly with the API over versioned HTTPS REST contracts. Admin uses credentialed Axios requests from `admin.example.com` to `api.example.com`; Storefront follows the same direct-API principle where browser requests are required. Explicit credentialed CORS is therefore part of the boundary. A Backend for Frontend (BFF) is **Deferred**, not permanently rejected, and may be reconsidered only for a concrete requirement. Clients never connect directly to the database and never serve as the authorization authority. Internal module calls remain in-process initially. External services must be isolated behind purpose-specific integration boundaries with timeouts and failure handling.

Expected domains are placeholders. Authentication defines the accepted cookie and credentialed-CORS baseline, while backend architecture defines minimum observability. Exact environment origins, cookie names/development behavior, TLS and deployment topology, CDN/media hosting, providers, and advanced observability tooling remain Open.

See [frontend architecture](frontend-architecture.md), [backend architecture](backend-architecture.md), and [API conventions](../api/conventions.md).

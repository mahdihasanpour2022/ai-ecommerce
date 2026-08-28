# Automotive Parts Commerce

Yarn Workspaces/Turborepo monorepo for a Persian RTL automotive-parts commerce platform. The engineering foundation and initial Admin identity persistence/provisioning boundary are implemented; login, browser authentication, catalog, purchasing, deployment, and production infrastructure remain planned work.

## Repository applications

| Application | Workspace | Local URL | Current reality |
| --- | --- | --- | --- |
| Storefront | `@automotive-commerce/storefront` | `http://localhost:3000` | Preserved Next.js starter and future customer experience |
| Admin | `@automotive-commerce/admin` | `http://localhost:3001` | Minimal Persian RTL Next.js foundation; no authentication or business UI |
| API | `@automotive-commerce/api` | `http://localhost:3002` | NestJS foundation plus Admin identity schema/migration and trusted first-Admin command; no business/login endpoint or long-running runtime database integration |

`packages/` is intentionally empty until a demonstrated cross-application need justifies a shared package.

## Prerequisites and installation

- Node.js 24, matching CI and the supported application toolchain.
- Yarn Classic `1.22.22`.
- Docker with Compose v2 only when using the local PostgreSQL workflow.

Install Yarn Classic if it is not already available, then reproduce the locked dependencies from the repository root:

```bash
npm install --global yarn@1.22.22
yarn install --frozen-lockfile
```

Do not use npm or pnpm for repository dependency operations, and do not regenerate `yarn.lock` during normal setup.

## Run the applications

Run each required application in its own terminal:

```bash
# Storefront (the root shortcut starts only this Workspace)
yarn dev

# Admin
yarn workspace @automotive-commerce/admin dev

# API
yarn workspace @automotive-commerce/api dev
```

The API defaults to development mode and port `3002`. In development and test, Swagger UI is available at `http://localhost:3002/api/docs` and the generated OpenAPI JSON at `http://localhost:3002/api/docs-json`. `/api/v1` is reserved for future REST contracts; it currently contains no business route. Production registers neither documentation route.

No environment file is required to run the current application foundations. Each Workspace owns a safe `.env.example`; the API reads overrides from the invoking process and does not load its example automatically. See the [environment strategy](docs/environment.md) before adding or supplying configuration.

## Quality commands

```bash
yarn format:check
yarn typecheck
yarn lint
yarn build
yarn test
```

These root commands orchestrate every applicable Workspace. The current real test graph contains API environment, Swagger, Prisma schema, and first-Admin provisioning coverage; database-backed provisioning tests run when the isolated `TEST_DATABASE_URL` contract is supplied. No placeholder frontend tests exist. `yarn format` writes only the repository's configured source/configuration scope, so keep write-mode formatting limited to task-relevant files.

GitHub Actions runs the same quality foundation for pull requests and pushes to `main`, including frozen installation and Prisma validation/generation. See [continuous integration](docs/development/ci.md) for the exact gates and security boundary.

## Local PostgreSQL and Prisma

Docker Compose provides optional local PostgreSQL 18.6 with isolated `automotive_dev` and `automotive_test` databases:

```bash
yarn db:config
yarn db:start
yarn db:health
yarn db:verify
yarn db:stop
```

Read [Local PostgreSQL Development](docs/development/local-postgresql.md) before using the intentionally destructive, allowlisted reset commands.

Prisma owns the implemented Admin identity/session persistence schema and reviewed migration. Prisma CLI commands require `DATABASE_URL` in the invoking process; validation and generation do not require a live database:

```bash
yarn workspace @automotive-commerce/api prisma:validate
yarn workspace @automotive-commerce/api prisma:generate
```

Schema changes and migrations require separately approved work and the SQL review process in the [Prisma workflow](docs/development/prisma.md). The one-shot trusted first-Super-Admin command is documented separately in [First Super Admin Provisioning](docs/development/admin-provisioning.md); it is not a login flow or public API.

## Project context

- [Project overview](docs/00-project-overview.md)
- [Roadmap](docs/roadmap.md)
- [System architecture](docs/architecture/system-architecture.md)
- [Engineering standards](docs/standards/general.md)
- [Testing and Definition of Done](docs/standards/testing.md)
- [Security baseline](docs/security/baseline.md)
- [Application boundaries](apps/README.md)
- [Shared-package boundary](packages/README.md)

Documentation distinguishes current repository reality from planned behavior. A roadmap or feature specification is not implementation authorization.

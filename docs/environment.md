# Environment Strategy

Environment configuration is application-owned, validated at its consumption boundary, and secret by default. Real `.env*` files are ignored. Each application tracks only a safe `.env.example` containing non-sensitive reference values or an explicit statement that it currently has no variables.

## Local applications

| Application | Workspace | Local port | Development origin | Environment values |
| --- | --- | ---: | --- | --- |
| Storefront | `@automotive-commerce/storefront` | 3000 | `http://localhost:3000` | None currently |
| Admin | `@automotive-commerce/admin` | 3001 | `http://localhost:3001` | None currently |
| API | `@automotive-commerce/api` | 3002 | `http://localhost:3002` | `NODE_ENV`, `PORT` |

The future REST base URL is `http://localhost:3002/api/v1`. Swagger UI is available at `http://localhost:3002/api/docs` in development and test only. The two browser origins above are the development-origin contract for the future credentialed CORS task; S0-T09 does not enable CORS.

Run an application with its Workspace command:

```text
yarn workspace @automotive-commerce/storefront dev
yarn workspace @automotive-commerce/admin dev
yarn workspace @automotive-commerce/api dev
```

The Storefront and Admin scripts pin their development and production-server ports. The API uses its validated `PORT` default, so no local file is required. The API reads its process environment directly; its `.env.example` documents safe values but is not loaded automatically. Supply an API override through the invoking shell or process manager. Next.js owns frontend `.env*` loading when those applications eventually introduce variables.

## Current value contract

| Name | Owner | Type and allowed values | Requirement/default | Exposure |
| --- | --- | --- | --- | --- |
| `NODE_ENV` | API | `development`, `test`, or `production` | Optional; defaults to `development` | Server-only, non-secret |
| `PORT` | API | Base-10 integer from 1 through 65535 | Optional; defaults to `3002` | Server-only, non-secret |
| `DATABASE_URL` | API Prisma CLI / future runtime | PostgreSQL connection URL for `automotive_dev` | Required for Prisma configuration; not consumed by API runtime yet | Server-only; credential-bearing |
| `TEST_DATABASE_URL` | Future API test tooling | PostgreSQL connection URL for `automotive_test` | Reserved; not consumed yet | Server-only; credential-bearing |

The API parses configuration before creating the NestJS application. Invalid values stop startup with an actionable error that describes the accepted shape without echoing the supplied value.

Next.js also assigns its own standard `NODE_ENV`; it is framework-owned rather than an application setting and must not be overridden with a nonstandard value. Neither frontend currently consumes an application environment variable.

## Adding configuration later

- Assign every new value to one application and document its name, type, requirement/default, and exposure.
- Validate server/runtime values before dependent services start. Errors may name the variable and accepted shape, but must not print its value.
- Treat every variable as server-only unless browser exposure is necessary and safe. A `NEXT_PUBLIC_` name is a deliberate public contract: Next.js inlines it into browser JavaScript at build time, so it must never contain credentials, tokens, private endpoints, or other secrets.
- Keep real credentials in ignored local files or an approved deployment secret mechanism. Examples contain safe placeholders only.
- If an environment value changes the output of a cacheable Turborepo task, add it to that task's `env` list (or `globalEnv` only when it truly affects every task). Do not use pass-through configuration for build-affecting values because it does not invalidate cached output.

No current environment value changes compiled output, so `turbo.json` intentionally has no environment hash inputs. Add them alongside the first real build-affecting value rather than speculating now.

The safe local PostgreSQL values, lifecycle commands, isolation, and guarded reset behavior are canonical in [Local PostgreSQL Development](development/local-postgresql.md). The tracked API example contains fixed loopback-only development credentials; they are public non-production values and must never be reused for a deployed environment.

Prisma CLI commands consume `DATABASE_URL` through `apps/api/prisma.config.ts`. Prisma 7 does not load the tracked example or ignored `.env` files automatically in this repository; supply the value through the invoking shell or process manager. See the [Prisma workflow](development/prisma.md).

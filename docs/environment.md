# Environment Strategy

Environment configuration is application-owned, validated at its consumption boundary, and secret by default. Real `.env*` files are ignored. Each application tracks only a safe `.env.example` containing non-sensitive reference values or an explicit statement that it currently has no variables.

## Local applications

| Application | Workspace | Local port | Development origin | Environment values |
| --- | --- | ---: | --- | --- |
| Storefront | `@automotive-commerce/storefront` | 3000 | `http://localhost:3000` | None currently |
| Admin | `@automotive-commerce/admin` | 3001 | `http://localhost:3001` | Public API base URL below |
| API | `@automotive-commerce/api` | 3002 | `http://localhost:3002` | Runtime/database, authentication, and Product Image storage values below |

The REST base URL is `http://localhost:3002/api/v1`. Swagger UI is available at `http://localhost:3002/api/docs` in development and test only. The authentication backend enables credentialed CORS for exact configured origins; the accepted Admin development origin is `http://localhost:3001`.

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
| `DATABASE_URL` | API Prisma CLI / trusted Admin provisioner | PostgreSQL connection URL for the explicitly selected target | Required for Prisma configuration and provisioning; no implicit file loading | Server-only; credential-bearing |
| `TEST_DATABASE_URL` | API persistence integration tests | PostgreSQL connection URL for `automotive_test` | Optional outside database integration validation | Server-only; credential-bearing |
| `PRODUCT_IMAGE_STORAGE_ROOT` | API Product Image storage | Non-root filesystem path resolved by the API | Required in development/test; disabled and ignored in production | Server-only, non-secret |
| `ADMIN_BOOTSTRAP_EMAIL` | Trusted Admin provisioner | Email, trimmed/lowercased; maximum 254 characters | Required only for the one-shot provisioning process | Server-only, identity data |
| `ADMIN_BOOTSTRAP_DISPLAY_NAME` | Trusted Admin provisioner | Trimmed non-control string; maximum 120 characters | Required only for the one-shot provisioning process | Server-only, identity data |
| `ADMIN_BOOTSTRAP_PASSWORD` | Trusted Admin provisioner | 15–128 characters; no silent normalization/truncation | Required only for the one-shot provisioning process | Secret; never tracked, logged, or passed in argv |
| `ADMIN_BOOTSTRAP_PASSWORD_CONFIRM` | Trusted Admin provisioner | Exact confirmation | Required only for the one-shot provisioning process | Secret; never tracked, logged, or passed in argv |

The API parses configuration before creating the NestJS application. Invalid values stop startup with an actionable error that describes the accepted shape without echoing the supplied value.

The `ADMIN_BOOTSTRAP_*` variables are intentionally absent from `.env.example` values and are not runtime application configuration. Supply them only to the trusted one-shot command through the process contract in [First Super Admin Provisioning](development/admin-provisioning.md); compile before secret injection.

Next.js also assigns its own standard `NODE_ENV`; it is framework-owned rather than an application setting and must not be overridden with a nonstandard value. The Storefront currently consumes no application environment variable. The Admin consumes the public, non-secret value below.

| Name | Owner | Type and allowed values | Requirement/default | Exposure |
| --- | --- | --- | --- | --- |
| `NEXT_PUBLIC_API_BASE_URL` | Admin | Absolute HTTP(S) REST base URL without credentials, query, or fragment | Optional; defaults to `http://localhost:3002/api/v1` | Public and build-time inlined; never contains credentials or secrets |

Set `NEXT_PUBLIC_API_BASE_URL` in the Admin build environment when the API is not at the accepted local default. Because Next.js inlines this value into browser JavaScript, changing it requires a new Admin build; Turborepo includes it in the Admin build cache inputs.

## Accepted Sprint 1 configuration contract

The implemented authentication backend consumes and validates the access/refresh lifetimes, JWT, CORS, Argon2, login/refresh throttles, CSRF keyring, and refresh-recovery values below before application creation. `.env.example` contains only non-secret defaults and intentionally unusable secret placeholders.

| Name | Type/default | Exposure and purpose |
| --- | --- | --- |
| `ACCESS_TOKEN_TTL` | Duration; default `15m` | Server-only, non-secret access lifetime |
| `REFRESH_TOKEN_TTL` | Duration; default `7d` | Server-only, non-secret refresh/session lifetime |
| `REFRESH_REUSE_GRACE_SECONDS` | Integer; default `10` | Server-only, non-secret bounded recovery window |
| `AUTH_JWT_PRIVATE_KEY` | Ed25519 private key; required | Secret active signing key; never tracked or logged |
| `AUTH_JWT_PUBLIC_KEYS` | Trusted Ed25519 verification key ring; required | Server-only integrity-sensitive configuration containing active/retiring public keys keyed by `kid` |
| `AUTH_JWT_ACTIVE_KID` | Non-empty key ID; required | Server-only, non-secret selector that must exist in the trusted key ring |
| `AUTH_JWT_ISSUER` | Exact string; default `automotive-commerce-api` | Server-only, non-secret required `iss` value |
| `AUTH_JWT_AUDIENCE` | Exact string; default `automotive-commerce-admin` | Server-only, non-secret required `aud` value |
| `AUTH_REFRESH_RECOVERY_KEYRING` | Exact JSON `{ "activeKid": "kid", "keys": { "kid": "base64" } }`; required | Secret active/retiring exact 32-byte AES-256-GCM keys; separate from JWT, CSRF, throttle, password, and database material |
| `CORS_ALLOWED_ORIGINS` | Exact origin list; environment-specific | Server-only, non-secret; no wildcard, broad regex, or arbitrary reflection |
| `AUTH_ARGON2_MEMORY_KIB` | Integer; default `65536` | Server-only, non-secret password-hash memory cost |
| `AUTH_ARGON2_TIME_COST` | Integer; default `3` | Server-only, non-secret password-hash iteration cost |
| `AUTH_ARGON2_PARALLELISM` | Integer; default `1` | Server-only, non-secret password-hash parallelism |
| `AUTH_LOGIN_ACCOUNT_FAILURE_LIMIT` | Integer; default `5` | Server-only, non-secret failures per account/window |
| `AUTH_LOGIN_WINDOW_SECONDS` | Integer; default `900` | Server-only, non-secret account/IP login window |
| `AUTH_LOGIN_INITIAL_DELAY_SECONDS` | Integer; default `30` | Server-only, non-secret initial account backoff |
| `AUTH_LOGIN_MAX_DELAY_SECONDS` | Integer; default `900` | Server-only, non-secret maximum account backoff |
| `AUTH_LOGIN_IP_LIMIT` | Integer; default `20` | Server-only, non-secret requests per IP/login window |
| `AUTH_LOGIN_THROTTLE_HMAC_KEY` | 256-bit or stronger HMAC key; required | Secret server-only key for enumeration-safe account/identifier throttle buckets; independent from JWT, recovery, password, and database material |
| `AUTH_CSRF_HMAC_KEYS` | JSON object mapping safe key IDs to base64 256-bit-or-stronger HMAC keys; required | Independent secret active/retiring keyring that reproduces stable session-bound CSRF credentials without raw persistence |
| `AUTH_CSRF_ACTIVE_KID` | Non-empty key ID; required | Server-only selector that must exist in `AUTH_CSRF_HMAC_KEYS`; retiring keys remain through the maximum absolute session lifetime |
| `AUTH_REFRESH_SESSION_LIMIT_PER_MINUTE` | Integer; default `10` | Server-only, non-secret refresh requests per active session |
| `AUTH_REFRESH_IP_LIMIT_PER_MINUTE` | Integer; default `30` | Server-only, non-secret refresh requests per IP |

JWT verification accepts only configured keys and exact issuer/audience values; a token header cannot introduce trust material. The independent CSRF HMAC keyring derives the same 256-bit session credential at login/bootstrap while persistence retains only SHA-256; losing a still-required retiring key makes bootstrap fail closed. The refresh recovery JSON names exactly one active encryption key and may retain older keys needed to decrypt unexpired envelopes; keys must be exact 32-byte base64 values and unique/independent. Recovery keys decrypt only the at-most-ten-second authenticated envelope. Deployment secret injection and operational rotation runbooks remain release concerns, but source-controlled secret defaults are prohibited.

## Adding configuration later

- Assign every new value to one application and document its name, type, requirement/default, and exposure.
- Validate server/runtime values before dependent services start. Errors may name the variable and accepted shape, but must not print its value.
- Treat every variable as server-only unless browser exposure is necessary and safe. A `NEXT_PUBLIC_` name is a deliberate public contract: Next.js inlines it into browser JavaScript at build time, so it must never contain credentials, tokens, private endpoints, or other secrets.
- Keep real credentials in ignored local files or an approved deployment secret mechanism. Examples contain safe placeholders only.
- If an environment value changes the output of a cacheable Turborepo task, add it to that task's `env` list (or `globalEnv` only when it truly affects every task). Do not use pass-through configuration for build-affecting values because it does not invalidate cached output.

`NEXT_PUBLIC_API_BASE_URL` changes compiled Admin output and is therefore included in the root build task's environment hash inputs. Server-only API values remain runtime-owned and do not enter frontend bundles.

The safe local PostgreSQL values, lifecycle commands, isolation, and guarded reset behavior are canonical in [Local PostgreSQL Development](development/local-postgresql.md). The tracked API example contains fixed loopback-only development credentials; they are public non-production values and must never be reused for a deployed environment.

Prisma CLI commands consume `DATABASE_URL` through `apps/api/prisma.config.ts`. Prisma 7 does not load the tracked example or ignored `.env` files automatically in this repository; supply the value through the invoking shell or process manager. See the [Prisma workflow](development/prisma.md).

# Sprint 0 Done

## S0-T01 — Inventory Existing Starter and Propose Placement

**Completed:** 2026-08-27

**Result:** Inventoried the clean standalone Next.js/Yarn starter and recommended preserving it as the future `apps/storefront`. Full evidence is in [the S0-T01 inventory](s0-t01-inventory.md); its pnpm migration recommendation was later superseded by the accepted Yarn Workspaces decision.

### Validation

Repository, manifest, Yarn lock/direct resolutions, installed tool state, and read-only Git state were inspected; `yarn check --integrity` passed. No automated test was required for this inventory/documentation task.

**Important Decisions:** This is a recommendation, not placement or migration authorization. Existing useful dependencies remain preserved without becoming mandatory architecture.

**Files / Areas Changed:** Sprint 0 execution records only; no application, dependency, lockfile, Git index, or history changes.

**Follow-ups:** Owner approval is required for the Storefront placement recommendation and S0-T02's Yarn Workspaces configuration. The cancelled pnpm task was not completed and is not recorded as Done.

## S0-T02 — Verify and Configure Yarn Workspaces

**Completed:** 2026-08-27

**Result:** Kept Yarn Classic `1.22.22` and added `apps/*` and `packages/*` Workspace discovery to the existing private root manifest. The superseded pnpm formulation remains cancelled; this record covers only the replacement Yarn task.

### Validation

Yarn reported an empty valid workspace graph before child packages exist. Default integrity and dependency-tree checks passed after an offline frozen metadata refresh; dependency declarations and `yarn.lock` hash `e85042f52ad75f326dec45d86d79612e67bb533f` remained unchanged. No automated test was required because this task changed package-manager configuration without runtime behavior.

**Important Decisions:** No Yarn-major change, dependency operation, Turborepo implementation, placeholder workspace, or network download was required.

**Files / Areas Changed:** Root `package.json` Workspace globs and Sprint 0 execution records only.

**Follow-ups:** S0-T03 may establish durable top-level application/package directory boundaries without moving or bootstrapping applications.

## S0-T03 — Establish Monorepo Application and Package Layout

**Completed:** 2026-08-27

**Result:** Established durable `apps/` and `packages/` boundaries with concise ownership documentation. The reserved Storefront, Admin, and API targets are discoverable without scaffolding them, and the root Next.js starter remains the transitional runnable application until S0-T05.

### Validation

Boundary contents and local documentation links were inspected; no child application, child `package.json`, placeholder package, or `.gitkeep` was created. Yarn Workspace discovery remained valid and empty. Root manifest, dependency declarations, `yarn.lock`, starter source/configuration, Git index, and Git history remained unchanged. No automated test was required because runtime behavior did not change.

**Important Decisions:** `packages/` accepts a child only after demonstrated cross-application reuse and separate approval. Application target names reserve ownership but do not claim implementation.

**Files / Areas Changed:** `apps/README.md`, `packages/README.md`, and Sprint 0 execution records only.

**Follow-ups:** S0-T04 is prepared for separate implementation approval; Turborepo has not been added or configured.

## S0-T04 — Configure Minimal Turborepo Orchestration

**Completed:** 2026-08-27

**Result:** Added exact Turborepo `2.10.12` to the Yarn Classic root and configured a minimal dependency-aware task graph. Direct root starter commands remain intact; `build:all` and `lint:all` orchestrate the transitional root now and future workspaces without recursion. Remote caching is disabled.

### Validation

Context7 and the installed Turbo schema were consulted for current configuration behavior. JSON parsing, Turbo version resolution, build/lint/typecheck/test dry-run graphs, Yarn Workspace discovery, and Yarn integrity passed. `yarn lint:all` passed, and `yarn build:all` passed with the existing starter's required Google Fonts network access. The lockfile contains only Turbo and its platform-specific optional packages; starter source/configuration hashes remained unchanged. No automated test was required because runtime behavior did not change.

**Important Decisions:** Turbo is pinned exactly. Build caches `.next`/`dist` outputs while excluding `.next/cache`; lint/typecheck have log-only cache output and test declares only `coverage`. Typecheck/test receive no fake root scripts and remain empty until real package scripts exist. The generated local `.turbo` cache is ignored.

**Files / Areas Changed:** `.gitignore`, `package.json`, `yarn.lock`, `turbo.json`, and Sprint 0 execution records.

**Follow-ups:** S0-T05 is prepared for separate implementation approval; the root starter has not been moved or modified.

## S0-T05 — Place and Bootstrap Storefront

**Completed:** 2026-08-27

**Result:** Relocated the preserved Next.js 16.3.2 starter into the private `@automotive-commerce/storefront` Yarn Workspace. The root is now the `automotive-commerce` orchestration package, and its development/start commands delegate to Storefront while build/lint run through Turbo.

### Validation

Context7 and all task-required installed Next.js 16.3.2 guides were read before implementation. All 13 original source, asset, and configuration blobs matched their Storefront destinations exactly before root removal and again against Git after relocation. Yarn discovered only the Storefront workspace; integrity passed. Filtered Storefront lint/build and repository-wide `yarn lint`/`yarn build` passed, producing the unchanged `/` and `/_not-found` routes. Runtime/development dependency names and ranges were preserved exactly, Turbo remained the sole root dependency, `yarn.lock` was unchanged, and nested generated output was verified ignored. No automated test was required because observable starter behavior did not change.

**Important Decisions:** The workspace is named `@automotive-commerce/storefront`. No regeneration, dependency pruning/upgrades, shared package, `outputFileTracingRoot`, or `transpilePackages` configuration was needed. Root-anchored generated-output ignores were generalized for nested workspaces.

**Files / Areas Changed:** Relocated the root `app/`, `public/`, ESLint, Next.js, PostCSS, and TypeScript files under `apps/storefront`; added its manifest; updated root `.gitignore`, `package.json`, `turbo.json`, application/system reality documentation, and Sprint 0 execution records. The lockfile did not change.

**Follow-ups:** S0-T06 is prepared for separate implementation approval; Admin has not been bootstrapped.

## S0-T06 — Bootstrap Admin Application

**Completed:** 2026-08-28

**Result:** Created the private `@automotive-commerce/admin` Next.js 16.3.2 workspace with strict TypeScript, application-local ESLint/configuration, and a minimal semantic Persian RTL Server Component foundation. No authentication, API integration, Client Component, business UI, or UI framework was introduced.

### Validation

Context7 and both task-required installed Next.js 16.3.2 guides were read before implementation. Yarn discovered Admin and Storefront with no workspace mismatches; offline frozen installation metadata refresh and integrity passed. Filtered Admin lint/build and repository-wide lint/build passed for both applications. Generated Admin HTML confirmed the static `/` route, `lang="fa-IR"`, `dir="rtl"`, Persian title/description/content, and the expected semantic heading. Source/dependency inspection confirmed no Client Component, API/auth behavior, Ant Design, or unapproved version range; `yarn.lock` remained unchanged. No automated test was required because the foundation contains no domain or interactive behavior.

**Important Decisions:** Admin reuses only the exact existing Next.js 16.3.2, React 19.2.8, TypeScript, and ESLint ranges. Plain local CSS provides the foundation; Ant Design remains deferred until concrete approved feature work.

**Files / Areas Changed:** Added seven source/configuration files under `apps/admin`; updated application, project-overview, system-reality, and Sprint 0 execution documentation. Root orchestration, Storefront source, dependencies, and lockfile were unchanged.

**Follow-ups:** S0-T07 is prepared for separate implementation approval; no NestJS/API files or dependencies have been added.

## S0-T07 — Bootstrap NestJS API and OpenAPI Foundation

**Completed:** 2026-08-28

**Result:** Created the private `@automotive-commerce/api` NestJS 12 Workspace as an empty strict-TypeScript Modular Monolith foundation. Future REST contracts use the `/api/v1` prefix. Generated Swagger UI and JSON are available at `/api/docs` and `/api/docs-json` in development/test, while production registers neither documentation route. No controller, business module, database, authentication, CORS, or speculative infrastructure was introduced.

### Validation

Current official NestJS guidance was reviewed through Context7 before implementation, and exact package compatibility/engine metadata was reviewed before installation. `yarn workspace @automotive-commerce/api typecheck`, `lint`, `build`, and `test` passed. The focused HTTP suite passed all 3 cases, proving development/test Swagger availability, production unavailability, and an empty generated OpenAPI `paths` object with no invented endpoint. Repository-wide typecheck, lint, build, and Turbo test gates passed across all applicable Workspaces. After the owner reported that the legacy `moduleResolution: node` alias was flagged by a TypeScript 6-aware editor, the API was aligned with the installed NestJS 12 CommonJS template's `NodeNext` module/resolution settings and exact TypeScript `6.0.3`. Direct `tsc --project ... --noEmit` checks then passed for Admin, Storefront, and all API source/build/test configurations, followed by uncached repository-wide typecheck, lint, build, and test passes. Yarn discovered Admin, API, and Storefront without mismatches, and `yarn check --integrity` passed. Generated API outputs are ignored, and the reviewed lockfile delta contains the approved Backend/test/lint toolchain plus consolidated selectors for compatible existing resolutions.

**Important Decisions:** NestJS runtime packages are pinned to `12.0.1`, Swagger to `12.0.0`, and the CLI to `12.0.0`. The API pins TypeScript `6.0.3`, matching the NestJS 12 toolchain and remaining within TypeScript-ESLint `8.68.0`'s supported `<6.1.0` range. `module` and `moduleResolution` both use `NodeNext`; the deprecated `node`/`node10` resolution alias is not suppressed. Focused integration coverage uses Nest testing, Supertest, and Node's built-in test runner without adding a second general-purpose test framework. Swagger is enabled only for `development` and `test`; production protection remains a separate future decision.

**Files / Areas Changed:** Added the `apps/api` manifest, strict TypeScript/Nest/ESLint configuration, root module/bootstrap, and Swagger exposure integration test; updated generated-output ignores, `yarn.lock`, application/project/system/backend/API reality documentation, and Sprint 0 execution records. Storefront and Admin source/manifests were not modified.

**Follow-ups:** S0-T08 is prepared for separate implementation approval to align TypeScript, lint, and formatting conventions across the established Workspaces.

## S0-T08 — Align TypeScript, Lint, and Formatting

**Completed:** 2026-08-28

**Result:** Reconciled and completed the repository quality baseline under the owner's explicit Prettier decision. Prettier is the official formatter through one root configuration, one root ignore policy, and standard `yarn format`/`yarn format:check` commands. TypeScript strictness and explicit ESLint behavior remain aligned across Storefront, Admin, and API while preserving Next.js Bundler and NestJS NodeNext requirements. The 14 existing files reported by the configured formatting gate were baselined through an explicit file list rather than a blind repository-wide write.

### Validation

Current Prettier guidance was reviewed through Context7. Registry metadata confirmed root-pinned Prettier `3.9.6` is the latest stable release, supports Node `>=14`, and the newer `4.0.0-alpha.13` is a prohibited prerelease. `yarn format:check` passed across 28 configured files and SHA-256 comparison proved check-only mode modified zero files. A temporary unformatted root JavaScript probe proved the same command returns exit code `1` without modifying the file; the probe was then removed. Uncached repository-wide typecheck, lint, build, and test graphs passed; all three API Swagger exposure tests remained green. Yarn discovered all three Workspaces without mismatches, integrity passed, frozen offline installation was already up to date, `git diff --check` passed, and no manifest or lockfile delta was introduced during this approved reconciliation.

**Important Decisions:** Prettier owns formatting and ESLint owns correctness diagnostics. One root configuration is sufficient; no Workspace-specific Prettier configuration or shared configuration package is justified. Write-mode formatting stays scoped to task-relevant files, while repository-wide check-only validation is permitted and suitable for future CI. Applicable source/configuration changes cannot move to Done until changed files conform and `yarn format:check` passes. Documentation, lockfiles, dependencies, and generated output remain outside automated formatting scope.

**Files / Areas Changed:** Applied the approved root Prettier style to the 14 explicitly reported application/configuration files and updated Sprint 0 execution records. The already-present root Prettier configuration, ignore rules, scripts, strict TypeScript/ESLint alignment, and canonical Definition of Done standards were verified rather than duplicated. No dependency, lockfile, runtime behavior, API contract, database, authentication, or infrastructure change was made in this reconciliation pass.

**Follow-ups:** S0-T09 is prepared for separate implementation approval to define validated environment configuration, safe examples, local ports, and development-origin conventions.

## S0-T09 — Define Environment Strategy

**Completed:** 2026-08-28

**Result:** Established one secret-safe environment contract for all three applications. Storefront, Admin, and API now use non-conflicting local ports `3000`, `3001`, and `3002`; the API owns a typed fail-fast parser for `NODE_ENV` and `PORT`; and each Workspace has a trackable safe `.env.example` while real environment files remain ignored. The canonical strategy documents ownership, defaults, local origins, browser-exposure rules, error redaction, and future Turborepo cache-input requirements.

### Validation

Current Next.js and Turborepo environment guidance was reviewed through Context7 and the installed Next.js 16.3.2 guide. Focused API typecheck, lint, build, and test commands passed; all 15 tests passed, covering defaults, every supported runtime environment, explicit ports, representative invalid values, and existing development/test/production Swagger exposure. Runtime smoke checks proved default startup on port `3002`, Swagger HTTP `200`, the empty reserved API prefix HTTP `404`, and nonzero fail-fast startup with an actionable invalid-port message that did not echo the supplied value. Uncached repository-wide typecheck, lint, build, and test graphs passed with zero cached tasks, and `yarn format:check` passed. Workspace discovery, Yarn integrity, frozen offline installation, script/example assertions, ignore-rule checks, centralized environment-read inspection, and `git diff --check` passed. No dependency declaration or `yarn.lock` change was introduced.

**Important Decisions:** The frontends currently require no application environment variable and expose no `NEXT_PUBLIC_` value. The API reads its process environment directly; its example file is a safe contract reference, not an implicit dotenv loader. `NODE_ENV` defaults to `development`, `PORT` defaults to `3002`, and invalid values are rejected before Nest application creation. Current values are runtime-only and do not affect compiled output, so no speculative `turbo.json` environment hash input was added; the first real build-affecting value must add its owning task's `env` entry. The documented browser origins define a future credentialed-CORS contract but do not enable CORS.

**Files / Areas Changed:** Added three application-local `.env.example` files, the API environment parser and focused tests, explicit frontend dev/start ports, safe ignore exceptions, and the canonical environment strategy; updated API bootstrap/Swagger typing, project/system/standards/Sprint context, and Sprint 0 execution records. No dependency, lockfile, HTTP contract, CORS, authentication, database, deployment, or business behavior was added.

**Follow-ups:** S0-T10 is prepared for separate implementation approval to establish the lightweight local PostgreSQL lifecycle, health, test-database, and reset strategy. Production domains, deployment secrets, and final CORS implementation remain deferred to their approved workstreams.

## S0-T10 — Establish Local PostgreSQL Development

**Completed:** 2026-08-28

**Result:** Selected Docker Compose as the reproducible local PostgreSQL boundary and added an exact `postgres:18.6-alpine3.24` service bound only to `127.0.0.1:5432`. The configuration persists PostgreSQL 18 data in a named volume, creates isolated `automotive_dev` and `automotive_test` databases, exposes lifecycle/health/isolation commands, and provides guarded resets that accept only those two exact targets. Safe local connection references reserve the future Prisma contract without making the API consume them or creating application schema.

### Validation

Current PostgreSQL 18, Docker Compose, official Postgres image, and Prisma supported-database documentation were reviewed; Prisma confirms support for PostgreSQL through version 18, and official release/image records confirm stable PostgreSQL `18.6` and the selected image tag. Prettier parsed and formatted `compose.yaml`, and `node --check scripts/local-postgres.mjs` passed. `yarn format:check` passed for the expanded configured scope. Executable safety checks passed for missing, arbitrary, production-like, extra-argument, and both allowlisted reset routes: rejected targets stopped before Docker, while allowlisted targets reached the Docker prerequisite. Manifest/configuration assertions, environment ignore checks, destructive-command inspection, Workspace discovery, frozen offline installation, Yarn integrity, dependency/lockfile scope, and `git diff --check` passed.

Docker-dependent validation was unavailable on this host: neither Docker/Desktop, native PostgreSQL tooling/service, nor usable WSL was installed. Therefore `yarn db:config`, image pull, container start/readiness, health, development/test connection isolation, live reset, persistence across stop/restart, and stop were not executed and are not claimed as passing. `yarn db:config` was executed only far enough to verify its actionable missing-Docker failure.

**Important Decisions:** Docker Compose is the repository contract because native PostgreSQL lifecycle and authentication vary by host. The current stable PostgreSQL `18.6` official Alpine 3.24 image is pinned exactly; PostgreSQL 19 beta is a prohibited prerelease. PostgreSQL 18 data mounts at `/var/lib/postgresql` per the official image contract. Local credentials are fixed, loopback-only, public non-production values that must never be reused in deployment. Normal stop preserves data, no broad volume-deletion helper exists, and reset commands can drop only `automotive_dev` or `automotive_test` through the named Compose service.

**Files / Areas Changed:** Added root `compose.yaml`, PostgreSQL test-database initialization SQL, the guarded local lifecycle wrapper, root database/formatting scripts, safe API connection references, canonical local PostgreSQL documentation, and project/database/environment/Sprint execution records. No dependency, `yarn.lock`, Prisma, application schema, API database integration, HTTP contract, production infrastructure, or business behavior was added.

**Follow-ups:** Install/start Docker Compose before relying on local database commands and execute the unrun live validation sequence on a Docker-capable host. S0-T11 is prepared for separate implementation approval to bootstrap Prisma against this connection contract without inventing product schema.

<!-- Append concise records with Result, a `### Validation` section listing only checks actually executed, Important Decisions, Files / Areas Changed, and Follow-ups. Add Completed only when the date is reliable. -->

# Current Task

## Task ID

S0-T09

## Title

Define Environment Strategy

## Status

Current

## Goal

Define and implement validated, secret-safe environment configuration for Storefront, Admin, and API, including predictable local ports and development-origin conventions.

## Why This Task Exists

The three application foundations now exist, but environment values are not yet owned or validated consistently. Reproducible local development and future security-sensitive configuration require explicit application boundaries, safe examples, and fail-fast validation without committing secrets.

## Required Context

- `docs/sprints/sprint-00.md`
- `docs/00-project-overview.md`
- `docs/architecture/system-architecture.md`
- `docs/architecture/frontend-architecture.md`
- `docs/architecture/backend-architecture.md`
- `docs/api/conventions.md`
- `docs/security/baseline.md`
- `docs/standards/general.md`
- `docs/standards/frontend.md`
- `docs/standards/backend.md`
- `docs/standards/testing.md`
- `docs/standards/git.md`
- `.gitignore`
- `package.json`
- `turbo.json`
- all three Workspace manifests and current environment reads

## Scope

- Inventory current runtime/build-time environment reads and assign each value to its owning application.
- Define environment naming, required/optional/default behavior, parsing, validation, and failure behavior without exposing secrets.
- Establish predictable non-conflicting local ports and development browser/API origin conventions for all three applications.
- Add safe tracked example files and concise setup documentation; keep real environment files ignored.
- Add focused automated coverage for validation behavior where runtime logic is introduced.
- Keep Turborepo environment inputs explicit enough to avoid incorrect cache reuse without introducing remote caching.

## Out of Scope

- Production domains, deployment-provider configuration, DNS/TLS, secret-manager selection, or committing real credentials.
- Authentication implementation, cookie issuance, CORS middleware implementation beyond documenting/validating the required origin contract, database setup, Prisma, or business features.
- Broad onboarding/README cleanup reserved for S0-T13.
- Staging, committing, pushing, branching, or other Git writes.

## Expected Changes

- Application-local environment schemas/loaders and focused tests where justified.
- Safe example environment files, local port/origin scripts or configuration, and narrowly required Turborepo inputs.
- Canonical environment/onboarding reality and Sprint 0 execution records.
- Any validation dependency requires exact stable-version compatibility review and explicit inclusion in the approved implementation scope.

## Testing Impact

Automated tests required

Cover valid parsing/defaults and representative missing, malformed, unsafe, or cross-application values for any introduced validation logic. Also run typecheck, lint, formatting, build, tests, Workspace integrity, and configuration smoke checks.

## Swagger / OpenAPI Impact

No documentation impact. This task does not create or change a Backend HTTP contract; it only defines configuration that future API behavior may consume.

## Constraints

- Never place secrets, credentials, tokens, or production-sensitive values in source, examples, logs, tests, or generated documentation.
- Browser-exposed variables must be explicitly public and contain no secrets.
- Validation fails early with actionable messages that do not echo sensitive values.
- Preserve the accepted direct-browser-to-API architecture and deferred production-domain decisions.
- Use Context7/current official documentation before changing framework-, library-, or Turborepo-specific environment behavior.
- Never stage or commit without separate approval.

## Acceptance Criteria

- Each current environment value has one documented owner, type, requirement/default, and exposure classification.
- Storefront, Admin, and API have non-conflicting documented local ports and consistent development-origin conventions.
- Introduced environment parsing is typed, validated, fail-fast, and covered by focused automated tests.
- Safe tracked examples contain placeholders/defaults only; real environment files remain ignored.
- Browser bundles receive no server-only or secret value.
- Relevant typecheck, lint, formatting, build, test, Workspace, integrity, and configuration checks pass.
- No deployment, authentication, database, business, or unrelated dependency behavior is introduced.

## Validation

- Inspect source and build configuration for every environment read and public/server-only boundary.
- Run focused valid/invalid environment tests and application startup/build smoke checks with safe values.
- Run repository-wide typecheck, lint, formatting, build, and applicable test gates.
- Verify example tracking, real environment ignores, Turbo inputs, Workspace integrity, dependency/lockfile scope, and read-only Git index state.

## Documentation Impact

Document the canonical environment contract, safe local defaults, application ownership, and setup commands; update Sprint 0 execution records when validated.

## Approval State

Awaiting Implementation Approval

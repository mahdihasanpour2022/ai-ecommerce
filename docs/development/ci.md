# Continuous Integration

GitHub Actions is the repository's CI provider, matching the configured GitHub `origin`. The workflow at `.github/workflows/ci.yml` runs for every pull request and every push to `main`. It is a quality gate only: deployment, release publishing, migrations, database services, and remote Turborepo caching are outside this workflow.

## Runtime and supply-chain boundary

- The job uses a GitHub-hosted Ubuntu runner and the supported Node.js 24 major, which satisfies the repository's current framework and Prisma engine constraints.
- Official GitHub actions are pinned to immutable commit SHAs, with the reviewed stable release beside each pin. Updates require verifying a current stable compatible release and replacing both its full SHA and version comment.
- Workflow permissions are limited to read-only repository contents. Checkout does not persist GitHub credentials.
- Yarn Classic is installed at the repository's exact `1.22.22` version, then `yarn install --frozen-lockfile` must reproduce `yarn.lock` without mutation.
- Dependency, browser, and remote build caches are intentionally disabled for this initial workflow. This keeps the clean-checkout path explicit and avoids adding cache trust/invalidation complexity before CI duration demonstrates a need.
- The Admin test foundation installs only Playwright Chromium with its Linux system dependencies. Firefox/WebKit matrices remain deferred; browser binaries and failure artifacts are generated runner state, never repository content.
- Superseded runs on the same workflow/ref are cancelled to avoid spending capacity on stale revisions.

## Quality gates

The single quality job fails immediately when any ordered gate fails:

1. frozen dependency installation;
2. model-free Prisma schema validation and client generation;
3. check-only formatting;
4. repository-wide TypeScript typecheck;
5. repository-wide lint;
6. repository-wide build; and
7. all real Workspace tests orchestrated by the root test command; and
8. the focused Admin production-build Chromium smoke test with synthetic intercepted authentication responses.

Prisma receives a visibly non-production, process-only `DATABASE_URL`. Validation and generation parse configuration but do not connect to PostgreSQL, so CI starts no database or Docker service and stores no database secret. The workflow must not replace these checks with migration application; production migration/deployment remains separately approved work.

## Local equivalents

From the repository root, use the same gates before reviewing a CI change:

```text
yarn install --frozen-lockfile
yarn workspace @e-commerce/api prisma:validate
yarn workspace @e-commerce/api prisma:generate
yarn format:check
yarn typecheck
yarn lint
yarn build
yarn test
yarn workspace @e-commerce/admin playwright install chromium
yarn workspace @e-commerce/admin test:e2e
```

Set `DATABASE_URL` only in the invoking process for the two Prisma commands. A safe validation-only example is `postgresql://ci:ci@127.0.0.1:5432/ci?schema=public`; it is not a deployment credential and does not need a running server.

Local success validates the represented commands and workflow configuration, but it is not a remote GitHub Actions result. A remote run can be claimed only after GitHub executes the committed workflow for a push or pull request. The author of a failing change owns restoring every applicable gate; checks must not be weakened or skipped to obtain a pass.

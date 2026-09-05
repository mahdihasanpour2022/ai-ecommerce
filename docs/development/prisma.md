# Prisma Development and Migration Workflow

The API Workspace owns Prisma ORM. Prisma `7.10.0` is pinned exactly for both the CLI and client package. It is the newest stable release compatible with the repository's Node, TypeScript, Yarn Classic, and PostgreSQL 18 foundation; Prisma 8 is currently a release candidate and is not approved.

## Foundation boundary

- `apps/api/prisma.config.ts` owns the schema path, migration path, and server-only `DATABASE_URL` lookup.
- `apps/api/prisma/schema.prisma` selects PostgreSQL and the current `prisma-client` generator and declares sixteen implemented models: nine Admin identity/RBAC/session/throttle models and seven Clothing Catalog persistence models, plus the three catalog enums.
- Generated TypeScript is written to `apps/api/src/generated/prisma` in CommonJS form to match the API's NodeNext/CommonJS package boundary.
- Generated client files are reproducible and ignored. Run generation after schema or generator changes; do not edit generated files.
- Three reviewed additive migrations live under `apps/api/prisma/migrations/`: the Sprint 1 Admin foundation, Sprint 2 catalog foundation, and the Admin username rollout. Their PostgreSQL-only CHECKs, specialized unique indexes, deferred constraints, narrow triggers, singleton state, explicit `SUPER_ADMIN` grants, and safe existing-row username backfill remain migration-managed where Prisma schema syntax cannot fully represent them.
- The rollback-only suites at `apps/api/prisma/tests/admin-identity-constraints.sql` and `apps/api/prisma/tests/catalog-constraints.sql` verify applied structures, reference state, and critical invariants against an approved disposable database. Focused API integration tests use independent connections for catalog race behavior.
- The trusted [first-Super-Admin provisioner](admin-provisioning.md) creates a short-lived adapter-backed Prisma Client for its one transaction and disconnects afterward. No general runtime repository/service/client singleton or seed mechanism exists yet.

Prisma 7 does not load `.env` implicitly. The repository intentionally adds no dotenv dependency: provide `DATABASE_URL` through the invoking shell or process manager. The tracked `.env.example` documents safe local values but is not loaded automatically. `TEST_DATABASE_URL` remains reserved for future test tooling and must never be substituted silently for development migrations.

## Workspace commands

Run commands through the API Workspace from the repository root:

```text
yarn workspace @e-commerce/api prisma:format
yarn workspace @e-commerce/api prisma:validate
yarn workspace @e-commerce/api prisma:generate
yarn workspace @e-commerce/api prisma:migrate:create -- --name <descriptive-name>
yarn workspace @e-commerce/api prisma:migrate:deploy
```

- `prisma:format` formats the Prisma schema only.
- `prisma:validate` validates configuration and schema using `DATABASE_URL` without connecting to PostgreSQL.
- `prisma:generate` regenerates the ignored client and does not require a database connection.
- `prisma:migrate:create` runs `migrate dev --create-only`. It is an intentional development-only action against `e_commerce_dev`; it requires a descriptive name and a running local database, creates SQL, and may use a shadow database. It must not be automated against shared or production-like data.
- `prisma:migrate:deploy` non-interactively applies already-reviewed committed migrations. It does not create migrations and is reserved for a separately approved deployment/CI context with injected credentials.

There is deliberately no `db push`, `migrate reset`, automatic seed, automatic postinstall migration, or production migration command wired into application startup.

## Migration review gate

Every future schema task owns its migration in the same task. Before any generated SQL is applied beyond the disposable local development workflow:

1. Confirm the Prisma model was explicitly approved and contains no speculative domain fields or relations.
2. Generate the migration with `--create-only` and inspect every SQL statement before application.
3. Review destructive operations, table rewrites, locks, nullability/default changes, foreign keys, uniqueness, indexes, precision, time zones, and delete/update behavior.
4. Define safe handling for existing rows, backfills, compatibility across application versions, transaction boundaries, failure recovery, and forward repair. Do not assume Prisma can produce a safe rollback.
5. Run the applicable development/test database validation and relevant application tests before committing the migration.
6. Commit the reviewed schema and migration SQL together. Never edit an already-applied migration; add a corrective migration.

Production hosting, secret injection, deployment ordering, backup/restore, and zero-downtime strategy remain open and require separate approval.

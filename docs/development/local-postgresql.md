# Local PostgreSQL Development

The repository uses Docker Compose for reproducible local PostgreSQL. Native host installation is not the project contract because service names, versions, authentication, lifecycle, and reset behavior vary by machine. Docker remains a developer prerequisite rather than an application dependency.

## Supported local configuration

| Setting | Value |
| --- | --- |
| PostgreSQL image | `postgres:18.6-alpine3.24` |
| Host endpoint | `localhost:5432` (bound to `127.0.0.1` only) |
| Local role | `automotive` |
| Local-only password | `automotive_local_only` |
| Development database | `automotive_dev` |
| Test database | `automotive_test` |
| Persistent volume | `automotive-commerce_postgres-data` |

PostgreSQL 18.6 is the current stable 18.x release selected for new local development. The exact official-image and Alpine base tags are pinned so developer machines use the same database build. PostgreSQL 19 prereleases are prohibited by the dependency-version policy. For PostgreSQL 18, the official image persists its version-specific data beneath `/var/lib/postgresql`, so the named volume targets that path.

The fixed role/password are non-secret development credentials and the port is reachable only through the host loopback binding. Never reuse these values outside local development. Real deployment credentials and database infrastructure remain separate open decisions.

## Prerequisite

Install a current Docker environment that includes Docker Compose v2 and ensure `docker compose version` succeeds. On Windows, Docker Desktop normally provides both. This task does not install or configure host virtualization software.

## Lifecycle and verification

From the repository root:

```text
yarn db:config
yarn db:start
yarn db:status
yarn db:health
yarn db:verify
yarn db:stop
```

- `db:config` validates `compose.yaml` without starting a container.
- `db:start` creates or starts only the PostgreSQL service and waits up to 60 seconds for its health check.
- `db:health` runs `pg_isready` inside the container against `automotive_dev`.
- `db:verify` connects to both databases and verifies their exact `current_database()` identities.
- `db:stop` stops PostgreSQL but preserves its named volume and data. A later `db:start` reuses them.

The test database is created only when PostgreSQL initializes an empty named volume. If an older volume predates this configuration, use the appropriate guarded reset command after confirming no local data must be retained.

## Guarded database reset

These commands permanently drop and recreate exactly one local database:

```text
yarn db:reset:dev
yarn db:reset:test
```

The underlying script rejects missing, arbitrary, and production-like targets before invoking Docker. It accepts only `automotive_dev` or `automotive_test`, connects through the repository's named Compose service, terminates target connections with `dropdb --force`, recreates the same database under the local role, and verifies its identity. There is intentionally no generic volume-destruction command.

Do not run a reset while another process is using the target database. The reset removes every schema and row in that one database; future Prisma migrations must be reapplied afterward.

## Connection contract for Prisma

The safe reference URLs live in `apps/api/.env.example`:

```text
DATABASE_URL=postgresql://automotive:automotive_local_only@localhost:5432/automotive_dev?schema=public
TEST_DATABASE_URL=postgresql://automotive:automotive_local_only@localhost:5432/automotive_test?schema=public
```

Prisma CLI commands now consume `DATABASE_URL` through the API-owned configuration, while the API runtime still does not connect to PostgreSQL. The model-free [Prisma workflow](prisma.md) owns generation and migration review. Tests must use `automotive_test`, never `automotive_dev`.

## Troubleshooting

- If `docker` is not found, install/start the approved Docker environment and open a new terminal.
- If port `5432` is occupied, stop the conflicting local service. Do not silently change the repository port because the connection contract is shared.
- If startup is unhealthy, inspect `docker compose logs postgres`; logs may contain operational details and must not be pasted into public records without review.
- If initialization failed on a new empty volume, diagnose the failure before removing anything. The repository intentionally provides no broad volume deletion helper.

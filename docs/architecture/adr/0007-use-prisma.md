# 0007: Use Prisma

**Status:** Accepted

## Context

The TypeScript API needs typed PostgreSQL data access and reviewable schema migrations.

## Decision

Use Prisma ORM. Design and review the conceptual model before creating a schema or migrations.

## Reasons

Type-safe client generation, schema readability, migration workflow, and NestJS/TypeScript fit.

## Alternatives Considered

Drizzle, TypeORM, query builders, and raw SQL-first access.

## Consequences

Teams must still review generated SQL, indexes, query counts, transactions, and migration risk. Database records are not API DTOs. Raw SQL remains an exception requiring justification.


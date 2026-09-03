# 0006: Use PostgreSQL

**Status:** Accepted

## Context

Nested clothing catalog, product variants where approved, inventory, identity, and orders are relational and require transactional consistency.

## Decision

Use PostgreSQL as the primary transactional database.

## Reasons

Relational constraints, ACID transactions, mature indexing/query capabilities, and operational ecosystem.

## Alternatives Considered

MySQL-compatible databases; document databases; separate databases per domain.

## Consequences

Schema, indexing, backup/restore, connection management, privacy, and migration operations require explicit design. One database does not remove module ownership boundaries.

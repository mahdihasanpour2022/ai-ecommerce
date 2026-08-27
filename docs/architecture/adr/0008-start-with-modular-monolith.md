# 0008: Start with a Modular Monolith

**Status:** Accepted

## Context

Domain capabilities need separation, but initial requirements and scale do not justify distributed systems.

## Decision

Deploy one NestJS API organized into cohesive domain modules with explicit internal interfaces and a shared PostgreSQL deployment.

## Reasons

Lower operational and consistency cost, easier transactions and debugging, and an architecture that can evolve from evidence.

## Alternatives Considered

Microservices; event-driven services; an unstructured monolith.

## Consequences

Module boundaries require discipline and tests. No Kafka, service mesh, or distributed workflow is introduced. A future extraction needs measurable scaling, isolation, ownership, or deployment value.


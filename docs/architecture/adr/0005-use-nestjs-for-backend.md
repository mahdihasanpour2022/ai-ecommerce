# 0005: Use NestJS for the Backend

**Status:** Accepted

## Context

The product needs a TypeScript REST API with validation, authorization, OpenAPI, and clear module boundaries.

## Decision

Use NestJS for `apps/api`, with thin controllers, validated DTOs, guards/policies, services/domain logic, dependency injection, and consistent exception handling.

## Reasons

Structured modules, mature HTTP/DI patterns, TypeScript support, and OpenAPI integration.

## Alternatives Considered

Express/Fastify assembled directly; another backend language/framework; Next.js route handlers as the shared API.

## Consequences

Framework decorators must not substitute for sound boundaries. Avoid circular modules and unnecessary layers. The API remains independently deployable from both web applications.


# 0012: Use OpenAPI and Swagger for Backend API Documentation

**Status:** Accepted

## Context

The independently deployed NestJS API needs an interactive, machine-readable contract that stays aligned with implemented HTTP behavior. Treating API documentation as later cleanup would allow endpoint, DTO, status, security, and error contracts to drift from the running system.

## Decision

Use OpenAPI as the canonical machine-readable Backend HTTP API description and Swagger UI as its canonical interactive documentation mechanism.

The NestJS foundation must generate the OpenAPI document and expose a predictable documentation route in development. The exact route is selected consistently during API bootstrap; `/api/docs` is the current conceptual default, not a hard-coded decision.

Swagger/OpenAPI maintenance is part of the same implementation task that creates, removes, or changes an HTTP API contract. Such a task is not Done until its OpenAPI representation matches the implementation and no documentation made stale by the task remains.

Swagger must not be anonymously or publicly accessible in production. Production access requires an explicitly approved protection mechanism. The exact mechanism is Open until deployment/security planning; candidates include Basic Authentication, Admin authentication, network/IP restriction, or another approved control. Until protection is approved and configured, production Swagger remains unavailable.

## Documentation Ownership

- [API conventions](../../api/conventions.md) own general OpenAPI content and maintenance rules.
- Backend architecture and standards own the requirement to keep implemented HTTP contracts documented.
- Feature specifications and implementation tasks own the observable API behavior they require.
- Generated OpenAPI and Swagger UI represent the implemented API contract; they do not replace feature or architecture decisions.

## Reasons

OpenAPI provides a machine-readable contract while Swagger UI gives developers an interactive way to inspect and exercise documented services. NestJS supports generating that document from application routes and DTO metadata, allowing documentation to evolve with implemented modules.

## Alternatives Considered

Hand-maintained prose only; a separate documentation cleanup phase; another OpenAPI viewer; publicly accessible production documentation.

## Consequences

Backend API tasks must declare their Swagger/OpenAPI impact and include matching acceptance and validation criteria. Development documentation is available and synchronized with actual behavior. Production requires protected access and cannot default to public exposure. Frontend-only and non-HTTP tasks do not need Swagger/OpenAPI context.

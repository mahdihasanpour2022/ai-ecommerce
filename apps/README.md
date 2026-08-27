# Application Boundary

This directory owns the independently deployable application targets accepted in the [system architecture](../docs/architecture/system-architecture.md):

- `storefront/` — the implemented customer-facing Next.js workspace;
- `admin/` — the implemented staff-facing Next.js foundation;
- `api/` — the implemented empty NestJS REST API foundation.

Storefront preserves the original starter behavior and dependency baseline. Admin currently provides only a Persian RTL framework foundation; authentication and business UI are not implemented. API is a strict-TypeScript Modular Monolith foundation with the `/api/v1` REST prefix and generated Swagger/OpenAPI at `/api/docs` in development and test. Production documentation routes remain disabled, and no business controller or module exists yet.

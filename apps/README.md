# Application Boundary

This directory owns the independently deployable application targets accepted in the [system architecture](../docs/architecture/system-architecture.md):

- `storefront/` — the implemented customer-facing Next.js workspace;
- `admin/` — the implemented staff-facing Next.js foundation;
- `api/` — the reserved NestJS REST API target.

Storefront preserves the original starter behavior and dependency baseline. Admin currently provides only a Persian RTL framework foundation; authentication and business UI are not implemented. API remains a target name and must not be created outside its approved Sprint 0 task.

# Application Boundary

This directory owns the independently deployable application targets accepted in the [system architecture](../docs/architecture/system-architecture.md):

- `storefront/` — the implemented customer-facing Next.js workspace;
- `admin/` — the reserved staff-facing Next.js target;
- `api/` — the reserved NestJS REST API target.

Storefront preserves the original starter behavior and dependency baseline. Admin and API are target names, not implemented applications; do not create either child application outside its approved Sprint 0 task.

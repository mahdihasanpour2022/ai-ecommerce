# Application Boundary

This directory reserves the independently deployable application targets accepted in the [system architecture](../docs/architecture/system-architecture.md):

- `storefront/` — the customer-facing Next.js application;
- `admin/` — the staff-facing Next.js application;
- `api/` — the NestJS REST API.

These are target names, not implemented applications. The existing root Next.js starter remains the transitional runnable application until the separately approved Storefront placement task (`S0-T05`) moves it deliberately. Do not create a child application or manifest here outside its approved Sprint 0 task.

# 0001: Use a Monorepo

**Status:** Accepted

## Context

Storefront, Admin, and API are independently deployable parts of one product and will evolve shared contracts and tooling. The repository currently contains one root Next.js starter.

## Decision

Adopt a monorepo targeting `apps/storefront`, `apps/admin`, `apps/api`, and justified `packages/*`. Preserve and deliberately migrate the starter during approved Sprint 0 work.

## Reasons

Atomic cross-application changes, consistent quality tooling, discoverable ownership, and selective builds.

## Alternatives Considered

Separate repositories; a single combined web application.

## Consequences

Workspace/build configuration and boundary discipline are required. Shared packages must not become dumping grounds; deployments remain independent.


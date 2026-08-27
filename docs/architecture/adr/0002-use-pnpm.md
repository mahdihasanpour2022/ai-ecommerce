# 0002: Use pnpm

**Status:** Accepted

## Context

The target monorepo needs efficient workspace dependency management and strict resolution. The current starter declares Yarn 1 and has a `yarn.lock`; Sprint 0 will migrate it carefully.

## Decision

Use pnpm and pnpm workspaces for the target monorepo. Migration is an approved Sprint 0 task, not part of documentation setup.

## Reasons

Better installation performance in the project owner's environment, disk-efficient content-addressable storage, reduced duplicate package storage, strong workspace/monorepo support, stricter dependency visibility, and appropriate Turborepo integration.

## Alternatives Considered

Keep Yarn 1; npm workspaces; Yarn modern.

## Consequences

Sprint 0 changes the package-manager field and lockfile together under explicit dependency approval. CI and contributor tooling pin a pnpm version; the pnpm lockfile is source-controlled and mixed package-manager use is prohibited after migration. Dependency retention is governed by project standards and the Sprint 0 migration plan.

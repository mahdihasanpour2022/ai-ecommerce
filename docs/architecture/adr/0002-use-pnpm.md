# 0002: Use pnpm

**Status:** Superseded by [ADR 0013](0013-use-yarn-workspaces.md)

## Context

The target monorepo needs efficient workspace dependency management and strict resolution. The current starter declares Yarn 1 and has a `yarn.lock`; Sprint 0 will migrate it carefully.

## Decision

The original decision was to use pnpm and pnpm workspaces for the target monorepo.

## Reasons

Better installation performance in the project owner's environment, disk-efficient content-addressable storage, reduced duplicate package storage, strong workspace/monorepo support, stricter dependency visibility, and appropriate Turborepo integration.

## Alternatives Considered

Keep Yarn 1; npm workspaces; Yarn modern.

## Consequences

This decision was superseded before the migration completed. The project initially preferred pnpm for disk efficiency and monorepo support, but the owner chose to preserve the existing Yarn environment and avoid unnecessary dependency reinstallation/downloads under constrained network conditions. This ADR remains as architectural history and is not an executable project rule.

# 0003: Use Turborepo

**Status:** Accepted

## Context

Multiple applications and packages need consistent, dependency-aware local and CI tasks.

## Decision

Use Turborepo to orchestrate build, typecheck, lint, and test tasks across the planned workspace.

## Reasons

Task graph awareness, caching, filtered execution, and simple integration with a JavaScript/TypeScript monorepo.

## Alternatives Considered

Raw Yarn Workspace scripts; Nx; custom orchestration.

## Consequences

Inputs, outputs, environment variables, and cache safety must be declared accurately. Remote caching is an open operational decision. Turborepo is not permission to create unnecessary packages.

# 0013: Use Yarn Workspaces

**Status:** Accepted

## Context

The repository already uses Yarn Classic `1.22.22`, has a valid `yarn.lock`, and has a useful installed dependency tree. Network bandwidth in the development environment is constrained. Replacing this working baseline would cause avoidable downloads and operational risk without changing the product architecture.

## Decision

Use the existing Yarn toolchain and Yarn Workspaces as the package-management and workspace mechanism for the monorepo. Use Turborepo for dependency-aware task orchestration across the planned `apps/*` and justified `packages/*` workspaces.

Preserve `yarn.lock`, existing dependency declarations, and useful installed packages. Do not change the Yarn major version, regenerate the dependency tree, or introduce another package manager without a separate explicit owner decision.

## Reasons

This preserves the working local environment, minimizes network-heavy operations, retains deterministic dependency state, and still supports the accepted monorepo structure and Turborepo orchestration.

## Alternatives Considered

pnpm workspaces as recorded in superseded [ADR 0002](0002-use-pnpm.md); npm workspaces; Yarn Berry; separate repositories.

## Consequences

The private root manifest owns Yarn Workspace globs for `apps/*` and `packages/*`; `yarn.lock` remains source-controlled and reviewed. Existing packages remain preserved without becoming mandatory architecture. Turborepo remains planned. A future Yarn-major migration requires its own compatibility review and approval.

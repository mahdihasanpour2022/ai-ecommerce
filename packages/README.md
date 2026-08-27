# Shared Package Boundary

This directory is reserved for packages that serve a demonstrated cross-application need in the accepted [monorepo architecture](../docs/architecture/adr/0001-use-monorepo.md).

Do not create placeholder packages, generic dumping grounds, or speculative shared abstractions. Keep application-specific code with its owning application; add a child package only through approved work after reuse, ownership, and its public boundary are concrete.

# 0009: Separate Admin and Storefront Applications

**Status:** Accepted

## Context

Customer commerce and staff administration differ in audience, exposure, UI systems, SEO, performance, permissions, and release risk.

## Decision

Build Storefront and Admin as separate Next.js applications on separate planned domains, sharing the Backend API.

## Reasons

Clear security and UX boundaries, independent deployment, tailored HeroUI/Ant Design use, and reduced accidental coupling.

## Alternatives Considered

One application with route groups; a client-only Admin SPA; embedding Admin into the API.

## Consequences

Initial browsers communicate directly with the API, so authentication cookies, CSRF, and explicit credentialed CORS must work across the approved domain topology. A BFF is Deferred. Duplicate code is tolerated until a stable shared need justifies a package.

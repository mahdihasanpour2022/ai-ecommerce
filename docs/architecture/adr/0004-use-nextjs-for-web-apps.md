# 0004: Use Next.js for Web Applications

**Status:** Accepted

## Context

Storefront requires SEO and performance; Admin requires a maintainable interactive application. A Next.js 16 App Router starter already exists.

## Decision

Use independent TypeScript Next.js App Router applications for Storefront and Admin. Prefer Server Components and isolate Client Components to interactive/browser-dependent boundaries.

## Reasons

Server rendering and metadata capabilities, routing conventions, performance tooling, and shared team expertise while preserving distinct applications.

## Alternatives Considered

One combined Next.js application; separate SPA tooling; another SSR framework.

## Consequences

Rendering, caching, and client boundaries require deliberate design. Installed version-specific docs must be read before code changes. HeroUI is planned for Storefront and Ant Design for Admin.


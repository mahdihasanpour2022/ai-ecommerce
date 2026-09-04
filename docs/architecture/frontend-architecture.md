# Frontend Architecture

## Applications and rendering

Storefront and Admin are separate Next.js App Router applications in the target monorepo. Both use TypeScript strict mode and are designed from the beginning for Persian (`fa-IR`) RTL UX, conceptually beginning with `<html lang="fa" dir="rtl">`. Storefront uses Tailwind CSS and HeroUI; Admin uses Ant Design. Their separate design systems should not be forced into a premature shared component library.

Per the installed Next.js 16 guide, layouts and pages are Server Components by default. Prefer them for server-side data access, secrets, smaller client bundles, streaming, and static output. Add a narrow Client Component boundary only for state, event handlers, effects, browser APIs, custom client hooks, or client-only libraries. Props crossing that boundary must be serializable. Never expose server credentials to client code.

## Layers and data access

- Route/layout composition owns page structure and rendering strategy.
- Feature-level UI separates presentation from validation, orchestration, and business rules.
- A reusable HTTP/auth layer centralizes base URL, credentialed cookies, CSRF headers, timeout, error-code handling, refresh coordination, and observability hooks. In the accepted cookie architecture, JavaScript does not read either authentication token or construct a Bearer header. The session-bound CSRF token is the only frontend-readable credential; it is delivered by login/`GET /auth/csrf`, held only in memory, and never persisted in Web Storage or a cookie.
- Components must not scatter arbitrary API calls or duplicate server business rules.
- Introduce global state only for genuinely cross-route client state. Prefer server data, URL state, local state, and focused context first.
- Do not use `useMemo` or `useCallback` without a measured or behaviorally necessary reason. Avoid `any` unless documented and strongly justified.
- React Hook Form is installed in Admin for the approved catalog forms and composes with Ant Design through small typed controlled-field adapters. TanStack Query and Zustand remain optional and uninstalled; installed packages do not dictate architecture. Dependency retention is governed by [general standards](../standards/general.md).

## Forms and asynchronous experiences

Use typed schemas shared between form parsing and client validation where useful, while treating backend validation as authoritative. The specific form library and any cross-package schema sharing require Sprint 0/feature approval. Prevent double submission and preserve actionable field and form errors.

Every data-dependent experience defines loading, empty, error, success, and retry behavior. Errors shown to users are safe and useful; diagnostic details stay in approved telemetry. Cancellation, stale responses, and duplicate mutations are considered for relevant flows.

## Product quality

Target WCAG 2.2 AA. Use semantic HTML and keyboard-operable native controls first; use ARIA only when native semantics are insufficient. Preserve focus, announce meaningful dynamic status, maintain sufficient contrast, and test responsive layouts.

Storefront routes need intentional Persian metadata, crawlability, canonical strategy, semantic content, structured data where validated, optimized images, and performance budgets aligned with Core Web Vitals. Keep client JavaScript narrow, avoid layout shifts, and select caching/revalidation per data freshness requirements.

Admin prioritizes accessible dense data, forms, permissions-aware actions, and resilient CRUD states. Hiding an action is usability only; the API must authorize every operation.

The Admin root layout remains a Server Component. It places `AntdRegistry` at the App Router boundary for first-render styles, then a narrow Client `ConfigProvider` supplies the Persian locale and RTL direction before the existing Auth Provider. Component interaction evidence uses Testing Library/user-event in an isolated JSDOM worker; a single Chromium Playwright project supplies production-build smoke and axe coverage. This foundation does not itself implement catalog screens.

Authentication return destinations are allowlisted application-relative paths. Reject external/protocol-relative URLs, backslashes, control characters, and unknown routes rather than forwarding attacker-controlled navigation.

Trusted source-controlled SVG assets such as logos, icons, and illustrations are allowed and may use an approved build-time component import approach. Never inject arbitrary untrusted SVG markup. Uploaded product/media SVG is forbidden; upload rules live in the [security baseline](../security/baseline.md).

See [frontend standards](../standards/frontend.md), [authentication](../security/authentication.md), and [Next.js ADR](adr/0004-use-nextjs-for-web-apps.md). The approved [Admin catalog behavior specification](../features/admin-catalog/specification.md) owns Sprint 3 routes, permission-aware UX, forms, conflicts, accessibility, and the bounded UI/test dependency proposal; it does not claim those screens are implemented.

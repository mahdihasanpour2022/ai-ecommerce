# Frontend Architecture

## Applications and rendering

Storefront and Admin are separate Next.js App Router applications in the target monorepo. Both use TypeScript strict mode and are designed from the beginning for Persian (`fa-IR`) RTL UX, conceptually beginning with `<html lang="fa" dir="rtl">`. Storefront uses Tailwind CSS and HeroUI; Admin uses Ant Design plus an independently configured exact Tailwind 4 utility layer. Their separate design systems should not be forced into a premature cross-application component library.

Per the installed Next.js 16 guide, layouts and pages are Server Components by default. Prefer them for server-side data access, secrets, smaller client bundles, streaming, and static output. Add a narrow Client Component boundary only for state, event handlers, effects, browser APIs, custom client hooks, or client-only libraries. Props crossing that boundary must be serializable. Never expose server credentials to client code.

## Layers and data access

- Route/layout composition owns page structure and rendering strategy.
- Feature-level UI separates presentation from validation, orchestration, and business rules.
- A reusable same-origin BFF/HTTP/auth layer centralizes Backend routing, canonical `ApiResponse` validation, credential cookies, CSRF headers, timeout, error-code handling, refresh coordination, and observability hooks. JavaScript does not read either authentication token or construct a Bearer header. The session-bound CSRF token is the only frontend-readable credential; server responses store it in a host-only `SameSite=Strict` cookie, and it is never persisted in Web Storage.
- Components must not scatter arbitrary API calls or duplicate server business rules.
- TanStack Query is the accepted client server-state and cache boundary. Client feature calls use typed feature hooks over thin `hooks/rq_hooks` fetcher/sender/deleter adapters, then the existing Axios and same-origin BFF layers. Query keys include every request variable; cache freshness, bounded read retry, mutation non-retry, targeted invalidation, and identity-change cleanup are explicit. Proxy/bootstrap, Route Handlers, Server Component prefetch, and low-level authentication transport remain non-hook infrastructure. See [ADR 0014](adr/0014-adopt-tanstack-query-client-server-state.md).
- Introduce global state only for genuinely cross-route client state. Prefer server data, URL state, local state, and focused context first.
- Do not use `useMemo` or `useCallback` without a measured or behaviorally necessary reason. Avoid `any` unless documented and strongly justified.
- React Hook Form remains installed for the Admin login form. Admin also uses exact TanStack Query `5.102.8` with matching development-only Devtools for authentication mutations; Zustand remains optional and uninstalled. Dependency retention is governed by [general standards](../standards/general.md).

Each application owns a local `components/shared/` boundary for UI primitives proven to repeat across feature areas. Shared primitives forward applicable native/library attributes, accept caller `className`, preserve accessible semantics, and expose typed finite variants. Tailwind variants use complete statically discoverable class strings or CSS variables rather than runtime partial-name interpolation. Admin and Storefront do not import one another's design-system components; a cross-application UI package requires separately proven reuse and architecture approval.

Tailwind utilities are mandatory by default for all new or materially touched Admin and Storefront UI. Plain CSS is limited to cases utilities cannot express cleanly or safely: global theme/token declarations and resets, third-party internals, complex global selectors, keyframes, and narrowly scoped technical behavior. Such exceptions stay minimal and documented when non-obvious; legacy CSS is migrated incrementally only when its owning UI is touched.

Tailwind markup must be free of canonical-class warnings and one-off arbitrary bracket values. Built-in canonical utilities and the closest suitable default scale value are preferred. A genuinely required exact non-default width, size, color, shadow, typography value, grid template, or similar design decision is registered once under a semantic name with Tailwind 4's CSS-first `@theme` or `@utility` directives in the owning application's Tailwind entry stylesheet, then reused through the generated class. This is the Tailwind 4 equivalent of extending a JavaScript `tailwind.config`; applications on another approved Tailwind major follow that major's canonical configuration mechanism.

Responsive design is mobile-first across both applications. Unprefixed Tailwind utilities own the smallest supported layout, with the default `sm`/`md`/`lg`/`xl`/`2xl` variants controlling deliberate changes to sizing, spacing, typography, visibility, ordering, grids, and flex composition. Prefer fluid `w-full`, `min-w-0`, bounded `max-w-*`, wrapping, stacking, and responsive column patterns over fixed dimensions. Required information and actions remain available without clipping or horizontal page scrolling; dense records may transform between accessible cards/lists and desktop table-like layouts. Meaningful UI slices are checked at phone, tablet, desktop, and wide-desktop widths, with interaction evidence when breakpoint behavior changes navigation or action access.

## Forms and asynchronous experiences

Use typed schemas shared between form parsing and client validation where useful, while treating backend validation as authoritative. Any form-library or cross-package schema change requires explicit feature approval. Prevent double submission and preserve actionable field and form errors.

Every data-dependent experience defines loading, empty, error, success, and retry behavior. Errors shown to users are safe and useful; diagnostic details stay in approved telemetry. Cancellation, stale responses, and duplicate mutations are considered for relevant flows.

## Product quality

Target WCAG 2.2 AA. Use semantic HTML and keyboard-operable native controls first; use ARIA only when native semantics are insufficient. Preserve focus, announce meaningful dynamic status, maintain sufficient contrast, and test responsive layouts.

Storefront routes need intentional Persian metadata, crawlability, canonical strategy, semantic content, structured data where validated, optimized images, and performance budgets aligned with Core Web Vitals. Keep client JavaScript narrow, avoid layout shifts, and select caching/revalidation per data freshness requirements.

Admin prioritizes accessible dense data, forms, permissions-aware actions, and resilient CRUD states. Hiding an action is usability only; the API must authorize every operation.

The Admin root layout remains a Server Component. It places `AntdRegistry` at the App Router boundary for first-render styles, then a narrow Client `ConfigProvider` supplies the Persian locale, RTL direction, exact amber design tokens, and server-seeded user-selectable light/dark theme before the existing Auth Provider. The theme preference is read from a same-site presentation-only cookie so the first server render and client provider agree without an incorrect-theme flash. Component interaction evidence uses Testing Library/user-event in an isolated JSDOM worker; a single Chromium Playwright project supplies production-build smoke and axe coverage.

The Admin currently exposes only `/login`, the protected `/` entry, and the same-origin `/api/v1/**` BFF. The former `/catalog/**` frontend route tree and its route-specific clients, UI, hooks, and tests have been removed. Backend catalog contracts and authorization remain implemented independently; any future Admin feature route must be planned and approved before implementation.

Authentication return destinations are allowlisted application-relative paths. Reject external/protocol-relative URLs, backslashes, control characters, and unknown routes rather than forwarding attacker-controlled navigation.

Trusted source-controlled SVG assets such as logos, icons, and illustrations are allowed and may use an approved build-time component import approach. Never inject arbitrary untrusted SVG markup. Uploaded product/media SVG is forbidden; upload rules live in the [security baseline](../security/baseline.md).

See [frontend standards](../standards/frontend.md), [authentication](../security/authentication.md), and [Next.js ADR](adr/0004-use-nextjs-for-web-apps.md). Each future Admin page is planned from owner-supplied UI direction before implementation.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Clothing Commerce: Agent Guide

This repository is a production-oriented clothing-commerce monorepo with three independent applications: a public Storefront, an Admin Panel, and a shared Backend API. The engineering foundation, Admin authentication, catalog persistence/contracts, and the implemented Admin catalog routes are established. Workspaces and runtime identifiers use the approved `e-commerce` naming, with SQL-safe PostgreSQL identifiers using `e_commerce`.

Start with [the project overview](docs/00-project-overview.md). Detailed architecture, standards, security rules, product context, and feature specifications live under [`docs/`](docs/00-project-overview.md). Treat those documents as constraints, not evidence that planned functionality exists.

## Context hierarchy

Use focused context rather than loading all documentation:

1. Always read this file.
2. For a feature or task, use its **Required Context** as the routing source, but first assess whether that list is materially broader than execution requires. Narrow over-broad context before substantial work while retaining every authoritative source needed for correctness.
3. For frontend work, use the owner-supplied UI reference and the approved plan for the single route currently in scope.
4. Load other documents only when inspection reveals a genuine dependency; do not read the entire `docs/` tree by default.

Required Context is task-specific and Minimum Sufficient: prefer exact authoritative sections/topics and narrow canonical sources over whole documents included only for general relevance. Do not reread broad sources when a narrower canonical source already owns the applicable decision.

Architecture and security documents own **how** the system is intended to work. Feature specifications and the owner-approved route plan own **what** observable behavior is required. ADRs own **why** significant decisions were made. Prefer references to the canonical owner over duplicating detailed rules.

## Model and reasoning routing

- Use **GPT-5.6 Terra** for routine, well-scoped, low-risk work with clear requirements and architecture. Use **GPT-5.6 Sol** for complex, high-risk, security-sensitive, architectural, ambiguous, or cross-Workspace work, including authentication/authorization, security, Prisma schemas/migrations, data integrity, cart, checkout, payments, orders, complex debugging, architecture decisions, and significant refactors. When uncertain, use Sol.
- Use **Light** for simple deterministic work such as documentation, formatting, straightforward configuration/cleanup, and isolated changes. Use **Medium** for meaningful analysis, calculations, debugging, trade-offs, multi-file reasoning, planning, or security/domain reasoning. When uncertain, use Medium.
- Medium is the maximum for normal project execution; do not use High, Extra High, or Ultra. For difficult or high-risk work, use Sol + Medium instead of increasing reasoning beyond Medium.
- If Terra + Light becomes unexpectedly complex, escalate first to Terra + Medium, then to Sol + Medium when complexity, ambiguity, risk, or repeated failures justify it.
- Improve workflow, preflight, context selection, and validation scope before lowering model/reasoning below the level required by task risk. Do not globally replace Sol with Terra or Medium with Light to save quota.
- Model/reasoning choices optimize execution only. They never weaken Acceptance Criteria, Definition of Done, required tests, typecheck, lint, formatting, build validation, Swagger/OpenAPI, security validation, regression coverage, or correctness to save tokens.

## Route-by-route execution

- This project no longer follows a roadmap, Sprint lifecycle, Sprint queue, or automatic task progression. Do not create or maintain Sprint plans or `current.md`, `done.md`, and `queue.md` execution files.
- Apply the canonical [Technical Lead and Owner Decision Boundary](docs/standards/execution.md#technical-lead-and-owner-decision-boundary). Resolve ordinary technical planning and implementation choices using sound engineering judgment without shifting low-level Backend/database/security expertise to the owner. Surface only genuine Product/Owner decisions with a recommendation and approval request; this authority never overrides existing scope, architecture, schema/migration, dependency, Git, or implementation-approval boundaries.
- Work one owner-selected page/route at a time. The owner supplies the UI direction or reference; inspect the existing route and related architecture, then agree a bounded plan before implementation.
- Each route plan states Goal, Relevant existing architecture, Affected files/modules, Proposed implementation, API changes, Database changes, Security implications, Edge cases, Tests, Documentation impact, and explicit out-of-scope items.
- Implement only after explicit owner approval unless the request already clearly authorizes implementation. Approval applies only to the planned route and its necessary shared/API support; it does not automatically authorize another route.
- Every implementation declares Testing Impact. A Backend HTTP-contract change also declares Swagger / OpenAPI Impact with matching acceptance and validation criteria.
- Once implementation is approved, continue until that route succeeds, reaches an explicit Open Decision, or is genuinely blocked. Verify the approved route plan and applicable Definition of Done, run risk-based validation, update only durable architecture/feature documentation affected by reality, and report completion.
- After a route is completed, stop and wait for the owner to supply or select the next route and UI reference. Never prepare, activate, enqueue, or begin the next route automatically, and never plan a later Sprint or roadmap milestone.

### Failure, blockers, and context efficiency

- Fix in-scope implementation or validation failures and continue. If genuinely blocked, preserve completed evidence and report only the exact blocker and required owner input.
- Before substantial implementation, cheaply preflight external local infrastructure, required CLIs, environment values, and credentials that are necessary to implement or validate the task. For Prisma/schema/migration/persistence/data-integrity work, confirm the approved disposable PostgreSQL/Docker environment can run before expensive exploration or migration work. If a required dependency is unavailable, stop early; do not install system software or perform heavyweight setup without owner approval.
- Minimize routine conversational output, but never reduce correctness, validation, traceability, or important owner decisions to save context.
- Detailed preflight, context-budget, and execution-efficiency policy is canonical in [Task Execution and Context Efficiency](docs/standards/execution.md); validation breadth/reuse is canonical in [testing standards](docs/standards/testing.md).

### Token-efficient host-assisted workflow

Optimize for minimal unnecessary tool usage, retries, logs, and token consumption while still completing the task correctly. The owner has direct access to the Windows host and PowerShell for this repository.

After the first clear environment, tooling, network, permission, browser, authentication, or system-level failure, determine whether the owner can resolve it more efficiently on the host. Do not attempt multiple workarounds unless one is trivial and highly likely to succeed. If host assistance is appropriate, pause only that operation and provide: (1) exact PowerShell command(s), (2) the exact working directory, (3) one short sentence explaining the purpose, and (4) exactly what output/result to return. Once supplied, treat the result as evidence for that gate and resume without repeating completed work.

Prefer host assistance for package/runtime/browser/SDK/CLI or large-binary installation and downloads, Windows/system configuration, environment or PATH changes, starting/stopping host services, installed-software detection/use, administrator-only commands, network/CDN/geographic restrictions, authentication/permission limitations, and other capabilities unavailable in the execution environment.

Do not delegate normal repository work that is reliably available to the agent: reading/editing code, repository searches, implementation, targeted unit/component tests, typechecking, linting, builds, diff review, documentation, static analysis, and small diagnostics.

Use targeted checks during implementation, then the minimum required final regression gates. Do not rerun already-passing gates without invalidating changes, repeat near-identical searches, retry the same environment failure, dump or reread large logs, inspect unrelated files speculatively, or run full-repository checks when a targeted iteration check is sufficient. Prefer one decisive diagnostic command and summarize only its relevant result.

For every task, apply these token-efficiency rules without weakening scope or quality:

- Start with this file, the owner-approved route plan, and only the exact authoritative sections and implementation files needed. Do not print or load whole broad documents when targeted headings, line ranges, or searches are sufficient.
- Reuse established repository patterns and already-fetched documentation when still applicable. Do not repeat documentation lookups or repository searches unless the code, version, question, or evidence has changed; mandatory current-documentation rules still apply when triggered.
- Inspect concise status, diffs, and failure excerpts. Suppress routine success detail and summarize large command output instead of reproducing or rereading it.
- Group related edits and fix discovered type, lint, and test failures in batches. Avoid one-command-per-error iteration when one focused diagnostic identifies the set safely.
- Run the narrowest relevant tests while developing. After the change stabilizes, run each Acceptance Criteria/Definition of Done final gate once; repeat only a gate invalidated by later changes.
- Preserve passing evidence across interruptions and user-provided host results. Do not restart completed analysis or validation after resuming a task.
- Keep commentary concise and decision-oriented. Durable implementation and validation detail belongs in task documentation; chat should carry approvals, blockers, owner decisions, and short status updates.
- Avoid speculative abstractions, optional enhancements, duplicated tests, and unrelated cleanup. Implement the smallest coherent change that satisfies the approved task.

Token reduction never authorizes omitting Acceptance Criteria, meaningful automated tests, typechecking, linting, required builds, security/authorization review, API/schema/documentation impact checks, scope validation, required browser evidence, or any applicable Definition of Done item. Optimize how evidence is obtained and communicated, not which essential evidence is required.

For Admin Playwright E2E runs, the Playwright CDN returns HTTP 403 in this location. The Windows host has usable system Chrome. When a rerun is required, ask the owner to run from the repository root instead of attempting to download Playwright Chromium:

```powershell
cd "E:\------------- my ai proj\e-commerce"
$env:PLAYWRIGHT_USE_SYSTEM_CHROME='1'
yarn workspace @e-commerce/admin test:e2e
```

The owner confirmed this command passed repeatedly on 2026-09-04 with `Running 2 tests using 1 worker` and `2 passed` (latest approximately 6.5 seconds). Treat that Admin browser gate as passed for unchanged code; rerun it only when subsequent code changes invalidate the evidence.

### Live frontend review workflow

For every frontend/UI implementation task, make the relevant application available for live visual review from the start of implementation. This is the default workflow for Admin, authentication/login, and Storefront UI work.

- At task start, check whether the required development server is already running and usable. Reuse a usable server and do not restart it unnecessarily.
- If it is not running and can be started reliably in the execution environment, start it and keep it running during implementation so hot reload remains available.
- If startup requires the owner's Windows host or another manual host action, immediately provide the exact PowerShell command, exact working directory, one short purpose statement, and the exact result needed back, following the host-assisted workflow.
- Tell the owner the exact local URL and route to keep open for live review before substantial UI implementation. Do not defer visual availability until task completion.
- Preserve visual reference images supplied by the owner as working context for the relevant UI/routes and use them as the visual direction unless they conflict with authoritative project requirements. Do not discard or replace those references without explaining the conflict.

### Frontend theme and styling direction

- Both the Admin panel and Storefront must support a user-selectable light and dark appearance. New UI work must remain usable, legible, and accessible in both themes; do not treat the operating-system color preference as the only available control.
- Preserve a consistent theme across shared layouts and route transitions, avoid a visible incorrect-theme flash on initial render, and keep theme controls keyboard accessible with an explicit accessible name and visible current state.
- Use Tailwind utility classes as the required default styling approach for all new or materially touched frontend/UI work in both Admin and Storefront. Reuse established Tailwind tokens and patterns instead of adding route-specific plain CSS when utilities express the design clearly. Do not expand existing plain-CSS styling when the same result is maintainable with Tailwind.
- Use plain CSS classes only when Tailwind is technically unsuitable or materially less maintainable, such as global theme/token declarations, resets, third-party component internals, complex global selectors, keyframes, or behavior that requires a narrowly scoped stylesheet. Keep the exception minimal and briefly document a non-obvious reason in code. Existing legacy CSS migrates only in bounded touched slices; this rule does not authorize an unrelated repository-wide rewrite.
- Prefer theme tokens/CSS variables consumed through Tailwind over duplicated hard-coded light/dark colors. Existing plain CSS may be changed incrementally when touched; do not perform unrelated broad styling migrations.
- Tailwind code must remain free of IntelliSense canonical-class warnings. Prefer built-in canonical utilities and the closest suitable default scale value over arbitrary bracket syntax. When an exact non-default value is genuinely required or repeated, define one semantically named reusable Tailwind token with `@theme` or a reusable `@utility` in that application's Tailwind entry stylesheet (the Tailwind 4 CSS-first equivalent of extending `tailwind.config`) and consume its generated class everywhere. Do not leave one-off arbitrary widths, sizes, colors, shadows, typography, grid templates, or equivalent values in component class strings.
- If the affected application does not already have an approved Tailwind setup, the dependency and configuration boundaries still apply: present the exact addition and obtain explicit approval before installing or changing dependencies. Until approved, do not misrepresent Tailwind as available or silently add it.

### Responsive frontend direction

- Every Admin and Storefront page, layout, shared component, form, table/list, modal/drawer, and state surface must be mobile-first and intentionally responsive. A feature is not complete when its primary behavior is inaccessible, clipped, overlapping, or dependent on horizontal page scrolling at a supported viewport.
- Express responsive width, max-width, min/max sizing, grid/flex changes, gaps, padding, typography, visibility, and ordering with Tailwind utilities and its default `sm`/`md`/`lg`/`xl`/`2xl` variants. Prefer the default breakpoint scale; add or change breakpoint tokens only with demonstrated product need and explicit approval.
- Start with the smallest layout as the unprefixed Tailwind classes, then layer larger viewport behavior with breakpoint variants. Avoid desktop-first `max-*` patches when a clear mobile-first composition is available.
- Prefer fluid constraints such as `w-full`, `min-w-0`, responsive grids, and canonical `max-w-*` utilities. Fixed widths/heights are allowed only for intrinsically fixed controls/assets or documented technical constraints and must not prevent zoom, localization, validation messages, or Persian RTL content from reflowing. Any justified exact non-default constraint must use a named reusable Tailwind theme token or utility rather than bracket syntax in markup.
- Dense desktop tables must become an accessible compact table, horizontally contained region, or card/list composition on smaller screens without hiding required information or actions. Forms and action groups stack or wrap before controls become too narrow; touch targets, focus visibility, labels, errors, pending states, and permission behavior remain intact at every breakpoint.
- Validate meaningful frontend work at approximately 360px phone, 768px tablet, 1280px desktop, and a wider desktop when layout density changes. Add focused component/browser evidence for breakpoint-driven behavior that affects navigation, information availability, action access, or overflow; screenshots alone do not replace semantic and interaction tests.

### Shared frontend component direction

- Each frontend application owns its own `components/shared/` boundary. Put genuinely repeated UI primitives there, including buttons, form controls/wrappers, inputs, panels/cards, badges, and other tags used across multiple feature areas. Keep one-off or domain-specific composition feature-local until reuse is demonstrated.
- Shared components must forward the applicable native or library attributes, preserve accessible semantics, accept a caller `className`, and expose only deliberate typed variants such as `tone`, `variant`, and `size`. Support `ref` forwarding when consumers need imperative focus or measurement.
- Compose Tailwind classes from complete statically discoverable strings and explicit variant maps. Never construct partial class names such as `bg-${color}`; use a finite map or CSS variables consumed by complete Tailwind utilities for runtime values.
- Reuse approved theme tokens/CSS variables for brand colors, spacing, radii, focus, light/dark surfaces, and states. Feature callers may extend layout through `className` but must not bypass accessibility, pending/disabled behavior, or semantic variants owned by the shared primitive.
- Admin and Storefront keep independent shared-component implementations because their design systems and runtime boundaries differ. Do not create a cross-application UI package until multiple proven consumers and a separately approved architecture justify it.

### Frontend forms and validation direction

- Use React Hook Form with Zod schemas and the official Zod resolver as the standard form architecture for current and future frontend forms. Keep schemas feature-local unless genuine cross-route reuse justifies a shared boundary.
- Backend validation and authorization remain authoritative. Client schemas provide accessible early feedback and payload typing but must not duplicate or weaken stable Backend invariants, safe error handling, or normalized-response reconciliation.
- Every field must retain a persistent visible label, linked accessible errors, predictable invalid-field focus, disabled/busy single-flight submission, and safe preservation or reset behavior. Schema adoption never replaces interaction, permission, conflict, or failure-path tests.
- Migrate existing forms in bounded, tested slices. Do not perform an unreviewed repository-wide rewrite or mix unrelated form migrations into feature tasks; nevertheless, all existing frontend forms remain migration targets until they use the approved React Hook Form/Zod pattern.
- Add Zod and resolver dependencies only to an application that has forms and only after the exact versions are explicitly approved under the dependency boundary. Do not add form dependencies speculatively to applications without a current form workflow.

### Frontend server-state and request direction

- TanStack Query is the accepted server-state/cache manager for Client Components. Admin uses exact `@tanstack/react-query` `5.102.8` and development-only `@tanstack/react-query-devtools` `5.102.8`; apply the same architecture independently when Storefront client data is developed, with separately approved Storefront dependencies.
- Admin thin adapters live under `apps/admin/hooks/rq_hooks/` as `useRQFetcher.ts`, `useRQSender.ts`, and `useRQDeleter.ts`. Feature-specific hooks own endpoint DTOs, runtime response parsing, complete query keys, cache reconciliation, invalidation, and domain-safe outcomes. Storefront later mirrors this separation in its own application boundary rather than importing Admin credentials or feature behavior.
- All Backend requests initiated by Client feature components go through feature hooks over those adapters. Next.js Proxy/bootstrap, BFF Route Handlers, Server Component prefetching, and low-level authentication transport are non-hook infrastructure exceptions.
- Preserve the existing Axios -> same-origin `/api/v1/**` BFF -> Backend path, CSRF policy, normalized failures, exact `ACCESS_TOKEN_EXPIRED` refresh eligibility, single-flight Refresh, and one-time replay. Browser Refresh calls remain visible in Network; do not add `axios-auth-refresh`, a duplicate `/api/proxy`, or a second refresh/retry authority.
- Never extract HttpOnly Access/Refresh cookies into frontend data or an invented token header. BFF forwards cookies and Backend `Set-Cookie`; frontend JavaScript reads only the session CSRF cookie for unsafe-request headers.
- Query keys are readonly arrays containing every request variable and should come from feature key factories. Invalidation accepts `readonly QueryKey[]`, passes each key unchanged to `invalidateQueries`, and awaits relevant invalidations; do not delay invalidation with timers.
- Configure stale time, garbage collection, focus/reconnect refetch, and retry deliberately. Retry only bounded eligible safe reads; never automatically retry mutations, `4xx`, cancellation, validation, conflict, forbidden, not-found, configuration, or definitive authentication failures. `Infinity` requires genuinely stable or explicitly invalidated data.
- Keep QueryClient browser-stable and server-request-scoped when prefetch/hydration is used. Never share server cache across users. Clear all user-scoped query data on logout, terminal authentication loss, or identity change.
- Query cache never establishes authorization and does not replace URL state, local form state, React Hook Form, Proxy/AuthProvider authentication truth, runtime response validation, or Backend authority. Do not persist it to Web Storage without a separate security/UX decision.
- Any later dependency/version change still requires explicit approval. Canonical detail is [ADR 0014](docs/architecture/adr/0014-adopt-tanstack-query-client-server-state.md).

### Admin visual references and approval workflow

The following repository-owned images are the primary visual references for all current and future Admin UI work:

- [`docs/assets/admin-ui-references/panel-e-commece.webp`](docs/assets/admin-ui-references/panel-e-commece.webp)
- [`docs/assets/admin-ui-references/panel-e-commece1.webp`](docs/assets/admin-ui-references/panel-e-commece1.webp)

Use them as design direction, never as a pixel-for-pixel reproduction. They establish a modern, clean, premium SaaS/e-commerce back-office language: light neutral backgrounds, elevated white surfaces, a polished RTL sidebar, clear hierarchy, generous but efficient spacing, consistent rounded cards/panels/forms/tables/modals/drawers, subtle borders and shadows, modern typography/icons, restrained accents, compact readable data layouts, responsive desktop/tablet/mobile composition, and excellent Persian RTL behavior. Apply the approved language consistently to Dashboard, Products, Categories, Orders, Settings, Auth, and future Admin pages.

The owner-approved representative Catalog direction additionally fixes `#ed980e` as the strong Admin accent and `#f2b249` as its lighter supporting accent. Use dark foreground text on these amber fills where white text would not meet contrast, and retain neutral white/gray surfaces as the dominant visual language. `/catalog/products` is the representative page; do not propagate its visual pattern broadly until the owner approves it in live review.

Preserve Ant Design 6, accessibility requirements, current architecture, permission behavior, Backend contracts, and authoritative functional specifications. Do not add a UI dependency or change functionality merely to imitate a reference. These images currently direct Admin visuals only; do not apply them to Storefront unless the owner explicitly requests it.

Before substantial Admin visual implementation:

1. Inspect existing Admin routes and identify which pages are already visually implemented.
2. Apply the live frontend review workflow and give the owner exact implemented routes to inspect.
3. Pause broad visual redesign until the owner reviews the existing UI and provides feedback against these references.
4. After feedback, refine one representative Admin page first and make it available through hot reload.
5. At meaningful visual milestones, give the exact route to open or refresh and briefly state what changed.
6. Do not propagate the design broadly until the owner visually approves that representative page. Once approved, treat its implementation as the Admin design pattern for later pages.

Passing functional tests and Acceptance Criteria does not constitute visual approval. Preserve explicit owner visual review before broad propagation.

## Required workflow

Before any non-trivial implementation:

1. Review the task, Acceptance Criteria, and Required Context for scope and context-budget fit.
2. Preflight any required external infrastructure, CLI, environment, or credential dependency before expensive exploration or implementation.
3. If preflight passes, inspect relevant existing code and read only the Minimum Sufficient authoritative context; for Next.js work, read the relevant installed guide under `node_modules/next/dist/docs/`.
4. Identify reusable existing patterns.
5. Determine affected applications and packages.
6. Describe architecture impact.
7. Describe API impact.
8. Describe database impact.
9. Describe security implications and edge cases.
10. Describe required tests and documentation impact.
11. Present a plan headed: Goal, Relevant existing architecture, Affected files/modules, Proposed implementation, API changes, Database changes, Security implications, Edge cases, Tests, Documentation impact.
12. If the request did not already explicitly authorize implementation, wait for explicit approval before changing code.

When authorized, make the smallest coherent change, follow established architecture, avoid scope expansion, run relevant checks, and report changes, checks, and unresolved concerns. Explain non-trivial architecture and security patterns, alternatives, trade-offs, failure modes, and security implications so the user retains ownership.

## Mandatory boundaries

- Never stage, commit, push, merge, rebase, or create/delete branches without explicit approval. Never run destructive Git operations without explicit approval. See [Git standards](docs/standards/git.md).
- Never add, remove, or upgrade dependencies without explicit approval.
- Use the accepted Yarn toolchain and Yarn Workspaces; do not introduce pnpm or change the Yarn major version without an explicit owner decision.
- Installed does not mean architecturally mandatory: preserve already-installed useful packages, do not force their use, and do not remove them merely for minimalism. Use them only when an approved task has a concrete need.
- Do not create, modify, generate, or apply a database migration unless the approved task explicitly includes the corresponding schema change. Do not change the Prisma schema outside approved task scope. For a non-trivial schema change, present the proposed model and migration impact before implementation unless that implementation was already explicitly approved.
- Never make unrelated changes, silently decide an ambiguous major architecture issue, expose secrets, or claim planned behavior is implemented.
- Backend authorization is authoritative; UI visibility is not authorization.
- Avoid speculative infrastructure and abstraction. No microservices, Kafka, Kubernetes, Elasticsearch, or Redis until approved requirements justify them.

## Definition of done

Work is done only when the requested behavior and acceptance criteria are met; meaningful runtime changes have appropriate passing automated tests; relevant type, lint, build, and validation checks pass; error/loading/empty states, accessibility, authorization, and security cases are addressed where relevant; contracts and docs are current; and no unrelated or unapproved Git/dependency changes exist. See [testing standards](docs/standards/testing.md).

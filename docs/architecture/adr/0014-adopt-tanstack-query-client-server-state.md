# 0014: Adopt TanStack Query for Client Server State

**Status:** Accepted and implemented in Admin

## Context

Admin feature screens currently call the centralized Axios client through typed feature API functions and manage remote loading, error, reconciliation, and refetch state locally. The owner wants consistent caching, stale-time control, request-state handling, targeted invalidation, and easier reuse while keeping browser requests visible in developer tools. The same client-data pattern must guide the future Storefront rather than creating a second incompatible approach.

Authentication has already adopted a same-origin BFF, readable session-bound CSRF cookie, HttpOnly Access/Refresh cookies, pre-render Proxy bootstrap, and single-flight expired-Access recovery. A server-state library must compose with those boundaries rather than replace or duplicate them.

## Decision

Adopt TanStack Query as the standard manager for remote/server state consumed by Client Components. Begin with a bounded Admin slice, then migrate existing Admin feature calls in tested slices. When Storefront client data work begins, apply the same layering and policies through a separate Storefront provider, hooks, keys, API contracts, and authentication credentials where Customer authentication is approved.

The target Admin layering is:

```text
Feature component
  -> feature-specific query/mutation hook
  -> useRQFetcher / useRQSender / useRQDeleter
  -> existing Axios security and failure boundary
  -> existing same-origin /api/v1/** BFF
  -> Backend API
```

Admin owns `hooks/rq_hooks/useRQFetcher.ts`, `useRQSender.ts`, and `useRQDeleter.ts`. These are thin typed adapters over TanStack Query, not locations for feature semantics. Feature folders own hooks such as `useGetProducts` or `useUpdateInventory`, complete query keys, request/response DTOs, runtime success parsing, cache reconciliation, and user-facing domain outcomes.

All Backend calls initiated by Client feature components use feature hooks over these adapters. Exceptions are infrastructure that cannot be a React hook: Next.js Proxy/bootstrap, Route Handlers/BFF forwarding, Server Component prefetching, and low-level authentication transport orchestration. Login/logout may later expose mutation hooks to components, but Backend authentication truth remains in Proxy/AuthProvider and never solely in Query cache.

The existing `/api/v1/[...path]` Route Handler remains the single Admin BFF. It already forwards bounded request headers, cookies, response headers, response bodies, status, and every `Set-Cookie`. No duplicate `/api/proxy` route is introduced merely to adopt TanStack Query. Browser calls, including `/api/v1/auth/refresh`, remain visible in the browser Network panel; only the BFF-to-Backend hop is server-internal.

The existing Axios client remains responsible for timeout, normalized safe failures, CSRF-header injection, cancellation, exact refresh eligibility, single-flight Refresh, and one-time replay. TanStack Query receives the final success/failure after that transport policy. Do not add `axios-auth-refresh`, create a second refresh coordinator, or let both Axios and TanStack independently retry authentication recovery.

Access and Refresh remain host-only HttpOnly cookies. The BFF forwards cookies server-to-server and forwards Backend `Set-Cookie` responses to the browser; it does not extract Access into a JavaScript-readable value or invent an access-token header. The readable Strict CSRF cookie remains the only credential read by frontend JavaScript and is copied only into unsafe-request `X-CSRF-Token` headers.

## Provider and cache ownership

- Add one narrow Client `QueryClientProvider` inside each application provider tree. Admin uses exact runtime/devtools version `5.102.8`; a future Storefront installation remains separately approval-gated.
- Keep one stable QueryClient for the lifetime of a browser application instance. Never construct it during every render.
- If Server Component prefetch/dehydration is introduced, create a new QueryClient per server request and never share a module-global server cache across users.
- SSR/hydration uses a positive stale time to avoid an immediate duplicate client fetch. Server prefetch is optional and adopted only where it materially reduces a waterfall.
- Query cache is not persisted to Web Storage by default. Full reload therefore starts from server/bootstrap truth unless an explicitly reviewed hydration boundary supplies data.
- Definitive logout, terminal authentication loss, or a change of authenticated identity clears/removes all user-scoped query data before another identity can render it.
- Authentication, current permission, revocation, and session validity remain Backend/Proxy authoritative. Cached permission-aware feature data never grants access.

## Query policy

- Query keys are readonly serializable arrays and include every variable used by the query function, for example `['products', { page, pageSize, categoryId, status }]`.
- Feature-owned key factories provide stable prefixes for exact and related invalidation; raw ad hoc keys are not scattered through components.
- `staleTime`, `gcTime`, focus/reconnect refetch, polling, and retry are deliberate defaults with per-query overrides. `Infinity` is reserved for data that is stable for the application lifetime or is guaranteed to be explicitly invalidated.
- Safe GET retries are bounded and limited to appropriate transport/temporary-server failures. Do not retry cancellation, configuration errors, `4xx`, definitive authentication/authorization, validation, conflict, or not-found outcomes.
- Mutations do not retry automatically. Duplicate submission remains prevented through pending/disabled or existing single-flight behavior.
- `useRQFetcher` returns parsed data and standard TanStack query state. It does not own global notification deduplication through mutable module state.
- `useRQSender` supports `POST`, `PUT`, and `PATCH`; `useRQDeleter` supports `DELETE`. Both return parsed mutation data and accept exact feature callbacks/options without weakening the centralized request policy.
- Invalidation input is `readonly QueryKey[]`, not one `QueryKey` iterated as though it were a list. Each key is passed unchanged to `queryClient.invalidateQueries({ queryKey })`, and the invalidation promises are awaited when subsequent UI behavior depends on fresh data. No arbitrary timeout delays invalidation.
- Prefer reconciling an authoritative normalized mutation response with `setQueryData` where safe, followed by targeted invalidation when related projections may be stale. Never guess Backend-normalized state or implement broad cache clearing after every mutation.
- Error presentation belongs to the feature or an accessible shared error boundary. Stable codes are mapped to safe Persian messages; unknown response diagnostics are not surfaced. Global auth handling remains in the existing authentication failure boundary.

## Response typing

The reusable hooks remain generic over feature DTOs and `AdminHttpError`. The Backend now owns the canonical `ApiResponse<Result, SingleResult, Details>` envelope for every JSON application response. Feature API boundaries validate that envelope before validating and returning their expected domain payload; thin Query adapters do not duplicate envelope parsing or feature semantics.

This decision supersedes the earlier rejection of a global success envelope. The owner approved the replacement on 2026-09-08. The existing Axios security boundary, `/api/v1/**` BFF, single-flight Refresh, Query cache ownership, and runtime trust-boundary validation remain unchanged. Successful image-content routes remain raw binary so browsers can stream and cache them directly; their failures still use `ApiResponse`.

## Storefront continuity

Future Storefront client requests follow the same provider -> feature hook -> thin RQ adapter -> Axios/BFF -> Backend structure, query-key discipline, cache/retry/invalidation rules, runtime parsing, and identity-change cleanup. Code may be shared only after real compatible behavior is demonstrated. Storefront remains public today; future Customer authentication uses separate Customer cookies/sessions/contracts and never Admin cache or credentials.

## Consequences

TanStack Query becomes the client server-state tool, not a replacement for URL state, local form state, React Hook Form, server rendering, authentication state, or Backend authorization. Network debugging remains available for actual requests, while a fresh cache intentionally means no new network call. Admin Devtools are development-only and excluded outside development mode.

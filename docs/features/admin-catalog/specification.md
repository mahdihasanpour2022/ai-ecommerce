# Admin Catalog Behavior and UX Specification

**Status:** Approved for Sprint 3 implementation

## Required Context

- [Sprint 3 plan](../../sprints/sprint-03.md) owns scope, accepted Owner Decisions, and exit criteria.
- [Catalog specification](../catalog/specification.md) owns Backend invariants, HTTP contracts, permissions, DTOs, and stable failures.
- [Admin authentication specification](../admin-auth/specification.md) owns login, current-session, refresh, logout, and protected-entry behavior.
- [Frontend architecture](../../architecture/frontend-architecture.md) and [frontend standards](../../standards/frontend.md) own App Router, Persian RTL, accessibility, and client-state boundaries.
- [Testing standards](../../standards/testing.md) own evidence depth.

This document owns only the minimum user-visible Admin catalog behavior. It does not redefine Backend rules or authorize implementation, dependencies, schema changes, Storefront work, or later commerce behavior.

## Purpose and fixed decisions

Sprint 3 extends the existing authenticated Admin shell into a usable Persian RTL catalog workspace. The five approved decisions are fixed:

- no new Role, grant, or Role-management UI; `SUPER_ADMIN` remains the only provisioned operator;
- a Product list, focused Draft creation, and one sectioned Product workspace with explicit readiness and confirmed publication;
- absolute Inventory updates with optimistic-version conflict recovery and no silent merge;
- accessible in-workspace Image upload, preview, reorder, replace, and remove behavior without advanced media features; and
- no persistent catalog audit history or audit-log UI in Sprint 3.

Backend validation and authorization remain authoritative. Client checks explain and prevent obvious invalid actions but never establish permission, lifecycle validity, uniqueness, current Inventory, current Image order, or successful publication.

## Information architecture and routes

All routes live in the Admin Next.js App Router and require the existing authenticated Admin entry boundary.

| Route | Persian page purpose | Minimum permission to render data | URL state |
| --- | --- | --- | --- |
| `/` | Existing Admin home with catalog navigation | `admin.access` | None |
| `/catalog/categories` | Category tree and management | `catalog.read` | None |
| `/catalog/products` | Protected Product list | `catalog.read` | `page`, `pageSize`, optional `categoryId`, optional `status` |
| `/catalog/products/new` | Focused Draft Product creation | `catalog.read` + `catalog.manage` | None |
| `/catalog/products/[productId]` | Sectioned Product workspace | `catalog.read` | Optional allowlisted `section` for `overview`, `variants`, `inventory`, or `images` |
| `/catalog/settings/price-display-unit` | Global display/input unit | `catalog.read` | None |

Unknown or malformed filter, page, Product ID, or `section` values are not forwarded. The UI restores the nearest canonical route or presents a safe not-found state as appropriate. Product list filter and page state remain shareable in the URL. Form values, credentials, CSRF material, image bytes, and server errors never enter URLs.

The shell navigation contains Home, Categories, Products, and Price Display Unit. Catalog entries are absent when `catalog.read` is absent. A breadcrumb and one page-level heading identify every catalog route. The Product workspace uses links or tabs backed by the allowlisted `section` value so keyboard navigation and browser history remain predictable.

## Authentication, authorization, and request behavior

The existing Auth Provider, memory-only CSRF store, credentialed Axios client, single-flight expired-Access recovery, and one-time request replay are reused.

- Safe reads omit CSRF; every unsafe catalog request requires the current in-memory CSRF credential.
- Catalog requests are refresh-eligible only for `401 ACCESS_TOKEN_EXPIRED`. Mutations are never replayed more than the existing single bounded recovery attempt.
- Definitive `401` outcomes and `ACCOUNT_DISABLED` transition through the existing global authentication boundary and remove protected catalog content.
- `403 INSUFFICIENT_PERMISSION` never triggers refresh or mutation retry. The affected action stops, current identity/permissions are refreshed once, and the route or action is reevaluated. A direct route that no longer has `catalog.read` shows the protected forbidden state with a link to Home.
- `403 CSRF_VALIDATION_FAILED` preserves unsaved input, shows the existing safe refresh-page instruction, and never retries the mutation automatically.
- Domain validation/conflict/not-found failures remain local to their page, section, form, or confirmation dialog. Network, timeout, and safe server failures preserve non-sensitive unsaved input and offer an explicit retry.
- Aborted navigation requests are silent. Stale read responses cannot overwrite a later filter, route, or successful mutation result.

Frontend visibility is the intersection of the read permission needed to understand a resource and its mutation permission. Holding a mutation permission without `catalog.read` does not expose a usable catalog screen.

### Permission matrix

| Capability | Required effective permissions | UI behavior without mutation permission |
| --- | --- | --- |
| View Categories, Products, Variants, exact Inventory, Image metadata/content, setting | `catalog.read` | Catalog navigation and direct routes are unavailable without it. |
| Create/rename/move/delete Category | `catalog.read` + `catalog.manage` | Read-only tree; mutation controls are absent, with no misleading disabled primary action. |
| Create/edit/transition Product or create/edit/reactivate Variant | `catalog.read` + `catalog.manage` | Product screens remain read-only and explain that editing access is unavailable. |
| Set exact Inventory | `catalog.read` + `inventory.update` | Quantities remain visible; edit controls are absent. |
| Upload/reorder/replace/remove Images | `catalog.read` + `product.media.manage` | Gallery and protected Images remain visible; mutation controls are absent. |
| Change global display/input unit | `catalog.read` + `settings.price.display.unit.update` | Current unit remains visible; update control is absent. |

Permission snapshots affect usability only. Every direct request remains subject to current Backend checks.

## Shared interaction and state rules

### Read states

Every data route has:

- a labelled busy state that does not announce repeatedly;
- an actionable empty state distinct from a transport failure;
- a safe connectivity/timeout state with Retry;
- a safe server state with Retry and no raw diagnostics;
- a forbidden state that identifies missing access without exposing protected data; and
- a not-found state for missing Product resources, with a return link to the Product list.

Retry repeats only the failed safe read. A successful mutation reconciles from the normalized response; when that response is intentionally narrow, it refetches the smallest owning resource. The UI never fabricates normalized text, incremented versions, reordered metadata, or lifecycle state.

### Forms and mutations

- React Hook Form owns non-trivial form state. Ant Design controlled inputs integrate through `Controller`; native-compatible inputs may use direct registration.
- Client validation mirrors safe shape/range guidance for usability. Server failures remain authoritative and stable codes determine field, section, or form-level presentation.
- The first invalid field receives focus after client validation. Server `details` may focus an allowlisted field name; unknown details remain at the form summary.
- While a mutation is pending, its initiating controls are disabled and marked busy. A per-operation single-flight gate prevents duplicate submission.
- Success is announced politely and focus moves to the resulting heading or remains on the initiating control when continued editing is expected.
- Error summaries use assertive announcement once and link to associated fields where applicable.
- Dirty forms prompt before in-application route changes and browser unload. Successful normalized reconciliation resets the dirty baseline.
- Destructive or externally visible actions use a labelled confirmation dialog. Cancel returns focus to the opener; confirm is not the initially focused destructive control.

### Error placement

`VALIDATION_FAILED` maps allowlisted `details` values to fields and otherwise appears in the form summary. Uniqueness, mode, lifecycle, version, main-Image, and non-empty Category conflicts appear beside the owning control plus in the summary. Safe Backend Persian text may be displayed only after the envelope is structurally validated; raw Axios, SQL, Prisma, stack, storage, path, or key content is never rendered.

## Persian RTL, responsive, and accessibility behavior

- The document remains `lang="fa"` and `dir="rtl"`; Ant Design uses its Persian locale and RTL direction.
- Page titles, instructions, buttons, confirmations, status names, validation, empty states, and errors are Persian. Stable English error codes are not primary user text.
- SKU, UUID-derived technical values when unavoidable, file sizes, versions, and numeric inputs use isolated left-to-right presentation (`bdi` or an equivalent safe boundary). Prices use Persian-formatted digits for display and a predictable numeric editing direction.
- Every input has a persistent visible label and, where needed, linked hint/error text. Required state is communicated in text, not color alone.
- Native buttons/links and semantic headings/landmarks are preferred. Tree, tab, dialog, upload, table, and pagination behavior remains keyboard operable with visible focus.
- Modal focus is trapped while open, begins on the safest meaningful control, closes with Escape unless a non-cancelable submission is pending, and returns to its opener.
- Dynamic success uses a polite live region; blocking errors use `role="alert"`; pending state uses `aria-busy` without hiding context.
- Desktop data tables become labelled stacked records at narrow widths rather than requiring horizontal scrolling for core actions. Each record preserves its Product/Variant name, status, price, quantity, and actions programmatically.
- Image order is never pointer-only. Move-earlier and move-later buttons include the Product/Image position in their accessible names and disable correctly at each edge.
- Color never carries lifecycle, permission, availability, validation, or focus meaning by itself. Layout remains usable at 200% zoom and common mobile widths.

## Category management

The page loads the complete bounded tree ordered by the Backend. Each node shows name and level. Expand/collapse does not alter server state.

### Create

- `catalog.manage` exposes “افزودن دسته‌بندی”.
- The form requires a 1–120 character name after normalization and an optional parent selected from the current tree; root is explicit.
- Success inserts only from the normalized returned Category, then refetches the authoritative tree to obtain levels and nesting.
- `CATEGORY_NAME_CONFLICT`, `CATEGORY_LIMIT_REACHED`, `CATEGORY_NOT_FOUND`, and `VALIDATION_FAILED` remain in the dialog with actionable Persian guidance.

### Rename and move

- One edit dialog supports name and parent. At least one actual change is required.
- Parent choices exclude the Category and its visible descendants for guidance. The Backend still owns cycle, depth, concurrent move, and sibling-name enforcement.
- Success closes the dialog, announces the change, and refetches the tree. `CATEGORY_MOVE_INVALID` never leaves the optimistic local tree displayed.

### Delete

- Delete requires a dialog naming the Category and explaining that children or any Product reference prevent deletion.
- The UI may omit delete for a visibly non-leaf Category but cannot infer Product references; `CATEGORY_NOT_EMPTY` is an expected retained-tree outcome.
- Success returns focus to the nearest surviving node or the page heading. Failure preserves the node.

## Product list

The list requests the protected contract defaults of page 1 and page size 25, with selectable sizes 25, 50, and 100. It supports only exact Category and `DRAFT`/`ACTIVE`/`ARCHIVED` status filters. Changing a filter or page size resets page to 1. The API’s `updatedAt DESC, id DESC` ordering is labelled “آخرین به‌روزرسانی”; no unsupported sort control is shown.

Each record displays name, Category, lifecycle, Variant/active-Variant counts, main-Image thumbnail when present, min/max price in the current display unit, exact aggregate on-hand quantity, and updated time. A missing Image has a textual placeholder. Selecting a record opens its workspace.

The empty state distinguishes an empty catalog from filters with no match. Users with `catalog.manage` receive a Draft-create action; read-only users receive no mutation call to action. Pagination uses API metadata and canonicalizes an out-of-range page after deletions or filter changes.

## Draft Product creation

Creation requires Product name, Category, and at least one Variant. Description is optional. Product lifecycle is not selectable and is explained as Draft.

### Variant mode

The creator explicitly chooses one mode:

- **بدون گزینه:** exactly one Variant with both size and color absent;
- **دارای اندازه یا رنگ:** every Variant has at least one non-empty size or color value.

The selected mode is fixed after creation for Sprint 3 because the existing single-Variant mutation contracts do not provide an atomic safe mode conversion. The workspace does not offer mode switching. Named mode may add more Variants later; default mode may not add another Variant.

Each initial Variant requires SKU and price; active defaults to true and initial on-hand defaults to zero. SKU guidance states 1–64 uppercase Latin letters/digits plus hyphen/underscore and submits the normalized uppercase value. Size/color accept 1–80 normalized characters when present. Product name accepts 1–200 normalized characters and description is null or 1–5000 safe plain-text characters.

The current display/input unit is fetched before editing and remains the labelled unit for that form instance. Submission converts every valid input to canonical `priceRial`. A successful `201` routes to the returned Product workspace. Failure preserves every safe input and maps Category, SKU, combination, mode, and validation failures without partial-success wording.

## Product workspace

The workspace loads Product detail and the current display unit and presents Overview, Variants, Inventory, and Images. Product name and lifecycle remain visible across sections. Each section has an independent pending/error boundary so an Image or Inventory failure does not erase other successfully loaded detail.

### Core fields

`catalog.manage` allows name, plain-text nullable description, and Category updates. Empty description is submitted as `null`. The form submits changed fields only and resets from the normalized Product response. Archived Products expose no content mutation until the explicit Archived-to-Draft transition succeeds.

### Variants

- All retained Variants are shown with SKU, nullable size/color, canonical-derived display price, active state, and exact Inventory.
- Named-mode Products may add a Variant; default-mode Products do not show Add Variant.
- Editing submits only changed SKU, size, color, price, or active state. Clearing size/color submits `null`.
- There is no delete action. Deactivation/reactivation is labelled as retention, not deletion.
- The UI warns before deactivating and does not imply success until the normalized response arrives.
- `SKU_CONFLICT`, `VARIANT_COMBINATION_CONFLICT`, `VARIANT_MODE_CONFLICT`, lifecycle conflicts, last-active conflicts, and not-found outcomes preserve other rows and refetch the Product when server state may have changed.

### Readiness and lifecycle

The readiness summary is advisory and derives only from loaded detail:

- non-null description;
- at least one ready Image at position zero;
- at least one active Variant; and
- a structurally valid default or named active-Variant mode.

Category ownership and Inventory existence are already represented by protected detail but remain Backend-validated. The summary never claims publication is guaranteed.

Lifecycle actions are separate from dirty content forms:

- Draft → Active: available only when the visible advisory checklist is complete and requires confirmation that the Product becomes public;
- Active → Draft: requires confirmation that public visibility stops;
- Draft or Active → Archived: requires a stronger confirmation explaining that content becomes read-only until restored;
- Archived → Draft: the sole Archived transition and restores editing;
- no Archived → Active action exists.

Unsaved section changes must be saved or discarded before a lifecycle request. `PRODUCT_ACTIVATION_INCOMPLETE` refreshes detail and focuses the readiness summary. Other lifecycle conflicts refresh current status and require a fresh intentional action; no transition retries automatically.

## Price display and input unit

The global setting page displays `RIAL` as “ریال” and `TOMAN` as “تومان”. Updating it requires confirmation because it changes Admin and later Storefront display/input interpretation, but the dialog explicitly states that persisted prices are not rewritten.

- API DTOs always contain positive safe-integer `priceRial` divisible by 10.
- In RIAL mode, display/input amount equals `priceRial` and valid input must be divisible by 10.
- In TOMAN mode, display/input amount equals `priceRial / 10`; valid positive integer input is multiplied by 10 after a safe-integer overflow check.
- Conversion uses integer arithmetic only. No decimals, rounding, localized separator parsing ambiguity, floating-point price calculation, or mixed `price` field is allowed.
- Grouping separators may appear in read-only display. Editing accepts normalized Persian/Arabic or ASCII decimal digits only after removing explicitly supported visual grouping separators; signs, exponent notation, decimal points, and other characters are rejected.

An open Product form keeps the unit captured at initialization and labels it visibly; a concurrent global setting change never silently reinterprets typed input. Navigating or explicitly reloading the form adopts the latest unit. A successful setting update refreshes current read-only prices and starts subsequently opened forms in the new unit.

## Inventory management

Each Variant shows exact `onHandQuantity` and exposes editing only with `inventory.update`. The input is an integer from 0 through 2,147,483,647 and sends exactly the last-read positive `version`.

- Success replaces quantity and version from the response and announces the saved absolute amount.
- Same-value submission remains a valid intentional update and accepts the returned incremented version.
- `INVENTORY_VERSION_CONFLICT` discards no typed value silently: the UI explains that another update won, refetches Product detail, shows the new authoritative quantity, and requires the Admin to enter/confirm a fresh amount.
- Missing Variant or lifecycle conflict refetches the workspace and removes or disables the stale editor as appropriate.
- There are no plus/minus adjustment semantics, bulk updates, reasons, reservation figures, history, or automatic retries.

## Product Image management

The gallery displays zero to nine protected ready Images in authoritative position order. Position zero is labelled Main Image. Preview URLs use `/api/v1/admin/catalog/product-images/{imageId}/content`; no storage key, path, caller filename, or public-eligibility inference is shown. Preview alternative text is derived from Product name and position because no persisted alt-text contract exists.

### Upload and replacement

- File selection accepts `.jpg`, `.jpeg`, `.png`, and `.webp` hints and performs local checks for one non-empty file strictly below 409,600 bytes. SVG is never offered or submitted.
- Client type/size checks are guidance only; the Backend remains authoritative for signature, container, decoding, animation/polyglot, dimensions, and pixel limits.
- Upload appends using the current `imageVersion`; the first ready Image becomes main.
- Replacement names the affected position, requires confirmation, and sends the current `imageVersion`. Success uses the new returned Image UUID/content URL and never reuses a cached old identity.
- The selected browser `File` exists only in memory until submit and is cleared after success, cancel, or unmount.

### Reorder and remove

- Move-earlier/move-later controls update a local proposed complete order. “ذخیره ترتیب” submits every current Image UUID exactly once with the last-read `imageVersion`; Cancel restores authoritative order.
- Mutation controls are disabled while an order is dirty except Save/Cancel. Upload, replace, remove, and lifecycle operations cannot race an unsaved proposed order in the same UI.
- Remove requires confirmation. An Active Product main Image cannot be removed; replacement or return to Draft is explained. Draft may remove its final Image.
- Success replaces the complete Image collection and `imageVersion` from the response or refetched detail.
- `PRODUCT_IMAGE_ORDER_CONFLICT` reloads the authoritative collection, discards the local proposal with an explicit notice, and requires a new intentional reorder/upload/replace/remove action.
- Limit, main-required, lifecycle, type, content, dimensions, size, storage, and not-found failures retain the last authoritative gallery and never present partial success.

## Confirmation boundaries

Confirmation is required for Category delete, Variant deactivation, Product lifecycle transitions, global unit changes, Image replacement, and Image removal. Category create/edit, Product field save, Variant field save/reactivation, Inventory absolute save, Image upload, and Image-order save do not require a second confirmation because their labelled forms already express the direct non-destructive intent. No confirmation action is preselected through focus.

## Testing contract

### Unit and transformation evidence

- URL query canonicalization and allowlisting;
- permission-capability calculation;
- Persian/Arabic digit normalization and exact RIAL/TOMAN integer conversion including overflow/divisibility rejection;
- readiness advisory calculation and lifecycle-action mapping;
- Variant-mode creation rules and fixed-mode action availability;
- stable error-code classification and safe field-detail allowlisting; and
- complete Image reorder proposal generation.

### Component and integration evidence

- protected routing, loading/empty/error/retry/not-found states, and stale response cancellation;
- permission-aware navigation/read-only/action states for all five permissions plus runtime revocation;
- Category CRUD dialogs, conflict preservation, focus return, and hierarchy keyboard behavior;
- Product URL filters/pagination, empty states, Draft creation, normalized response reset, and dirty-navigation warning;
- Product/Variant edit, readiness, confirmation, Archived restrictions, and lifecycle conflict refresh;
- Inventory same-value success and stale conflict refetch/re-entry behavior;
- setting confirmation and exact price-unit behavior without rewriting canonical values;
- Image file prechecks, preview, accessible ordering, confirmation, immutable replacement identity, version conflicts, and File cleanup;
- single-flight pending controls, field/summary errors, live announcements, modal focus, mixed direction, narrow-width record layout, and 200% zoom semantics; and
- existing login/bootstrap/refresh/logout behavior remains passing.

Tests use user-observable roles, labels, text, focus, URL, and request/response effects rather than component snapshots or private state.

### Critical browser journey

One production-build Chromium journey uses the real Admin, API, isolated PostgreSQL test database, and isolated Product Image storage:

1. provision/sign in as the approved test Super Admin;
2. create a root and child Category;
3. create a named-mode Draft Product with initial Variant and canonical price/Inventory;
4. edit Product/Variant data and save an absolute Inventory update;
5. upload a valid Image and verify protected preview;
6. confirm readiness and activate the Product;
7. verify the protected Product list/detail normalized Active state; and
8. log out and verify protected catalog removal.

The journey also asserts one permission-denied presentation and one stale Inventory or Image conflict through focused integration coverage; it does not duplicate every Backend validation/race case already covered by the API suite. Teardown removes Admin, catalog, database, and storage fixtures even after failure.

## S3-T02 exact dependency proposal

No package is installed by this specification. S3-T02 implementation approval must explicitly authorize the following exact pins.

### Runtime dependencies for `@automotive-commerce/admin`

| Package | Exact version | Purpose and compatibility |
| --- | ---: | --- |
| `antd` | `6.6.2` | Accepted Admin design system. Its declared peers accept React/React DOM 18+, including installed 19.2.8. |
| `@ant-design/nextjs-registry` | `1.3.0` | App Router first-screen CSS-in-JS extraction/registry to avoid style flicker; peers accept Next 14+, Ant Design 5+, and installed React/Next versions. |
| `@ant-design/cssinjs` | `2.1.2` | Explicitly satisfies the registry peer instead of relying on Yarn Classic hoisting; peers accept installed React 19. |
| `react-hook-form` | `7.87.0` | Approved non-trivial form state/validation boundary; declared peer explicitly accepts React 19. |

Ant Design is wrapped by `AntdRegistry` at the App Router layout boundary and a narrow Client `ConfigProvider` with `direction="rtl"` and Persian locale. Pages remain Server Components unless existing browser-held authentication or feature interaction requires a Client boundary. React Hook Form `Controller` adapts controlled Ant Design inputs; successful authoritative responses reset form baselines.

### Development dependencies for `@automotive-commerce/admin`

| Package | Exact version | Purpose and compatibility |
| --- | ---: | --- |
| `@testing-library/dom` | `10.4.1` | Explicit peer for React Testing Library and semantic DOM queries. |
| `@testing-library/react` | `16.3.3` | React 19-compatible user-observable component rendering. |
| `@testing-library/user-event` | `14.6.7` | Realistic keyboard, pointer, upload, and focus interactions. |
| `jsdom` | `28.1.0` | DOM runtime compatible with the repository floor Node 20.19; latest 30.0.1 is deliberately rejected because it requires Node 22.22.2/24.15 or newer. |
| `@types/jsdom` | `28.0.3` | TypeScript declarations aligned to the selected JSDOM generation. |
| `@playwright/test` | `1.62.1` | Current Node 20+-compatible Chromium test runner for the one critical production-build journey. |
| `@axe-core/playwright` | `4.13.0` | Focused automated accessibility checks within critical browser pages; it uses Playwright’s provided `playwright-core`. |

The existing Node test runner remains the component/integration runner; Jest, Vitest, Cypress, Storybook, MSW, Zod, TanStack Query, Zustand, drag-and-drop packages, icon packages, date libraries, and a second form/design system are not required. Axios remains the HTTP client.

### Tooling and CI impact

- Add Admin scripts that keep component/integration tests separate from `test:e2e` and allow focused runs.
- Configure one Chromium Playwright project with `webServer` starting the Admin production build; initial harness validation may stub API responses, while S3-T10 owns the real API/PostgreSQL/storage journey.
- Install only Chromium (`playwright install chromium` locally; `playwright install --with-deps chromium` in Linux CI). Firefox/WebKit matrices are deferred because they multiply runtime without evidence of a Sprint 3-specific risk.
- Add JSDOM setup/cleanup for the existing Node test runner rather than replacing it.
- Extend CI timeout/cache behavior only if measured execution requires it. Browser binaries are generated environment state and remain untracked.
- Yarn Classic lockfile changes are expected only in the separately approved dependency task. No production dependency is added at repository root.

## Explicit deferrals

Non-Super-Admin Role composition and Role UI, catalog audit persistence/retention, mode conversion after Product creation, bulk catalog/Inventory/Image operations, adjustment history, drag-only ordering, crop/transform/CDN/object storage, dashboards, analytics, Storefront discovery, and all later commerce behavior remain outside Sprint 3.

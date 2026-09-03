# Frontend Standards

- Keep TypeScript strict and avoid `any` unless a documented boundary makes it unavoidable.
- Target WCAG 2.2 AA using semantic HTML, keyboard access, visible focus, correct labels, sufficient contrast, and ARIA only where native semantics cannot express behavior.
- Design mobile-first responsive experiences that remain usable across supported viewports, zoom, input modes, and content lengths.
- Use Persian (`fa-IR`) and RTL as the baseline for Storefront and Admin. Components, forms, tables, navigation, validation, and mixed-direction content must be designed and tested accordingly; conceptually use `<html lang="fa" dir="rtl">`.
- Reuse components when behavior or presentation truly repeats; follow each application's design system consistently without premature cross-app abstraction.
- Keep business rules and request orchestration out of presentation components. Centralize HTTP/auth behavior.
- Validate forms on the client for usability and on the backend for authority. Provide actionable errors and prevent accidental duplicate submissions.
- For future non-trivial Admin and Storefront forms, use React Hook Form by default with explicit client validation, accessible field associations, `aria-invalid`, announced error messages, and submission-state handling. A simpler native React/HTML form is allowed only when the task records why React Hook Form adds no meaningful value. This standard does not weaken Backend validation and does not by itself authorize adding or changing a dependency in a Workspace.
- Model loading, empty, error, success, retry, disabled, and unauthorized states predictably.
- Render external content safely; do not inject unsanitized HTML or construct unsafe URLs.
- Prefer Server Components and small client boundaries according to [frontend architecture](../architecture/frontend-architecture.md). Do not add global state, memoization, or effects without a concrete need.
- Optimize images with correct dimensions, formats, responsive sizing, useful alternative text, and restrained priority loading.
- Monitor bundle cost, data waterfalls, layout shifts, caching correctness, and Core Web Vitals.
- Storefront pages require intentional metadata, semantic headings, crawlable links/content, canonical decisions, and validated structured data where relevant.
- Trusted application SVG assets are allowed through an approved source/build-time approach; uploaded SVG is forbidden. See the [security baseline](../security/baseline.md) for the complete trust and upload policy.

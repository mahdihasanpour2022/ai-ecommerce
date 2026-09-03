# Security Baseline

**Status:** Accepted

This is the proportionate minimum for future implementation, not evidence that production controls already exist.

## Browser and transport protections

- Serve production traffic over HTTPS and enable HSTS at the appropriate production edge after deployment behavior is verified.
- Define a restrictive, tested Content Security Policy. Avoid unsafe inline/eval allowances unless narrowly justified.
- Send `X-Content-Type-Options: nosniff`, a suitable `Referrer-Policy`, and frame-embedding protection through CSP `frame-ancestors` and/or compatible headers.
- Use Secure production cookies with intentional HttpOnly, SameSite, path, and host-only scope according to [authentication architecture](authentication.md).
- Treat external content as untrusted and prevent XSS with framework-safe rendering and explicit sanitization only when rich HTML is an approved requirement.

## Application and operational protections

- Validate all external input, enforce authorization server-side, use parameterized ORM/database access, and return safe consistent errors.
- Protect authentication from brute force and abuse with approved throttling/monitoring appropriate to actual deployment scale; Redis is not assumed.
- Never store secrets in source control or emit passwords, authentication cookies/tokens, secret headers, or sensitive internals in logs.
- Review security-impacting dependency alerts and lockfile changes. Do not upgrade blindly or add a package without a concrete approved reason.
- Use structured security-relevant events and correlation identifiers without leaking credentials or unnecessary personal data.

## File and media safety

Trusted source-controlled SVG assets are allowed through an approved source/build-time path; untrusted SVG markup must not be injected. Product/media uploads permit only WebP, JPEG/JPG, and PNG. Product Images must be strictly smaller than 400 KiB (409,600 bytes). Backend validation must verify authorization, byte size, declared media type, actual content/signature, decodability, conservative decoded dimensions/pixel count, and a safe generated storage key. Do not rely on extension or trust the original filename. SVG uploads are forbidden. Storage and metadata changes require a recoverable staged or compensating lifecycle so failures do not silently create broken public metadata or untracked cleanup debt.

Advanced scanning, WAF/bot services, distributed rate limiting, and specialized security infrastructure are Deferred until risk or requirements justify them.

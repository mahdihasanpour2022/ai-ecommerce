# Customer Authentication Specification

**Status:** Implemented; final executable validation and owner usability review pending

This document records the observable Customer OTP authentication behavior currently implemented by the Storefront and Backend. Architectural mechanisms are canonical in [Authentication Architecture](../../security/authentication.md), and generated Swagger/OpenAPI remains the executable HTTP contract.

## Scope

The slice provides optional Customer authentication for an otherwise public Storefront:

- `/auth` requests an OTP for an Iranian mobile number.
- `/auth/verify` verifies or resends the six-digit OTP.
- `/auth/register` collects first and last name only after a new mobile is verified.
- Existing Customers authenticate immediately after valid OTP proof.
- Customer bootstrap, Refresh, current-session logout, CSRF, and server-authoritative flow recovery are included.

Passwords, profile/address management, social login, MFA, logout-all, and final UI-team visual design are out of scope.

## Inputs and flow

Persian and Arabic digits are normalized to ASCII. The current Storefront and Backend accept `09xxxxxxxxx`, `+989xxxxxxxxx`, and `00989xxxxxxxxx`, persisting only canonical `+989xxxxxxxxx`. OTP input is exactly six digits and may start with zero. First and last name are separately required, normalized to NFC with surrounding/repeated whitespace collapsed, and must contain 2–50 Unicode code points using letters/marks with supported internal spaces, apostrophes, hyphens, or Persian zero-width non-joiners.

The Backend is authoritative for every stage:

1. OTP request creates or rotates an opaque HttpOnly flow cookie and returns only masked mobile plus server timestamps.
2. A valid OTP atomically consumes the challenge. An active existing Customer receives a session; a new mobile receives only a 15-minute registration flow.
3. Registration resolves the verified mobile exclusively from the flow cookie, atomically creates one Customer, consumes the grant, and establishes the session. Separate valid grants for the same mobile are serialized; after the first creates the Customer, a later grant authenticates that active Customer without creating a duplicate.
4. `GET /flow` returns `MOBILE_REQUIRED`, `OTP_PENDING`, `REGISTRATION_REQUIRED`, or `AUTHENTICATED`; the route guard canonicalizes the visible auth route to that state.

The Storefront accepts a safe application-relative `returnTo` outside `/auth/**`; invalid, absolute, protocol-relative, backslash-containing, or auth-route values fall back to `/`. The Backend registration response itself exposes only `redirectTo: '/'`.

## Timing and abuse controls

| Control                             | Implemented value                                 |
| ----------------------------------- | ------------------------------------------------- |
| OTP and resend cooldown             | 120 seconds                                       |
| Failed attempts per challenge       | 5; the fifth failure terminates the challenge     |
| Registration flow                   | 15 minutes                                        |
| Accepted sends per mobile           | 3 per rolling 15 minutes; 10 per rolling 24 hours |
| Accepted sends per IP               | 20 per 15 minutes; 100 per 24 hours               |
| Failed verification attempts per IP | 30 per 15 minutes                                 |
| Access credential                   | 15 minutes                                        |
| Absolute Customer session           | 7 days                                            |

Mobile limits are durable and HMAC-keyed. Current IP limits are in-process and require a shared edge/distributed limiter before horizontal deployment. A provider timeout or ambiguous failure is not retried automatically and is never reported as successful delivery.

## HTTP contract

All routes are under `/api/v1/customer-auth`, use `Cache-Control: no-store`, and use the canonical `ApiResponse` envelope.

| Method and path     | Purpose and success payload                                                                                        |
| ------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `GET /flow`         | Return the authoritative browser stage and only its safe display/timing fields.                                    |
| `POST /otp/request` | Accept `{ mobile }`; return `OTP_PENDING`, masked mobile, `expiresAt`, and `resendAvailableAt`.                    |
| `POST /otp/verify`  | Accept `{ code }`; return `AUTHENTICATED` plus Customer snapshot or `REGISTRATION_REQUIRED`.                       |
| `POST /register`    | Accept `{ firstName, lastName }`; return authenticated Customer snapshot and `redirectTo: '/'`.                    |
| `POST /bootstrap`   | Validate/recover the Customer session and return Customer snapshot plus the session CSRF value.                    |
| `POST /refresh`     | Rotate or narrowly recover Refresh state; return a no-payload success envelope.                                    |
| `POST /logout`      | Revoke only the current Customer session, expire Customer cookies, and return a `200` no-payload success envelope. |

The Customer snapshot is exactly `{ id, mobile, firstName, lastName }`. Account existence is not disclosed by OTP request; branching occurs only after valid OTP proof. Generated Swagger documents request/response DTOs, cookie/CSRF requirements, relevant statuses, and safe errors under `Customer authentication`.

## Browser and session security

The browser calls only the same-origin Storefront `/api/v1/**` BFF. The BFF forwards only Customer cookies and approved headers, returns only Customer `Set-Cookie` values, and never forwards Admin credentials. Access and Refresh credentials, OTP challenge authority, and registration grant are never available to JavaScript, URLs, or Web Storage. Only the readable Customer CSRF cookie is copied into `X-CSRF-Token` for authenticated unsafe requests.

Customer Refresh rotation is atomic, absolute-expiry bounded, and supports narrow same-session recovery during the configured reuse grace. Suspicious reuse revokes only the affected Customer session family. Eligible client requests, including protected Favorite reads and mutations, share one Refresh within an execution context and replay at most once. Definitive session loss or logout clears Customer, Favorite, and personalized Product-detail query data; an identity change removes the previous Customer's data before accepting the next identity. Successful bootstrap, login, or Refresh invalidates personalized Product detail so `isFavorite` is refetched for the current Customer. Transport failure alone does not establish logout.

## Persistence and retention

Customer identity, OTP challenges, registration grants, sessions, Refresh history, durable mobile throttle rows, and per-session Refresh throttles are stored independently from Admin authentication. OTP plaintext is never persisted; Refresh persistence stores hashes plus only the bounded encrypted recovery envelope required for rotation recovery.

Deployment must schedule cleanup in this order and at these approved boundaries:

- registration grants: 24 hours after terminal state or expiry;
- unreferenced OTP challenges: 24 hours after terminal state or expiry;
- mobile throttle serialization rows: after 48 hours of inactivity;
- revoked/expired Customer sessions and cascading Refresh history: after 30 days;
- expired Refresh recovery-envelope fields: as soon as the grace window ends.

Customer records are retained; erasure/anonymization is a separate product decision.

## UI status

The three routes are intentionally minimal Persian RTL forms built with the existing shared primitives, React Hook Form, Zod, Tailwind utilities, and current light/dark tokens. They include persistent labels, linked inline errors, busy states, keyboard-compatible controls, and mobile-first layout. A guest Favorite action opens an accessible light/dark RTL modal instead of issuing a mutation; its login action encodes the current path, search, and hash into `/auth?returnTo=...`. Both Auth entry and final navigation use the shared same-origin `safeReturnDestination` policy, reject Auth destinations and unsafe URL forms, and complete navigation with `replace`. Final visual design remains explicitly deferred until UI-team direction is supplied and approved.

## Deployment operations still required

- Inject independent production authentication/OTP secrets through the approved secret mechanism; never commit them.
- Configure and verify the production Ghasedak API key, approved OTP template, source-IP policy, and one redacted delivery check.
- Configure safe structured monitoring/alerts for delivery failures, throttling, invalid flow/CSRF events, session reuse, and cleanup failures without mobile, OTP, token, cookie, grant, or provider-key data.
- Schedule and observe the retention cleanup described above.
- Replace in-process OTP/verification/Refresh IP buckets with an approved shared edge or distributed limiter before horizontal deployment.
- Complete the focused API/Storefront gates, browser scenarios, leakage inspection of runtime network/storage/cookies and built assets, and owner usability review.

## Known final-validation differences

Static review found these runtime differences from the original frozen decision package:

- mobile input accepts three formats rather than also accepting bare `9xxxxxxxxx`/`989xxxxxxxxx` and embedded ASCII spaces/hyphens;
- initial flow is `{ stage: 'MOBILE_REQUIRED' }`, rather than the approved `MOBILE_ENTRY` shape with explicit null timing/display fields;
- flow/bootstrap success codes are `CUSTOMER_FLOW_FETCHED` and `CUSTOMER_AUTH_BOOTSTRAPPED`, rather than `FLOW_STATE_RETRIEVED` and `CUSTOMER_SESSION_BOOTSTRAPPED`;
- invalid names return `CUSTOMER_NAME_INVALID`, rather than `VALIDATION_FAILED` with the approved structured field details;
- a concurrent later registration grant authenticates the Customer created by the winning grant, rather than returning `REGISTRATION_CONFLICT` and requiring a fresh OTP;
- logout returns the repository-standard `200` envelope rather than `204`;
- the Storefront supports sanitized internal `returnTo` paths rather than forcing every success to `/`.

This specification records current behavior without changing it. The concurrent-registration behavior is security/product-sensitive; owner direction is required before Task 013 can reconcile these observable contracts and reach its exit criteria.

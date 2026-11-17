# Storefront Customer Authentication — Execution Tasks

**Status:** Proposed — each implementation task requires explicit owner approval before code changes.  
**Scope:** Customer registration and login for Storefront only, including the necessary Backend and Storefront BFF support.  
**Explicitly out of scope:** Customer profile completion/editing, addresses, Admin customer-management UI/API, checkout, social login, password login, account recovery, and final UI-team visual design/polish.

## Fixed direction for this task list

- The public flow must not reveal whether a mobile number already has an account before that number is verified.
- Both existing and new customers first receive and verify an OTP. After successful verification, an existing customer is authenticated; a new customer is sent to registration completion.
- Initial registration stores only normalized mobile, first name, and last name. Future optional profile fields are not part of this plan.
- OTP generation, verification, persistence, throttling, Ghasedak communication, and session issuance belong to the NestJS Backend.
- The browser calls only the same-origin Storefront BFF. The Ghasedak API key and authentication credentials never enter browser JavaScript.
- Customer authentication must remain independent from Admin authentication: separate routes, cookies, session records, CSRF boundary, DTOs, and authorization context.
- The first implementation is intentionally the simplest usable responsive form. Final composition, illustration, animation, branding, and pixel-level polish wait for the future UI-team design and must not be guessed now.
- Auth screens must reuse the Storefront shared UI primitives where semantically applicable, including `UiHeading`, `UiP`, `UiSpan`, `UiInputTextField`, `UiButton`, and `UiLink`; do not create feature-local duplicates of an existing shared primitive.
- Every auth form must use the already-installed React Hook Form, Zod 4 schema, and official Zod resolver. Backend validation remains authoritative.
- The URL route is the UI step source of truth. A short-lived server-owned HttpOnly flow cookie binds the browser to its OTP challenge or registration grant; a client boolean, Zustand persistence, URL token, or Web Storage must not decide or preserve the step.

## Proposed public flow

```text
/auth
  -> request OTP with mobile -> Backend sets short-lived OTP-flow cookie
/auth/verify
  -> validate OTP-flow cookie and enter code
  -> existing customer: create Customer session, clear flow cookie -> safe Storefront destination
  -> new customer: rotate flow cookie to one-time registration state -> /auth/register
/auth/register
  -> validate registration-flow cookie and submit first name + last name
  -> create Customer + session, clear flow cookie -> safe Storefront destination
```

On reload or direct navigation, each route asks the Backend for the current no-store flow stage. Missing, expired, or mismatched state redirects to the canonical safe route (`/auth`, `/auth/verify`, or `/auth/register`) rather than rendering the wrong form.

---

## Task 001 — Approve product behavior and stable contracts

**Priority:** P0 — no implementation starts before this task is approved.  
**Goal:** Freeze the observable flow and security-sensitive defaults so Backend and Storefront implement one contract.
**Task status:** Approved by owner on 2026-11-17; complete.

<!-- این بخش قرارداد قابل‌مشاهده و مقادیر امنیتی مشترک Backend و Storefront را یک‌جا تثبیت می‌کند. -->
### Decision package

#### Product and navigation decisions

| Topic | Proposed stable decision |
| --- | --- |
| UI steps | Three canonical routes: `/auth`, `/auth/verify`, and `/auth/register`. The route selects the form; server flow state authorizes it. |
| Missing/expired flow | Redirect to `/auth`. |
| Valid OTP flow opened on another auth route | Canonicalize to `/auth/verify`. |
| Valid registration flow opened on another auth route | Canonicalize to `/auth/register`. |
| Existing authenticated Customer opening an auth route | Redirect to `/`; do not start another flow. |
| Successful authentication destination | `/` only for the initial slice. No client `returnTo` is accepted yet, so no open-redirect surface is introduced. |
| Initial registration fields | Verified mobile, required first name, and required last name; no password or optional profile fields. |
| Multiple devices | Each browser/device has an independent Customer session. Logging in on one device does not revoke another device. |
| Same-browser reauthentication | A valid authenticated Customer is redirected away from auth routes. A stale/invalid session may start a new flow; successful authentication replaces browser cookies without reviving the stale session. |
| Back/reload behavior | The no-store flow endpoint is authoritative. A consumed stage cannot be restored by browser history or client state. |
| Final visual design | Deferred until the UI-team reference arrives; the first slice is a minimal usable form built from existing shared primitives. |

#### Input decisions

- Convert Persian (`۰-۹`) and Arabic (`٠-٩`) digits to ASCII before validation.
- For mobile input, trim outer whitespace and remove only ASCII spaces and hyphens. Accept exactly `09xxxxxxxxx`, `9xxxxxxxxx`, `+989xxxxxxxxx`, `00989xxxxxxxxx`, or `989xxxxxxxxx`; persist only `+989xxxxxxxxx`. The SMS adapter alone converts it to `09xxxxxxxxx` when required.
- OTP is a six-character digit string and may begin with zero. Normalize Persian/Arabic digits before validating exactly six ASCII digits.
- First and last name are independently required, trimmed, and 2–50 Unicode characters. Letters, a single internal space, hyphen, apostrophe, and Persian zero-width non-joiner are accepted; digits, emoji, leading/trailing separators, and repeated separators are rejected.

#### OTP, flow, and throttle decisions

| Control | Exact value |
| --- | --- |
| OTP generation | Cryptographically secure random six-digit value generated only by Backend |
| OTP lifetime | 120 seconds |
| Resend availability | 120 seconds after the accepted send; resend rotates the challenge and invalidates the prior code |
| Verification attempts | 5 failed attempts per challenge; the challenge becomes terminal after the fifth failure |
| Registration grant lifetime | 15 minutes after successful verification |
| Send limit per mobile | 3 accepted sends per 15 minutes and 10 per rolling 24 hours |
| Send limit per IP | 20 accepted sends per 15 minutes and 100 per rolling 24 hours |
| Failed verification limit per IP | 30 failed attempts per 15 minutes, in addition to the per-challenge limit |
| Throttle response | HTTP `429`, stable `AUTH_RATE_LIMITED` or `OTP_RESEND_NOT_READY`, plus an accurate `Retry-After` header |
| Provider retry | No automatic SMS resend after an ambiguous provider timeout/failure |

#### Cookie decisions

All cookies are host-only (`Domain` omitted). `Secure` is always enabled in production and disabled only for approved local HTTP development.

| Cookie | Purpose | HttpOnly | SameSite | Path | Lifetime |
| --- | --- | --- | --- | --- | --- |
| `storefront_customer_auth_flow` | Opaque OTP/registration flow reference | Yes | `Strict` | `/api/v1/customer-auth` | 120 seconds in OTP stage; rotated to 15 minutes in registration stage |
| `storefront_customer_access` | Short-lived Customer Access JWT | Yes | `Lax` | `/` | 15 minutes |
| `storefront_customer_refresh` | Opaque Customer Refresh credential | Yes | `Lax` | `/` | 7-day absolute session expiry |
| `storefront_customer_csrf` | Session-bound CSRF value copied to the request header | No | `Strict` | `/` | Remaining absolute Customer-session lifetime |

The flow cookie is cleared after existing-Customer authentication, completed registration, or terminal flow failure. Access, Refresh, CSRF, and flow cookie names are independent from every Admin cookie.

#### Common response rules

- Browser endpoints use the same-origin Storefront `/api/v1/customer-auth/**` BFF path, which forwards to the matching Backend namespace.
- Except for successful `204` logout, every response uses the existing canonical `ApiResponse` envelope. Successful object payloads are placed in `singleResult`; `result` and `details` are `null`, and `count` remains `0`. Errors have `count: 0`, `result: null`, and `singleResult: null`.
- Every auth/flow response sends `Cache-Control: no-store`. Unsafe requests require the approved exact-Origin/Fetch-Metadata boundary; session-authenticated unsafe requests additionally require the Customer CSRF header.
- `maskedMobile` uses the normalized local presentation `09*****1234` and is returned only for the browser's own valid flow.
- Timestamps are UTC ISO-8601 strings. Backend time and state are authoritative; client countdowns are display-only.

#### Request/response contract matrix

| Endpoint | Request | Successful response (`singleResult`) | Cookie transition |
| --- | --- | --- | --- |
| `GET /api/v1/customer-auth/flow` | No body | `{ stage: 'MOBILE_ENTRY', maskedMobile: null, expiresAt: null, resendAvailableAt: null }`, or the matching `OTP_PENDING`/`REGISTRATION_PENDING` state for a valid browser flow | No rotation; clears a terminal/invalid flow cookie |
| `POST /api/v1/customer-auth/otp/request` | `{ mobile: string }` | `{ stage: 'OTP_PENDING', maskedMobile, expiresAt, resendAvailableAt }` with code `OTP_REQUESTED` and the same shape/timing path for existing and new Customers | Sets or rotates the OTP-stage flow cookie |
| `POST /api/v1/customer-auth/otp/verify` | `{ code: string }`; challenge comes only from the flow cookie | Existing Customer: `{ nextStep: 'AUTHENTICATED', customer }`; new Customer: `{ nextStep: 'REGISTRATION_REQUIRED' }`. Both use code `OTP_VERIFIED`. | Existing: clears flow and sets session cookies. New: rotates flow to registration stage. |
| `POST /api/v1/customer-auth/register` | `{ firstName: string, lastName: string }`; mobile/grant come only from the flow cookie | `{ nextStep: 'AUTHENTICATED', customer }` with code `CUSTOMER_REGISTERED` | Atomically consumes/clears flow and sets session cookies |
| `POST /api/v1/customer-auth/bootstrap` | No body; Refresh cookie required | `{ customer }` with code `CUSTOMER_SESSION_BOOTSTRAPPED` | Restores CSRF and rotates/reissues Customer credentials according to the accepted session policy |
| `POST /api/v1/customer-auth/refresh` | No body; Refresh cookie and `X-CSRF-Token` required | `{ customer }` with code `CUSTOMER_SESSION_REFRESHED` | Atomically rotates Refresh and reissues Access/CSRF as required |
| `POST /api/v1/customer-auth/logout` | No body; known Refresh family and `X-CSRF-Token` required | HTTP `204`, no envelope/body | Revokes current Customer session and expires Access, Refresh, and CSRF cookies |

`customer` is exactly `{ id: string, mobile: string, firstName: string, lastName: string }`. A separate `/me` endpoint is not included because bootstrap already returns the minimum authenticated snapshot.

#### Stable success messages

| Code | Persian message |
| --- | --- |
| `FLOW_STATE_RETRIEVED` | `مرحله ورود با موفقیت دریافت شد.` |
| `OTP_REQUESTED` | `کد تأیید ارسال شد.` |
| `OTP_VERIFIED` | `شماره موبایل با موفقیت تأیید شد.` |
| `CUSTOMER_REGISTERED` | `ثبت‌نام با موفقیت انجام شد.` |
| `CUSTOMER_SESSION_BOOTSTRAPPED` | `نشست کاربر با موفقیت بازیابی شد.` |
| `CUSTOMER_SESSION_REFRESHED` | `نشست کاربر با موفقیت تمدید شد.` |

#### Stable error matrix

| HTTP | Code | Persian message | Applies to |
| --- | --- | --- | --- |
| `401` | `AUTH_FLOW_INVALID` | `فرایند ورود معتبر نیست. لطفاً دوباره شماره موبایل را وارد کنید.` | Missing, tampered, consumed, or terminal flow authority |
| `401` | `AUTHENTICATION_REQUIRED` | `برای ادامه باید وارد حساب کاربری شوید.` | Missing/definitively invalid Customer session |
| `401` | `ACCESS_TOKEN_EXPIRED` | `نشست شما نیاز به تمدید دارد.` | Eligible ordinary request; may enter the single-flight Refresh path |
| `401` | `INVALID_ACCESS_TOKEN` | `نشست شما معتبر نیست. لطفاً دوباره وارد شوید.` | Invalid non-refreshable Access credential |
| `401` | `REFRESH_TOKEN_INVALID` | `نشست شما معتبر نیست. لطفاً دوباره وارد شوید.` | Invalid Refresh credential |
| `401` | `REFRESH_TOKEN_EXPIRED` | `نشست شما منقضی شده است. لطفاً دوباره وارد شوید.` | Expired Refresh/session |
| `401` | `REFRESH_TOKEN_REUSED` | `نشست شما پایان یافته است. لطفاً دوباره وارد شوید.` | Suspicious Refresh reuse; no technical detail exposed |
| `403` | `ORIGIN_NOT_ALLOWED` | `درخواست معتبر نیست.` | Invalid Origin/Referer/Fetch Metadata |
| `403` | `CSRF_VALIDATION_FAILED` | `اعتبار درخواست تأیید نشد. لطفاً دوباره تلاش کنید.` | Missing/mismatched Customer CSRF evidence |
| `403` | `CUSTOMER_ACCOUNT_DISABLED` | `امکان ورود به این حساب وجود ندارد.` | Disabled existing Customer, only after valid OTP proof or authenticated session |
| `409` | `REGISTRATION_CONFLICT` | `وضعیت ثبت‌نام تغییر کرده است. لطفاً فرایند ورود را دوباره انجام دهید.` | Concurrent Customer creation or consumed registration state |
| `410` | `OTP_EXPIRED` | `کد تأیید منقضی شده است. کد جدیدی دریافت کنید.` | Expired OTP challenge |
| `422` | `MOBILE_INVALID` | `شماره موبایل واردشده معتبر نیست.` | Invalid mobile input |
| `422` | `OTP_INVALID` | `کد تأیید واردشده صحیح نیست.` | Incorrect/malformed OTP while attempts remain |
| `422` | `VALIDATION_FAILED` | `اطلاعات واردشده معتبر نیست.` | Invalid first/last name; field details remain safe and structured |
| `429` | `OTP_RESEND_NOT_READY` | `برای ارسال مجدد کد کمی صبر کنید.` | Resend before `resendAvailableAt` |
| `429` | `OTP_ATTEMPTS_EXCEEDED` | `تعداد تلاش‌ها بیش از حد مجاز است. کد جدیدی دریافت کنید.` | Fifth failed verification terminates the challenge |
| `429` | `AUTH_RATE_LIMITED` | `تعداد درخواست‌ها بیش از حد مجاز است. لطفاً بعداً دوباره تلاش کنید.` | Mobile/IP send or verification throttle |
| `503` | `OTP_SEND_UNAVAILABLE` | `ارسال کد تأیید ممکن نشد. لطفاً کمی بعد دوباره تلاش کنید.` | Safe provider rejection, timeout, or unavailable service |

Network failures with no Backend response use the Storefront's centralized transport message: `ارتباط با سرور برقرار نشد. لطفاً دوباره تلاش کنید.` They do not prove invalid flow/session state and do not clear credentials automatically.

#### Explicit edge-case decisions

- A repeated OTP request before `resendAvailableAt` returns `OTP_RESEND_NOT_READY`; it neither sends nor rotates a code.
- An accepted resend creates the only valid current code and timestamps. Any earlier code fails.
- Correct verification atomically consumes the challenge before issuing a Customer session or registration grant; concurrent verification can have only one winner.
- Existing and new mobiles receive the same OTP-request status, success code, message, JSON shape, cookie shape, and materially equivalent work before delivery dispatch.
- After valid OTP proof, returning `AUTHENTICATED` versus `REGISTRATION_REQUIRED` is allowed because the requester has demonstrated control of the mobile.
- Concurrent registration conflict never silently signs in a newly discovered Customer; it clears the registration flow and requires a fresh OTP login.
- Registration submission never accepts mobile, challenge ID, registration grant, destination, cookie settings, or account state from the request body.
- Logout affects only the current browser/device session. Logout-all remains out of scope.

### Execution

1. Review and approve the three-route/canonical-redirect behavior in the decision package.
2. Review and approve the exact mobile, OTP, name, resend, attempt, and throttle values.
3. Review and approve minimal registration fields and `/` as the only initial success destination.
4. Review and approve Customer cookie names, lifetimes, paths, local/production flags, and isolation from Admin cookies.
5. Review and approve the endpoint DTOs, success codes/messages, stable error matrix, and edge-case behavior.
6. Record requested changes in this decision package; do not begin Task 002 until the final package receives explicit owner approval.

### API impact

Approve the dedicated `/api/v1/customer-auth/**` namespace; do not reuse the Admin `/api/v1/auth/**` contracts.

### Security and edge cases

- OTP-request responses remain enumeration-safe for existing and new mobiles.
- Account existence is disclosed only after proof of possession through a valid OTP.
- Repeated submit, refresh, Back navigation, expired challenge, concurrent registration, and multiple-device login behavior must be decided.
- Return destinations must be application-relative and allowlisted.
- URL, flow bootstrap, and cookie stage mismatches must redirect to the one canonical valid step without leaking OTP or registration authority.

### Tests and completion evidence

- [x] A complete request/response/error matrix exists for every proposed endpoint and is ready for owner review.
- [x] Every product/security setting has an explicit proposed value; no placeholder remains.
- [x] Owner approval was explicitly recorded on 2026-11-17.

### Exit criteria

Owner explicitly approves the contract matrix and defaults. Record any changed decision in this file or the canonical feature specification before Task 002.

---

## Task 002 — Preflight infrastructure and provider configuration

**Priority:** P0  
**Depends on:** Task 001  
**Goal:** Prove that required local infrastructure and Ghasedak configuration are available before schema or feature implementation.  
**Task status:** Complete as an external-prerequisite preflight on 2026-11-17; environment injection and the single sandbox delivery are explicitly deferred to the Provider implementation task.

<!-- این بخش فقط شواهد preflight و ورودی‌های خارجی لازم را ثبت می‌کند و مجوز شروع پیاده‌سازی نیست. -->
### Preflight record — 2026-11-17

| Gate | Evidence | Status |
| --- | --- | --- |
| Task 001 approval | Owner explicitly approved the decision package on 2026-11-17. | Passed |
| Node.js | Host reports `v24.19.0`, compatible with the API engine range. | Passed |
| Yarn | Host reports accepted Yarn Classic `1.22.22`. | Passed |
| NestJS CLI | Local binary exists; `apps/api/package.json` pins `@nestjs/cli` `12.0.0`. | Passed |
| Prisma CLI/client | Local binaries exist; `apps/api/package.json` pins Prisma and `@prisma/client` `7.10.0`. | Passed |
| Docker Compose definition | `yarn db:config` completed successfully for `compose.yaml`. | Passed |
| PostgreSQL dev/test connectivity | PostgreSQL container became healthy; `yarn db:verify` reported `e_commerce_dev` and `e_commerce_test` as reachable and isolated. | Passed |
| Ghasedak repository configuration | No `GHASEDAK`, `SendOtpSMS`, or `OtpSender` reference exists in API/Storefront source or safe environment examples. | Not configured |
| Ghasedak process secrets | The unsafe Storefront key file was removed. Owner confirmed an API key is available and will inject it only when the Backend Provider environment contract exists; no secret value was read, stored, or logged. | Passed |
| Ghasedak template/account contract | Owner confirmed the temporary brand `قاصدک`; template name `Ghasedak`, exact text, and `%Code%` now match that brand. | Passed |
| Non-production sandbox recipient | Owner supplied a test recipient; only the masked value `0921***1700` is retained as evidence. | Passed |

### Supplied Ghasedak template evidence

- Template name: `Ghasedak`
- Confirmed temporary Storefront brand: `قاصدک`
- Parameter spelling: `%Code%` (matches the planned provider input name `Code`)
- Supplied text:

  ```text
  به سامانه پیام کوتاه قاصدک خوش آمدید کد تایید شما %Code% می باشد
  لغو11
  ```

- Owner confirmed that `قاصدک` is the accepted temporary brand, so no template-text correction is required for this slice.

### Provider test decision

- Automated unit/integration tests will use an injected fake SMS adapter and must never call Ghasedak or send a real SMS.
- Exactly one manual sandbox delivery check is required during the Provider implementation task, after the Backend environment contract exists and the owner injects the key.
- Manual evidence must contain only the template name, redacted receptor/reference, HTTP/provider status, and safe response fields. API key, OTP value, full mobile, and secret headers must never be returned in chat, committed, or logged.

### Deferred implementation gate

1. The Provider implementation task must define and validate `GHASEDAK_API_KEY` and `GHASEDAK_OTP_TEMPLATE_NAME` in the Backend environment contract and add only safe placeholders to `apps/api/.env.example`.
2. The owner will inject the existing key at that gate without pasting it into chat or committing it.
3. The Provider task must perform exactly one manual sandbox delivery to the already confirmed masked recipient and retain only redacted response evidence.

### Execution

1. Confirm the approved disposable PostgreSQL development/test environment is usable.
2. Confirm the accepted Yarn, Node.js, Prisma, and NestJS commands are available without installing or upgrading dependencies.
3. Create and approve the Ghasedak template containing the brand name and `%Code%` input.
4. Obtain a non-production Ghasedak API key through the approved secret mechanism; never place it in source control or a `NEXT_PUBLIC_*` variable.
5. Confirm the exact `SendOtpSMS` request/response contract against the active Ghasedak account and template.
6. Decide whether automated tests use a fake SMS adapter (required) and whether one explicit manual sandbox delivery check is available.

### Affected configuration

- `apps/api` environment schema and safe `.env.example` placeholders.
- No secret is added to `apps/storefront`.

### Tests and completion evidence

- [x] Database connectivity and dev/test isolation are proven with the project-approved disposable environment.
- [x] Template name `Ghasedak`, exact text, temporary brand `قاصدک`, and `%Code%` parameter spelling are confirmed.
- [x] API-key availability is confirmed without exposing its value; injection waits for the Backend Provider environment contract.
- [x] Owner explicitly approved moving the redacted live-provider response gate to the Provider implementation task, where the adapter and environment validation exist.
- [x] Fake SMS adapter is mandatory for automated tests; one later manual sandbox delivery is the only approved real-send check.
- [x] A sandbox recipient is available; only `0921***1700` is recorded.

### Exit criteria

All external prerequisites are available: isolated dev/test PostgreSQL, required CLIs, approved template/parameter, API-key availability, and a sandbox recipient. Environment injection, provider code, and the one live delivery remain explicitly outside this preflight and must be completed in the Provider implementation task.

---

## Task 003 — Design and approve Customer authentication persistence

**Priority:** P0  
**Depends on:** Tasks 001–002  
**Goal:** Add the minimum independent persistence boundary required for OTP authentication and secure Customer sessions.
**Task status:** Complete on 2026-11-17; schema, additive migration, generated Prisma artifacts, and all 17 targeted schema/persistence assertions passed against the disposable test database.

<!-- این بخش مرز مستقل داده‌های مشتری، قیود امنیتی و اثر migration را پیش از هر تغییر schema تثبیت می‌کند. -->
### Exact proposed Prisma boundary

```prisma
enum CustomerOtpDeliveryStatus {
  PENDING
  ACCEPTED
  FAILED
  UNKNOWN

  @@map("customer_otp_delivery_status")
}

model Customer {
  id          String                @id(map: "customers_pkey") @default(uuid()) @db.Uuid
  mobile      String                @unique(map: "customers_mobile_key") @db.VarChar(13)
  firstName   String                @map("first_name") @db.VarChar(50)
  lastName    String                @map("last_name") @db.VarChar(50)
  disabledAt  DateTime?             @map("disabled_at") @db.Timestamptz(3)
  lastLoginAt DateTime?             @map("last_login_at") @db.Timestamptz(3)
  createdAt   DateTime              @default(now()) @map("created_at") @db.Timestamptz(3)
  updatedAt   DateTime              @updatedAt @map("updated_at") @db.Timestamptz(3)
  sessions    CustomerAuthSession[]

  @@map("customers")
}

model CustomerOtpChallenge {
  id                   String                    @id(map: "customer_otp_challenges_pkey") @default(uuid()) @db.Uuid
  flowTokenHash        Bytes                     @unique(map: "customer_otp_challenges_flow_token_hash_key") @map("flow_token_hash") @db.ByteA
  mobile               String                    @db.VarChar(13)
  otpDigest            Bytes                     @map("otp_digest") @db.ByteA
  clientReferenceId    String                    @unique(map: "customer_otp_challenges_client_reference_id_key") @map("client_reference_id") @db.Uuid
  deliveryStatus       CustomerOtpDeliveryStatus @default(PENDING) @map("delivery_status")
  expiresAt            DateTime                  @map("expires_at") @db.Timestamptz(3)
  resendAvailableAt    DateTime                  @map("resend_available_at") @db.Timestamptz(3)
  failedAttemptCount   Int                       @default(0) @map("failed_attempt_count")
  verifiedAt           DateTime?                 @map("verified_at") @db.Timestamptz(3)
  invalidatedAt        DateTime?                 @map("invalidated_at") @db.Timestamptz(3)
  createdAt            DateTime                  @default(now()) @map("created_at") @db.Timestamptz(3)
  updatedAt            DateTime                  @updatedAt @map("updated_at") @db.Timestamptz(3)
  registrationGrant    CustomerRegistrationGrant?

  @@index([mobile, createdAt], map: "customer_otp_challenges_mobile_created_at_idx")
  @@index([expiresAt], map: "customer_otp_challenges_expires_at_idx")
  @@map("customer_otp_challenges")
}

model CustomerRegistrationGrant {
  id             String               @id(map: "customer_registration_grants_pkey") @default(uuid()) @db.Uuid
  challengeId    String               @unique(map: "customer_registration_grants_challenge_id_key") @map("challenge_id") @db.Uuid
  flowTokenHash  Bytes                @unique(map: "customer_registration_grants_flow_token_hash_key") @map("flow_token_hash") @db.ByteA
  expiresAt      DateTime             @map("expires_at") @db.Timestamptz(3)
  consumedAt     DateTime?            @map("consumed_at") @db.Timestamptz(3)
  invalidatedAt  DateTime?            @map("invalidated_at") @db.Timestamptz(3)
  createdAt      DateTime             @default(now()) @map("created_at") @db.Timestamptz(3)
  updatedAt      DateTime             @updatedAt @map("updated_at") @db.Timestamptz(3)
  challenge      CustomerOtpChallenge @relation(fields: [challengeId], references: [id], onDelete: Restrict, onUpdate: NoAction, map: "customer_registration_grants_challenge_id_fkey")

  @@index([expiresAt], map: "customer_registration_grants_expires_at_idx")
  @@map("customer_registration_grants")
}

model CustomerAuthSession {
  id              String                              @id(map: "customer_auth_sessions_pkey") @default(uuid()) @db.Uuid
  customerId      String                              @map("customer_id") @db.Uuid
  csrfTokenHash   Bytes                               @map("csrf_token_hash") @db.ByteA
  expiresAt       DateTime                            @map("expires_at") @db.Timestamptz(3)
  revokedAt       DateTime?                           @map("revoked_at") @db.Timestamptz(3)
  lastUsedAt      DateTime                            @default(now()) @map("last_used_at") @db.Timestamptz(3)
  createdAt       DateTime                            @default(now()) @map("created_at") @db.Timestamptz(3)
  updatedAt       DateTime                            @updatedAt @map("updated_at") @db.Timestamptz(3)
  customer        Customer                            @relation(fields: [customerId], references: [id], onDelete: Restrict, onUpdate: NoAction, map: "customer_auth_sessions_customer_id_fkey")
  refreshTokens   CustomerRefreshToken[]
  refreshThrottle CustomerAuthSessionRefreshThrottle?

  @@index([customerId, revokedAt, expiresAt], map: "customer_auth_sessions_customer_revoked_expires_idx")
  @@index([expiresAt], map: "customer_auth_sessions_expires_at_idx")
  @@map("customer_auth_sessions")
}

model CustomerRefreshToken {
  id                 String                    @id(map: "customer_refresh_tokens_pkey") @default(uuid()) @db.Uuid
  sessionId          String                    @map("session_id") @db.Uuid
  tokenHash          Bytes                     @unique(map: "customer_refresh_tokens_token_hash_key") @map("token_hash") @db.ByteA
  expiresAt          DateTime                  @map("expires_at") @db.Timestamptz(3)
  rotatedAt          DateTime?                 @map("rotated_at") @db.Timestamptz(3)
  revokedAt          DateTime?                 @map("revoked_at") @db.Timestamptz(3)
  replacedByTokenId  String?                   @map("replaced_by_token_id") @db.Uuid
  recoveryCiphertext Bytes?                    @map("recovery_ciphertext") @db.ByteA
  recoveryNonce      Bytes?                    @map("recovery_nonce") @db.ByteA
  recoveryAuthTag    Bytes?                    @map("recovery_auth_tag") @db.ByteA
  recoveryKeyId      String?                   @map("recovery_key_id") @db.VarChar(128)
  recoveryExpiresAt  DateTime?                 @map("recovery_expires_at") @db.Timestamptz(3)
  createdAt          DateTime                  @default(now()) @map("created_at") @db.Timestamptz(3)
  session            CustomerAuthSession       @relation(fields: [sessionId], references: [id], onDelete: Cascade, onUpdate: NoAction, map: "customer_refresh_tokens_session_id_fkey")
  replacement        CustomerRefreshToken?     @relation("CustomerRefreshReplacement", fields: [replacedByTokenId, sessionId], references: [id, sessionId], onDelete: NoAction, onUpdate: NoAction, map: "customer_refresh_tokens_replacement_fkey")
  replacedTokens     CustomerRefreshToken[]    @relation("CustomerRefreshReplacement")

  @@unique([id, sessionId], map: "customer_refresh_tokens_id_session_id_key")
  @@unique([replacedByTokenId, sessionId], map: "customer_refresh_tokens_replacement_session_key")
  @@index([sessionId, createdAt], map: "customer_refresh_tokens_session_created_at_idx")
  @@index([expiresAt], map: "customer_refresh_tokens_expires_at_idx")
  @@index([recoveryExpiresAt], map: "customer_refresh_tokens_recovery_expires_at_idx")
  @@map("customer_refresh_tokens")
}

model CustomerOtpMobileThrottle {
  mobileKey Bytes    @id(map: "customer_otp_mobile_throttles_pkey") @map("mobile_key") @db.ByteA
  updatedAt DateTime @default(now()) @updatedAt @map("updated_at") @db.Timestamptz(3)

  @@index([updatedAt], map: "customer_otp_mobile_throttles_updated_at_idx")
  @@map("customer_otp_mobile_throttles")
}

model CustomerAuthSessionRefreshThrottle {
  sessionId       String              @id(map: "customer_auth_session_refresh_throttles_pkey") @map("session_id") @db.Uuid
  windowStartedAt DateTime?           @map("window_started_at") @db.Timestamptz(3)
  attemptCount    Int                 @default(0) @map("attempt_count")
  updatedAt       DateTime            @default(now()) @updatedAt @map("updated_at") @db.Timestamptz(3)
  session         CustomerAuthSession @relation(fields: [sessionId], references: [id], onDelete: Cascade, onUpdate: NoAction, map: "customer_auth_session_refresh_throttles_session_id_fkey")

  @@map("customer_auth_session_refresh_throttles")
}
```

`CustomerOtpMobileThrottle` is a durable HMAC-keyed serialization row, not a copy of the mobile. OTP-request transactions lock this row, then count non-`FAILED` challenges in the preceding 15-minute and 24-hour windows. This enforces the approved true rolling limits without duplicating mutable counters. Current single-instance IP limits remain bounded in process; a shared IP limiter is required before horizontal deployment.

### Required reviewed-SQL constraints and indexes

The additive migration must include the following PostgreSQL-native invariants that Prisma cannot fully express:

- `customers_mobile_canonical_check`: mobile matches `^\+989[0-9]{9}$`; `customers_first_name_check` and `customers_last_name_check`: trimmed 2–50 characters with no control characters; timestamp checks prevent disable/login/update times before creation.
- `customer_otp_challenges_flow_token_hash_length_check` and `customer_otp_challenges_otp_digest_length_check`: exactly 32 bytes; mobile canonical check; attempt count between 0 and 5; expiry/resend after creation; verified/invalidated timestamps within valid order; verified and invalidated states are mutually exclusive.
- `customer_otp_challenges_delivery_state_check`: `FAILED` requires invalidation, while a verified challenge requires `ACCEPTED` or `UNKNOWN`; an ambiguous `UNKNOWN` delivery remains verifiable but is counted against send limits.
- Partial unique index `customer_otp_challenges_one_open_per_mobile` on `mobile` where both terminal timestamps are null. Expired rows are explicitly invalidated while holding the mobile throttle lock before a replacement is inserted.
- Registration-grant flow hash is exactly 32 bytes; expiry is after creation; consumed and invalidated states are mutually exclusive and cannot precede creation.
- Customer session CSRF hash and Customer Refresh-token hash are exactly 32 bytes. Session/Refresh expiry, revocation, rotation, replacement, recovery-envelope, nonce/tag, and same-session replacement constraints mirror the accepted Admin invariants with Customer-specific object names.
- Partial unique index `customer_refresh_tokens_one_current_per_session` permits only one unrotated/unrevoked Refresh token per Customer session.
- `customer_otp_mobile_throttles_mobile_key_length_check` requires a 32-byte HMAC key. Refresh-throttle attempts are non-negative and its optional window cannot start after `updated_at`.

### Relations and deletion behavior

- Customer → Customer session is `RESTRICT`; this task introduces no Customer hard-delete workflow.
- Customer session → Refresh history and refresh-throttle row is `CASCADE`, matching current-session lifecycle ownership.
- OTP challenge → registration grant is `RESTRICT`; cleanup cannot remove the verified challenge while its grant remains.
- Challenges intentionally have no Customer foreign key because account existence is unknown before verification and the same enumeration-safe path serves both states.
- Registration creation locks and consumes one grant inside the Customer-insert transaction. `customers_mobile_key` is the final database authority against concurrent duplicate registration; the losing transaction returns the approved `REGISTRATION_CONFLICT` outcome.

### Retention and cleanup contract

- OTP challenges and their provider-safe references are retained for 24 hours after their terminal/expiry time, then deleted only when no registration grant references them.
- Registration grants are retained for 24 hours after consumption/invalidation/expiry, then deleted before their parent challenges.
- Mobile throttle rows are deleted only when `updated_at` is older than 48 hours, safely beyond both rolling windows.
- Revoked or expired Customer sessions and their cascading Refresh history/throttle rows are retained for 30 days, then deleted. Active sessions are never cleanup candidates.
- Expired Refresh recovery-envelope fields are erased as soon as their grace window ends; terminal session history does not retain recoverable plaintext.
- Customer rows are retained. Customer erasure/anonymization, profile retention, and Admin customer management remain separate future decisions.
- No new security-event table is added: structured redacted application events remain the minimum boundary, consistent with the current single-instance foundation. Logs may contain correlation/internal record IDs but never mobile, OTP, flow token, grant, cookie, or raw Refresh value.

### Additive migration impact

- Add one enum and exactly seven tables: `customers`, `customer_otp_challenges`, `customer_registration_grants`, `customer_auth_sessions`, `customer_refresh_tokens`, `customer_otp_mobile_throttles`, and `customer_auth_session_refresh_throttles`.
- Do not alter, backfill, rename, or delete any existing Admin/catalog table, column, enum, index, constraint, or row.
- Wrap reviewed SQL in `BEGIN`/`COMMIT`; prohibit destructive `DROP`/`TRUNCATE` and column/type rewrites.
- Prisma migrations have no automatic down migration. Before production data exists, rollback is a reviewed reverse dependency drop in a disposable environment; after data exists, rollback means application rollback plus a forward corrective migration so Customer/security history is preserved.

### Focused test impact after approval

- Extend `apps/api/test/prisma-schema.test.ts` with the seven exact model/table names, additive-only assertions, and every named security-critical constraint/index above.
- Add one focused PostgreSQL persistence test file for canonical/unique mobile, concurrent Customer creation, one-open-challenge enforcement, 32-byte digest checks, attempt/state/timestamp invariants, grant single-use/concurrency, same-session Refresh replacement, one-current-Refresh enforcement, referential actions, and cleanup eligibility boundaries.
- Validate only the approved migration against disposable `e_commerce_test`; no application-wide suite is justified by this isolated schema slice.

### Execution

1. Present exact Prisma models, indexes, unique constraints, referential actions, cleanup/retention behavior, and migration impact for approval.
2. Confirm mobile uniqueness and concurrent create behavior at the database level.
3. Confirm OTP and registration artifacts have bounded retention and cannot become authentication credentials after consumption or expiry.
4. Only after explicit schema/migration approval, create the additive migration and focused repository/data-integrity tests.

### Security and edge cases

- A plain SHA hash is insufficient for a six-digit OTP; use a server-secret keyed digest bound to challenge context or another approved low-entropy-secret design.
- Never log mobile unnecessarily, OTP, registration grant, raw refresh token, cookies, or secret headers.
- Expired/consumed challenges and grants fail closed.
- Concurrent registration of the same verified mobile resolves deterministically without duplicate Customers.

### Tests and completion evidence

- Focused Prisma/schema validation and migration review.
- Database tests for uniqueness, expiry/consumption invariants, referential actions, and concurrent-conflict handling.
- Explicit migration rollback/recovery notes; do not apply to a non-disposable database without approval.

### Exit criteria

The approved additive migration and focused persistence tests are complete, and generated Prisma artifacts match the schema.

---

## Task 004 — Implement the Backend SMS provider boundary

**Priority:** P0  
**Depends on:** Tasks 002–003  
**Goal:** Isolate Ghasedak behind a testable server-only adapter before authentication endpoints call it.
**Task status:** Complete on 2026-11-17; after the owner corrected the Ghasedak source-IP allowlist, the read-only template check returned HTTP/provider `200`, the explicitly approved sandbox send was `ACCEPTED`, and all 21 focused environment/provider assertions passed without real-SMS use in automated tests.

### Execution

1. Define a provider-neutral `OtpSender` port and a Ghasedak implementation inside `apps/api`.
2. Read the API key and template name from validated server environment configuration.
3. Call `POST https://gateway.ghasedak.me/rest/api/v1/WebService/SendOtpSMS` with a unique, non-sensitive `clientReferenceId`.
4. Use a bounded timeout, validate the provider response, map failures to internal safe outcomes, and avoid automatic retries that could send duplicate OTP messages.
5. Supply a deterministic fake adapter for unit/integration tests; automated tests must not send real SMS.

### API and database impact

No public HTTP endpoint is added in this task. Provider references/status may update only the already-approved challenge fields.

### Security and edge cases

- The API key is sent only in the server-to-server header and is redacted from logs/errors.
- Provider success means accepted by the provider, not proven handset delivery.
- Ambiguous timeout/failure must not silently generate and send an untracked second code.

### Tests and completion evidence

- Unit tests cover request mapping, normalized mobile conversion, success, rejection, malformed response, timeout, and redaction.
- Configuration validation fails closed when required values are missing.

### Exit criteria

The Backend can request an OTP through the fake adapter and correctly map every provider outcome without exposing provider details.

---

## Task 005 — Implement OTP request and resend contracts

**Priority:** P0  
**Depends on:** Tasks 003–004  
**Goal:** Accept a mobile number, create one controlled challenge, send its OTP, and support bounded resend without account enumeration.

### Proposed endpoint

`POST /api/v1/customer-auth/otp/request`

Recommended success result: server `expiresAt` and `resendAvailableAt`, while the opaque challenge reference is set only in the short-lived HttpOnly flow cookie. The JSON shape and status are identical for existing and new Customers.

### Execution

1. Normalize and validate the mobile number on the Backend.
2. Enforce phone/IP throttles and resend cooldown before provider dispatch.
3. Generate the OTP with a cryptographically secure generator; persist only its approved keyed digest and terminal metadata.
4. Send through `OtpSender`, reconcile provider success/failure safely, set/rotate the OTP-flow cookie, and return only the generic timing contract.
5. Treat a request for the same active challenge as the approved resend/rotation behavior; do not create unlimited parallel valid codes.
6. Add Swagger/OpenAPI DTOs, examples, safe errors, and `Cache-Control: no-store`.

### Security and edge cases

- Existing/non-existing Customer timing and messages should be materially equivalent.
- Only the latest approved code for a challenge remains valid after resend.
- Rate limits cover abusive new challenge creation as well as resend.
- Client countdown is presentation only; Backend timestamps and checks are authoritative.

### Tests and completion evidence

- Focused service/controller/integration tests: normalization, both account states, cooldown, expiry, throttle, provider failure, concurrent requests, and generic response equivalence.
- Swagger/OpenAPI matches runtime behavior.

### Exit criteria

An OTP can be requested/resend-controlled through the Backend with no account enumeration or real-SMS dependency in automated tests.

---

## Task 006 — Implement OTP verification and post-verification branching

**Priority:** P0  
**Depends on:** Tasks 003 and 005  
**Goal:** Verify possession of the mobile and only then choose login or registration.

### Proposed endpoint

`POST /api/v1/customer-auth/otp/verify` with `code`; the Backend resolves the challenge only from the validated OTP-flow cookie.

Recommended outcomes after successful proof:

- Existing active Customer: create an independent Customer session, set Customer credentials, and return `nextStep: AUTHENTICATED`.
- No Customer: consume the OTP challenge, rotate the flow cookie to a short-lived single-use registration grant, and return `nextStep: REGISTRATION_REQUIRED`.

### Execution

1. Validate challenge state, expiry, attempt budget, and keyed OTP digest with timing-safe comparison.
2. Increment failed attempts atomically and terminate the challenge at the approved limit.
3. Consume a correct OTP atomically so it cannot be replayed.
4. Handle disabled Customer accounts with the approved safe error.
5. For existing Customers, update justified login metadata and establish the Customer session.
6. For new Customers, issue only the registration state and rotate the flow cookie; do not return the grant in JSON and do not create a partial Customer.
7. Add Swagger/OpenAPI and no-store response behavior.

### Security and edge cases

- Verification is single-flight/idempotent only to the explicitly approved extent; replay must never create multiple sessions or grants unexpectedly.
- Errors do not reveal whether a Customer exists.
- Registration grant is opaque, one-time, short-lived, server-bound, and never exposed to JavaScript, a URL, or Web Storage.

### Tests and completion evidence

- Correct, incorrect, malformed, expired, consumed, over-attempt, concurrent, disabled-account, existing-account, and new-account scenarios.
- Cookie/session assertions for existing Customers and grant assertions for new Customers.

### Exit criteria

Successful OTP proof deterministically produces exactly one safe next step; failed proof produces no Customer session or registration authority.

---

## Task 007 — Implement registration completion

**Priority:** P0  
**Depends on:** Tasks 003 and 006  
**Goal:** Create a Customer only after verified mobile possession and valid initial identity data.

### Proposed endpoint

`POST /api/v1/customer-auth/register` with first name and last name; the Backend resolves the one-time registration grant only from the validated registration-flow cookie.

### Execution

1. Validate and normalize Persian-friendly names with explicit length/content rules; preserve legitimate spaces and characters.
2. Resolve the flow cookie/grant to its verified canonical mobile without trusting a client-supplied mobile or grant.
3. Atomically consume the grant, create the Customer, and establish the initial Customer session.
4. Handle the unique-mobile race safely if another request created the Customer first.
5. Return the minimal authenticated Customer snapshot and safe redirect information.
6. Add Swagger/OpenAPI DTOs, errors, and no-store response behavior.

### Security and edge cases

- Registration never sends a second OTP because mobile possession was already verified.
- Grant/mobile mismatch, expiry, reuse, or tampering fails closed.
- Names are treated as plain text and never rendered as trusted HTML.
- Empty/invalid client fields remain authoritative Backend validation failures even when frontend validation exists.

### Tests and completion evidence

- Valid registration, invalid names, expired/consumed grant, concurrent duplicate, disabled/conflicting account, transaction rollback, and session issuance tests.
- Swagger/OpenAPI matches the final runtime contract.

### Exit criteria

A verified new mobile can create exactly one Customer and receive an independent authenticated Customer session.

---

## Task 008 — Complete the Customer session lifecycle

**Priority:** P0  
**Depends on:** Tasks 003, 006–007  
**Goal:** Make OTP login production-oriented rather than treating OTP verification as a permanent browser credential.

### Proposed endpoints

- `POST /api/v1/customer-auth/bootstrap`
- `POST /api/v1/customer-auth/refresh`
- `POST /api/v1/customer-auth/logout`
- `GET /api/v1/customer-auth/me` only if the approved bootstrap contract does not already supply the required snapshot
- `GET /api/v1/customer-auth/flow` as a no-store, non-enumerating view of the current browser flow stage and timing, used only to guard/canonicalize the three auth routes

### Execution

1. Reuse the accepted security guarantees of Admin authentication: short Access credential, opaque rotating Refresh credential, current-session enforcement, session-bound CSRF, absolute expiry, bounded recovery/reuse handling, and current-session logout.
2. Use Customer-specific host-only cookie names and paths/settings; never accept or issue Admin credentials.
3. Ensure disabled Customer state invalidates access according to the approved contract.
4. Add exact Origin/Referer and Fetch Metadata protections where applicable, no-store responses, safe errors, and structured redacted security events.
5. Add full Swagger/OpenAPI coverage for every new HTTP contract.

### Security and edge cases

- Login/OTP endpoints do not trigger refresh recursion.
- Concurrent expired requests share one refresh operation at the Storefront client boundary later.
- Network ambiguity does not automatically log out a Customer.
- Logout revokes only the current Customer session unless a separately approved logout-all feature is added later.

### Tests and completion evidence

- Focused lifecycle integration tests for bootstrap, refresh rotation/race/recovery, invalid/reused credentials, CSRF, Origin, disablement, expiry, and logout.
- Explicit proof that Admin and Customer cookies/sessions cannot cross-authenticate.

### Exit criteria

Customer authentication has a complete independent session lifecycle with the accepted security properties and stable API documentation.

---

## Task 009 — Implement the Storefront BFF and client authentication foundation

**Priority:** P0  
**Depends on:** Tasks 005–008  
**Goal:** Connect Storefront to Customer authentication without exposing Backend credentials or bypassing the existing same-origin architecture.

### Affected Storefront areas

- Same-origin `/api/v1/**` Route Handler boundary.
- Customer auth types, safe error normalization, Auth provider/state, CSRF handling, refresh single-flight, and safe return-destination helpers.
- Feature-local TanStack Query hooks over the existing Storefront request adapters.

### Execution

1. Extend the existing Storefront BFF only as required to forward Customer cookies and Backend `Set-Cookie` safely; preserve Origin enforcement and no-store behavior.
2. Add Customer-specific bootstrap/session state without importing Admin implementation or credentials.
3. Implement bounded single-flight Refresh and exactly-once eligible request replay using the approved Customer error codes.
4. Clear Customer-scoped query data on logout, terminal authentication loss, or identity change.
5. Keep OTP challenge and registration grant exclusively behind the short-lived HttpOnly flow cookie. Client memory may hold non-authoritative display data such as returned timestamps, but never the challenge/grant authority.
6. Guard each auth route against `GET /customer-auth/flow`: render only its matching stage, redirect missing/expired state to `/auth`, and canonicalize valid mismatched stages to `/auth/verify` or `/auth/register`.

### Security and edge cases

- Browser JavaScript reads neither Access nor Refresh cookie; it reads only the Customer CSRF cookie when required.
- No Ghasedak key or direct Ghasedak request exists in Storefront code.
- Direct navigation/reload into verification or registration without valid server flow authority redirects safely to `/auth`; Back navigation cannot resurrect a consumed stage.

### Tests and completion evidence

- Focused BFF, auth-state, refresh/replay, logout, cookie-forwarding, CSRF, safe-redirect, and error-normalization tests.
- Prove Admin cookies are neither forwarded as Customer credentials nor interpreted by Customer state.

### Exit criteria

Storefront has a tested Customer auth foundation ready for route UI, with no visual implementation propagated beyond the three auth routes.

---

## Task 010 — Implement `/auth` mobile-entry route

**Priority:** P1  
**Depends on:** Task 009  
**Goal:** Provide the responsive Persian RTL entry page that requests an OTP.

**Visual scope:** Minimal functional form only. Do not spend task time inventing a final design before the UI-team reference arrives.

### Execution

1. Start/reuse the Storefront development server and provide the exact local route for live owner review before substantial UI work.
2. Use only the existing Storefront theme/tokens and a plain centered responsive form surface; do not apply Admin visual references or introduce new decorative assets, animations, visual tokens, or UI dependencies.
3. Build the form with the already-installed `react-hook-form`, `zod`, and `@hookform/resolvers/zod`; keep the feature-local Zod schema as the source of client form types.
4. Accept Persian/Arabic digits, show a persistent label and linked inline errors, and normalize only for display/request preparation while Backend remains authoritative.
5. Keep submit operable for empty/invalid fields so submission reveals errors; during the request show the required disabled gray busy state and visible spinner.
6. On success, rely on the Backend-set HttpOnly OTP-flow cookie and navigate to `/auth/verify`; keep only non-authoritative timing/display data in client memory.
7. Support light/dark themes, keyboard/focus behavior, and mobile-first layouts at approximately 360, 768, and 1280 pixels.
8. Compose the screen from existing shared primitives (`UiHeading`, `UiP`/`UiSpan`, `UiInputTextField`, `UiButton`, and `UiLink` where a link is needed). If a primitive lacks an accessibility/native-prop capability required by the form, make the smallest backward-compatible shared-component improvement instead of bypassing it with a duplicate local control.

### Tests and completion evidence

- Focused component tests for validation, Persian digits, busy single-flight behavior, safe error display, successful navigation, and keyboard accessibility.
- Focused browser evidence for the route at meaningful breakpoints and both themes.
- Owner review confirms only that the temporary UI is usable and structurally ready for later redesign; this is not final visual approval.

### Exit criteria

The approved `/auth` route can request an OTP once per submission and safely enter the verification step.

---

## Task 011 — Implement `/auth/verify` OTP route

**Priority:** P1  
**Depends on:** Tasks 006 and 009–010  
**Goal:** Let the Customer enter the OTP, see the authoritative two-minute countdown, and request a bounded resend.

**Visual scope:** Reuse the same minimal temporary shell and shared primitives from Task 010; do not add final-design polish.

### Execution

1. Render an accessible OTP input with explicit label/instructions; support paste, Persian/Arabic digits, correction, and predictable focus without sacrificing semantic input behavior.
2. Derive countdown display from server `expiresAt`/`resendAvailableAt`, not from an assumed local two-minute timer.
3. Keep resend disabled until the authoritative time, then call the same approved OTP request/resend contract and replace only returned timing/display state; the Backend rotates the cookie-bound challenge authority.
4. Submit through the feature hook with single-flight busy behavior and visible safe Persian errors.
5. Navigate `AUTHENTICATED` to the safe destination and `REGISTRATION_REQUIRED` to `/auth/register`; the Backend has already rotated the HttpOnly flow cookie, so JavaScript never receives or preserves the one-time grant.
6. Handle reload, missing state, Back, expiry, resend failure, offline state, and already-consumed challenge safely.
7. Use a feature-local Zod OTP schema through React Hook Form and `zodResolver`; connect shared input error props to React Hook Form errors and focus the first invalid field predictably.
8. On mount/reload, validate the server flow stage before enabling submission; never infer OTP stage merely from mounted component state.

### Tests and completion evidence

- Focused fake-timer/component tests for countdown, resend boundary, new timestamps, paste/digit normalization, errors, and both next-step branches.
- Browser evidence for keyboard/mobile interaction, responsive layout, both themes, and no clipped controls.

### Exit criteria

The approved verification route handles OTP verification/resend and both post-proof branches without exposing account existence beforehand.

---

## Task 012 — Implement `/auth/register` completion route

**Priority:** P1  
**Depends on:** Tasks 007, 009, and 011  
**Goal:** Collect only first name and last name for a verified new Customer and finish authentication.

**Visual scope:** Reuse the same minimal temporary shell and shared primitives; final UI-team design remains deferred.

### Execution

1. Require a valid transient registration grant; direct/expired access redirects safely to `/auth` with no leaked authority.
2. Implement persistent labels, linked errors, invalid-field focus, Persian-friendly name validation, and the required submit/busy behavior.
3. Do not ask for mobile again and do not send another OTP.
4. Submit through the feature mutation hook; on success reconcile Customer auth/query state and navigate once to the safe destination.
5. Preserve entered names on recoverable transport errors; Backend success or terminal failure clears the HttpOnly flow cookie, while the frontend clears only non-sensitive form/display state.
6. Validate responsive light/dark Persian RTL behavior at the required breakpoints.
7. Use a feature-local Zod registration schema through React Hook Form and `zodResolver`, with the shared `UiInputTextField`, `UiButton`, and shared text/heading primitives for labels, guidance, and errors.
8. Validate the server flow stage on mount/reload; route name alone never grants access to registration submission.

### Tests and completion evidence

- Focused component tests for invalid names, busy/single-flight behavior, recoverable error preservation, terminal grant failure, successful authentication, and safe navigation.
- Browser evidence for mobile/desktop, themes, keyboard use, and reload/direct-entry rejection.

### Exit criteria

A verified new Customer can complete minimal registration exactly once and enter the Storefront as an authenticated Customer.

---

## Task 013 — Final auth-flow validation and durable documentation

**Priority:** P1  
**Depends on:** Tasks 001–012  
**Goal:** Validate the complete approved Customer registration/login slice and update only documentation made true by implementation.

### Execution

1. Run only focused tests/scenarios that directly cover the changed auth behavior during iteration; broaden only for a recorded concrete shared/security regression risk.
2. Run each applicable final gate once after the implementation stabilizes: affected API/Storefront typecheck, lint/format checks, focused security/integration tests, Swagger/OpenAPI verification, Prisma/migration validation, and affected builds as required by the Definition of Done.
3. Run focused Storefront browser scenarios for existing login, new registration, resend, expiry, wrong-code limit, throttling, provider failure, refresh/reload, logout, both themes, and responsive breakpoints.
4. Review logs, responses, browser storage, network requests, cookies, and built client assets for OTP/API-key/token/grant leakage.
5. Update the project overview, authentication architecture, environment documentation, API documentation, and a dedicated Customer-auth feature specification only where implementation changed repository reality; document that final visual design is still pending UI-team input.
6. Record remaining deployment operations such as production secret injection, Ghasedak production template/key, monitoring, cleanup scheduling, and distributed-rate-limit requirements.

### Required final evidence

- Existing Customer: mobile -> OTP -> authenticated session.
- New Customer: mobile -> OTP -> first/last name -> Customer created -> authenticated session.
- Before OTP verification, responses do not reveal account existence.
- OTP/grant expiry, consumption, resend, attempt limit, throttling, and concurrency behave as approved.
- Customer and Admin identities/cookies/sessions remain isolated.
- No Ghasedak key, raw OTP, registration grant, Access token, or Refresh token leaks to logs, Web Storage, URLs, or client bundles.
- Swagger/OpenAPI and durable documentation match runtime behavior.

### Exit criteria

All approved Acceptance Criteria and applicable Definition-of-Done gates pass, owner usability review of the three temporary auth forms is complete, and no unresolved security or product decision remains. Final UI-team visual redesign remains explicitly deferred.

---

## Start rule

Begin only with **Task 001**. After each task reaches its exit criteria, obtain any approval explicitly required by the next task. Do not start Customer profile, address, or Admin customer-management work from this file.

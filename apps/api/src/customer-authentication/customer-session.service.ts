import type { IncomingMessage } from 'node:http';

import { Inject, Injectable, Logger } from '@nestjs/common';
import { errors as joseErrors, jwtVerify, type JWTPayload, type JWSHeaderParameters } from 'jose';

import { AuthenticationError } from '../authentication/authentication.errors.js';
import { readCookie } from '../authentication/cookie.js';
import type { ApiEnvironment } from '../config/environment.js';
import { API_ENVIRONMENT } from '../config/tokens.js';
import {
  AUTH_RATE_LIMITED_MESSAGE,
  CUSTOMER_ACCESS_AUDIENCE,
  CUSTOMER_ACCESS_COOKIE_NAME,
  CUSTOMER_ACCESS_LIFETIME_SECONDS,
  CUSTOMER_ACCESS_TOKEN_EXPIRED_MESSAGE,
  CUSTOMER_ACCOUNT_DISABLED_MESSAGE,
  CUSTOMER_AUTHENTICATION_REQUIRED_MESSAGE,
  CUSTOMER_AUTH_FLOW_COOKIE_NAME,
  CUSTOMER_CSRF_VALIDATION_FAILED_MESSAGE,
  CUSTOMER_INVALID_ACCESS_TOKEN_MESSAGE,
  CUSTOMER_REFRESH_COOKIE_NAME,
  CUSTOMER_REFRESH_TOKEN_EXPIRED_MESSAGE,
  CUSTOMER_REFRESH_TOKEN_INVALID_MESSAGE,
  CUSTOMER_REFRESH_TOKEN_REUSED_MESSAGE,
} from './customer-authentication.constants.js';
import { CustomerAuthenticationError } from './customer-authentication.errors.js';
import type { CustomerFlowResponse } from './customer-session.dto.js';
import {
  CustomerSessionCrypto,
  type IssuedCustomerRefresh,
} from './customer-session.crypto.js';
import {
  CustomerSessionRepository,
  type CurrentCustomerRefresh,
  type CurrentCustomerSession,
} from './customer-session.repository.js';
import { CustomerSessionSecurity } from './customer-session.security.js';
import { maskMobile } from './otp-request.dto.js';
import { OtpRequestCrypto } from './otp-request.crypto.js';
import type { CustomerSnapshot } from './otp-verification.repository.js';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
const ACCESS_CLAIMS = ['aud', 'exp', 'iat', 'iss', 'jti', 'sid', 'sub'] as const;
const ACCESS_HEADERS = ['alg', 'kid', 'typ'] as const;

export interface CurrentCustomerAuthentication {
  readonly sessionId: string;
  readonly sessionExpiresAt: Date;
  readonly csrfTokenHash: Uint8Array<ArrayBuffer>;
  readonly customer: CustomerSnapshot;
}

export interface CustomerBootstrapResult {
  readonly authentication: CurrentCustomerAuthentication;
  readonly csrfToken: string;
  readonly credentials: CustomerRefreshResult | null;
}

export interface CustomerRefreshResult {
  readonly accessToken: string;
  readonly accessExpiresAt: Date;
  readonly refreshToken: string;
  readonly sessionExpiresAt: Date;
  readonly authentication: CurrentCustomerAuthentication;
}

export interface CustomerFlowResult {
  readonly response: CustomerFlowResponse;
  readonly clearFlow: boolean;
  readonly clearSession: boolean;
}

@Injectable()
export class CustomerSessionService {
  private readonly logger = new Logger(CustomerSessionService.name);

  constructor(
    private readonly repository: CustomerSessionRepository,
    private readonly crypto: CustomerSessionCrypto,
    private readonly flowCrypto: OtpRequestCrypto,
    private readonly security: CustomerSessionSecurity,
    @Inject(API_ENVIRONMENT) private readonly environment: ApiEnvironment,
  ) {}

  // Access مشتری را بدون ورود به جریان Refresh به context معتبر و قابل‌استفاده مجدد تبدیل می‌کند.
  authenticateAccess(
    request: IncomingMessage,
    now = new Date(),
  ): Promise<CurrentCustomerAuthentication> {
    return this.verifyAccess(request, now);
  }

  // نشست را با Access معتبر بازسازی می‌کند و فقط در خطای 401 از Refresh برای بازیابی استفاده می‌کند.
  async bootstrap(request: IncomingMessage, now = new Date()): Promise<CustomerBootstrapResult> {
    this.security.assertRequestBoundary(request);
    let authentication: CurrentCustomerAuthentication;
    try {
      authentication = await this.verifyAccess(request, now);
    } catch (error) {
      if (!(error instanceof CustomerAuthenticationError) || error.statusCode !== 401) throw error;
      const credentials = await this.refreshInternal(request, now, false);
      return {
        authentication: credentials.authentication,
        csrfToken: this.recoverCsrf(credentials.authentication),
        credentials,
      };
    }
    const refresh = await this.currentRefresh(request, now, true);
    const refreshAuthentication = this.validateSession(refresh.session, now);
    if (refreshAuthentication.sessionId !== authentication.sessionId) {
      this.authenticationRequired();
    }
    return {
      authentication,
      csrfToken: this.recoverCsrf(authentication),
      credentials: null,
    };
  }

  async refresh(request: IncomingMessage, now = new Date()): Promise<CustomerRefreshResult> {
    return this.refreshInternal(request, now, true);
  }

  // خروج تنها نشست متناظر با Refresh و CSRF فعلی را باطل می‌کند.
  async logout(request: IncomingMessage, now = new Date()): Promise<void> {
    this.security.assertRequestBoundary(request);
    const cookie = this.refreshCookie(request);
    const tokenHash = this.crypto.hashOpaqueCredential(cookie);
    const token = await this.repository.findRefresh(tokenHash);
    if (token === null) this.invalidRefresh();
    this.security.assertCsrf(request, token.session.csrfTokenHash);
    const revoked = await this.repository.logoutKnownSession(tokenHash, token.sessionId, now);
    if (!revoked) this.invalidRefresh();
    this.logger.log({ event: 'customer-authentication.session.logged-out', sessionId: token.sessionId });
  }

  // وضعیت مرورگر را بدون افشای هویت یا وجود حساب از نشست و flow معتبر سرور استخراج می‌کند.
  async flow(request: IncomingMessage, now = new Date()): Promise<CustomerFlowResult> {
    this.security.assertRequestBoundary(request);
    const flowCookie = readCookie(request, CUSTOMER_AUTH_FLOW_COOKIE_NAME);
    const refreshCookie = readCookie(request, CUSTOMER_REFRESH_COOKIE_NAME);
    const clearSession = refreshCookie.kind !== 'missing';
    if (
      refreshCookie.kind === 'present' &&
      /^[A-Za-z0-9_-]{43}$/u.test(refreshCookie.value)
    ) {
      const refresh = await this.repository.findRefresh(
        this.crypto.hashOpaqueCredential(refreshCookie.value),
      );
      if (
        refresh !== null &&
        refresh.revokedAt === null &&
        refresh.expiresAt > now &&
        refresh.session.revokedAt === null &&
        refresh.session.expiresAt > now &&
        refresh.session.customer.disabledAt === null
      ) {
        return {
          response: { stage: 'AUTHENTICATED' },
          clearFlow: flowCookie.kind !== 'missing',
          clearSession: false,
        };
      }
    }

    if (flowCookie.kind === 'missing') {
      return { response: { stage: 'MOBILE_REQUIRED' }, clearFlow: false, clearSession };
    }
    if (flowCookie.kind === 'invalid' || !/^[A-Za-z0-9_-]{43}$/u.test(flowCookie.value)) {
      return { response: { stage: 'MOBILE_REQUIRED' }, clearFlow: true, clearSession };
    }
    const state = await this.repository.resolveFlow(
      this.flowCrypto.flowTokenHash(flowCookie.value),
      now,
    );
    switch (state.kind) {
      case 'mobile_required':
        return { response: { stage: 'MOBILE_REQUIRED' }, clearFlow: true, clearSession };
      case 'otp_pending':
        return {
          response: {
            stage: 'OTP_PENDING',
            maskedMobile: maskMobile(state.mobile),
            expiresAt: state.expiresAt.toISOString(),
            resendAvailableAt: state.resendAvailableAt.toISOString(),
          },
          clearFlow: false,
          clearSession,
        };
      case 'registration_required':
        return {
          response: {
            stage: 'REGISTRATION_REQUIRED',
            expiresAt: state.expiresAt.toISOString(),
          },
          clearFlow: false,
          clearSession,
        };
    }
  }

  // Refresh را پس از مرز درخواست و CSRF به rotation اتمیک یا recovery محدود هدایت می‌کند.
  private async refreshInternal(
    request: IncomingMessage,
    now: Date,
    requireCsrf: boolean,
  ): Promise<CustomerRefreshResult> {
    try {
      this.security.assertRequestBoundary(request);
    } catch (error) {
      if (error instanceof AuthenticationError) {
        throw new CustomerAuthenticationError(
          403,
          'CSRF_VALIDATION_FAILED',
          CUSTOMER_CSRF_VALIDATION_FAILED_MESSAGE,
        );
      }
      throw error;
    }
    const cookie = this.refreshCookie(request);
    const tokenHash = this.crypto.hashOpaqueCredential(cookie);
    const token = await this.repository.findRefresh(tokenHash);
    if (token === null || token.revokedAt !== null) this.invalidRefresh();
    if (token.expiresAt <= now || token.session.expiresAt <= now) this.expiredRefresh();
    const authentication = this.validateSession(token.session, now);
    if (requireCsrf) this.security.assertCsrf(request, authentication.csrfTokenHash);
    this.security.consumeRefreshIpAttempt(request, now.getTime());

    const candidate = await this.crypto.issueRefresh(
      authentication.customer.id,
      authentication.sessionId,
      token.session.expiresAt,
      now,
    );
    const decision = await this.repository.rotateOrRecover(
      tokenHash,
      authentication.sessionId,
      authentication.customer.id,
      candidate,
      now,
    );
    switch (decision.kind) {
      case 'rotated':
        return this.refreshResult(candidate, token, authentication);
      case 'recovered': {
        let refreshToken: string;
        try {
          refreshToken = this.crypto.decryptRefreshToken(
            authentication.sessionId,
            decision.tokenId,
            decision.envelope,
          );
          if (!this.crypto.verifyOpaqueCredential(refreshToken, decision.tokenHash)) {
            throw new Error('Recovered customer credential does not match its hash.');
          }
        } catch {
          await this.repository.revokeSession(authentication.sessionId, now);
          this.logReuse(authentication.sessionId);
          this.reusedRefresh();
        }
        this.logger.log({
          event: 'customer-authentication.refresh.recovered',
          sessionId: authentication.sessionId,
        });
        return {
          accessToken: candidate.accessToken,
          accessExpiresAt: candidate.accessExpiresAt,
          refreshToken,
          sessionExpiresAt: token.session.expiresAt,
          authentication,
        };
      }
      case 'reused':
        this.logReuse(decision.sessionId);
        return this.reusedRefresh();
      case 'expired':
        return this.expiredRefresh();
      case 'authentication_required':
        return this.authenticationRequired();
      case 'account_disabled':
        throw new CustomerAuthenticationError(
          401,
          'CUSTOMER_ACCOUNT_DISABLED',
          CUSTOMER_ACCOUNT_DISABLED_MESSAGE,
        );
      case 'throttled':
        throw new CustomerAuthenticationError(
          429,
          'AUTH_RATE_LIMITED',
          AUTH_RATE_LIMITED_MESSAGE,
          decision.retryAfterSeconds,
        );
      case 'invalid':
        return this.invalidRefresh();
    }
  }

  // ساختار، امضا، claims و اتصال Access به نشست جاری مشتری را سخت‌گیرانه بررسی می‌کند.
  private async verifyAccess(
    request: IncomingMessage,
    now: Date,
  ): Promise<CurrentCustomerAuthentication> {
    const cookie = readCookie(request, CUSTOMER_ACCESS_COOKIE_NAME);
    if (cookie.kind === 'missing') return this.authenticationRequired();
    if (cookie.kind === 'invalid') return this.invalidAccess();
    let payload: JWTPayload;
    let protectedHeader: JWSHeaderParameters;
    try {
      const verification = await jwtVerify(
        cookie.value,
        (header) => {
          if (!this.hasExactKeys(header, ACCESS_HEADERS)) this.invalidAccess();
          if (
            header.alg !== 'EdDSA' ||
            header.typ !== 'customer-at+jwt' ||
            typeof header.kid !== 'string'
          ) {
            this.invalidAccess();
          }
          const key = this.environment.authentication.jwtPublicKeys.get(header.kid);
          if (key === undefined) this.invalidAccess();
          return key;
        },
        {
          algorithms: ['EdDSA'],
          typ: 'customer-at+jwt',
          issuer: this.environment.authentication.jwtIssuer,
          audience: CUSTOMER_ACCESS_AUDIENCE,
          requiredClaims: ['sub', 'sid', 'jti', 'iat', 'exp'],
          currentDate: now,
        },
      );
      payload = verification.payload;
      protectedHeader = verification.protectedHeader;
    } catch (error) {
      if (error instanceof CustomerAuthenticationError) throw error;
      if (error instanceof joseErrors.JWTExpired) {
        throw new CustomerAuthenticationError(
          401,
          'ACCESS_TOKEN_EXPIRED',
          CUSTOMER_ACCESS_TOKEN_EXPIRED_MESSAGE,
        );
      }
      return this.invalidAccess();
    }
    if (!this.hasExactKeys(payload, ACCESS_CLAIMS)) return this.invalidAccess();
    const nowSeconds = Math.floor(now.getTime() / 1000);
    if (
      typeof payload.sub !== 'string' ||
      !UUID_PATTERN.test(payload.sub) ||
      typeof payload.sid !== 'string' ||
      !UUID_PATTERN.test(payload.sid) ||
      typeof payload.jti !== 'string' ||
      !UUID_PATTERN.test(payload.jti) ||
      typeof payload.iat !== 'number' ||
      !Number.isInteger(payload.iat) ||
      payload.iat > nowSeconds ||
      typeof payload.exp !== 'number' ||
      !Number.isInteger(payload.exp) ||
      payload.exp - payload.iat !== CUSTOMER_ACCESS_LIFETIME_SECONDS ||
      payload.iss !== this.environment.authentication.jwtIssuer ||
      payload.aud !== CUSTOMER_ACCESS_AUDIENCE ||
      protectedHeader.kid === undefined
    ) {
      return this.invalidAccess();
    }
    const session = await this.repository.findSession(payload.sid);
    if (session === null || session.customerId !== payload.sub) return this.invalidAccess();
    return this.validateSession(session, now);
  }

  private async currentRefresh(
    request: IncomingMessage,
    now: Date,
    requireUnrotated: boolean,
  ): Promise<CurrentCustomerRefresh> {
    const token = await this.repository.findRefresh(
      this.crypto.hashOpaqueCredential(this.refreshCookie(request)),
    );
    if (
      token === null ||
      token.revokedAt !== null ||
      (requireUnrotated && token.rotatedAt !== null)
    ) {
      return this.invalidRefresh();
    }
    if (token.expiresAt <= now || token.session.expiresAt <= now) return this.expiredRefresh();
    return token;
  }

  // وضعیت جاری نشست و غیرفعال‌بودن مشتری را پیش از تولید context معتبر می‌سنجد.
  private validateSession(
    session: CurrentCustomerSession,
    now: Date,
  ): CurrentCustomerAuthentication {
    if (session.revokedAt !== null || session.expiresAt <= now) return this.authenticationRequired();
    if (session.customer.disabledAt !== null) {
      throw new CustomerAuthenticationError(
        401,
        'CUSTOMER_ACCOUNT_DISABLED',
        CUSTOMER_ACCOUNT_DISABLED_MESSAGE,
      );
    }
    return {
      sessionId: session.id,
      sessionExpiresAt: session.expiresAt,
      csrfTokenHash: Uint8Array.from(session.csrfTokenHash),
      customer: {
        id: session.customer.id,
        mobile: session.customer.mobile,
        firstName: session.customer.firstName,
        lastName: session.customer.lastName,
      },
    };
  }

  private recoverCsrf(authentication: CurrentCustomerAuthentication): string {
    const csrfToken = this.crypto.recoverCsrfToken(
      authentication.sessionId,
      authentication.csrfTokenHash,
    );
    if (csrfToken === null) throw new Error('Customer session CSRF key is unavailable.');
    return csrfToken;
  }

  private refreshResult(
    candidate: IssuedCustomerRefresh,
    token: CurrentCustomerRefresh,
    authentication: CurrentCustomerAuthentication,
  ): CustomerRefreshResult {
    return {
      accessToken: candidate.accessToken,
      accessExpiresAt: candidate.accessExpiresAt,
      refreshToken: candidate.refreshToken,
      sessionExpiresAt: token.session.expiresAt,
      authentication,
    };
  }

  private refreshCookie(request: IncomingMessage): string {
    const cookie = readCookie(request, CUSTOMER_REFRESH_COOKIE_NAME);
    if (cookie.kind === 'missing') return this.authenticationRequired();
    if (cookie.kind === 'invalid' || !/^[A-Za-z0-9_-]{43}$/u.test(cookie.value)) {
      return this.invalidRefresh();
    }
    return cookie.value;
  }

  private hasExactKeys(value: object, expected: readonly string[]): boolean {
    const keys = Object.keys(value).sort();
    return keys.length === expected.length && keys.every((key, index) => key === expected[index]);
  }

  private authenticationRequired(): never {
    throw new CustomerAuthenticationError(
      401,
      'AUTHENTICATION_REQUIRED',
      CUSTOMER_AUTHENTICATION_REQUIRED_MESSAGE,
    );
  }

  private invalidAccess(): never {
    throw new CustomerAuthenticationError(
      401,
      'INVALID_ACCESS_TOKEN',
      CUSTOMER_INVALID_ACCESS_TOKEN_MESSAGE,
    );
  }

  private invalidRefresh(): never {
    throw new CustomerAuthenticationError(
      401,
      'REFRESH_TOKEN_INVALID',
      CUSTOMER_REFRESH_TOKEN_INVALID_MESSAGE,
    );
  }

  private expiredRefresh(): never {
    throw new CustomerAuthenticationError(
      401,
      'REFRESH_TOKEN_EXPIRED',
      CUSTOMER_REFRESH_TOKEN_EXPIRED_MESSAGE,
    );
  }

  private reusedRefresh(): never {
    throw new CustomerAuthenticationError(
      401,
      'REFRESH_TOKEN_REUSED',
      CUSTOMER_REFRESH_TOKEN_REUSED_MESSAGE,
    );
  }

  private logReuse(sessionId: string): void {
    this.logger.warn({ event: 'customer-authentication.refresh.reused', sessionId });
  }
}

import type { IncomingMessage, ServerResponse } from 'node:http';

import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpException,
  Inject,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import {
  ApiBody,
  ApiCookieAuth,
  ApiExtraModels,
  ApiHeader,
  ApiOperation,
  ApiResponse,
  ApiTags,
  getSchemaPath,
} from '@nestjs/swagger';

import { AuthenticationError } from '../authentication/authentication.errors.js';
import { readCookie } from '../authentication/cookie.js';
import { LoginSecurity } from '../authentication/login-security.js';
import { ApiErrorDto } from '../authentication/login.dto.js';
import type { ApiEnvironment } from '../config/environment.js';
import { API_ENVIRONMENT } from '../config/tokens.js';
import { ApiSuccess } from '../http/api-response.js';
import {
  CUSTOMER_AUTH_FLOW_COOKIE_NAME,
  CUSTOMER_AUTH_FLOW_COOKIE_PATH,
  CUSTOMER_ACCESS_COOKIE_NAME,
  CUSTOMER_CSRF_COOKIE_NAME,
  CUSTOMER_REFRESH_COOKIE_NAME,
  AUTH_FLOW_INVALID_MESSAGE,
  CUSTOMER_AUTH_BOOTSTRAPPED_MESSAGE,
  CUSTOMER_FLOW_FETCHED_MESSAGE,
  CUSTOMER_LOGOUT_MESSAGE,
  CUSTOMER_REGISTERED_MESSAGE,
  CUSTOMER_SESSION_REFRESHED_MESSAGE,
  INTERNAL_SERVER_ERROR_MESSAGE,
  OTP_REQUESTED_MESSAGE,
  OTP_SEND_UNAVAILABLE_MESSAGE,
  OTP_VERIFIED_MESSAGE,
} from './customer-authentication.constants.js';
import { CustomerAuthenticationError } from './customer-authentication.errors.js';
import {
  CustomerRegistrationRequestDto,
  CustomerRegistrationResponseDto,
  parseCustomerRegistration,
} from './customer-registration.dto.js';
import { CustomerRegistrationService } from './customer-registration.service.js';
import {
  CustomerAuthenticatedFlowDto,
  type CustomerFlowResponse,
  CustomerMobileRequiredFlowDto,
  CustomerOtpPendingFlowDto,
  CustomerRegistrationRequiredFlowDto,
  CustomerSessionBootstrapResponseDto,
} from './customer-session.dto.js';
import { CustomerSessionService } from './customer-session.service.js';
import {
  maskMobile,
  OtpRequestDto,
  OtpRequestResponseDto,
  parseOtpRequest,
} from './otp-request.dto.js';
import { OtpRequestSecurity, type IpSendReservation } from './otp-request.security.js';
import { OtpRequestService } from './otp-request.service.js';
import {
  OtpAuthenticatedResponseDto,
  OtpRegistrationRequiredResponseDto,
  OtpVerificationRequestDto,
  type OtpVerificationResponse,
  parseOtpVerification,
} from './otp-verification.dto.js';
import { OtpVerificationSecurity } from './otp-verification.security.js';
import { OtpVerificationService } from './otp-verification.service.js';

interface ErrorEnvelope {
  readonly statusCode: number;
  readonly code: string;
  readonly message: string;
  readonly details: readonly unknown[];
}

@ApiTags('Customer authentication')
@ApiExtraModels(
  CustomerRegistrationResponseDto,
  CustomerAuthenticatedFlowDto,
  CustomerMobileRequiredFlowDto,
  CustomerOtpPendingFlowDto,
  CustomerRegistrationRequiredFlowDto,
  OtpAuthenticatedResponseDto,
  OtpRegistrationRequiredResponseDto,
)
@Controller('customer-auth')
export class CustomerAuthenticationController {
  constructor(
    private readonly requestService: OtpRequestService,
    private readonly requestSecurity: OtpRequestSecurity,
    private readonly registrationService: CustomerRegistrationService,
    private readonly sessionService: CustomerSessionService,
    private readonly verificationService: OtpVerificationService,
    private readonly verificationSecurity: OtpVerificationSecurity,
    private readonly loginSecurity: LoginSecurity,
    @Inject(API_ENVIRONMENT) private readonly environment: ApiEnvironment,
  ) {}

  @Post('bootstrap')
  @HttpCode(200)
  @ApiSuccess({
    code: 'CUSTOMER_AUTH_BOOTSTRAPPED',
    message: CUSTOMER_AUTH_BOOTSTRAPPED_MESSAGE,
    kind: 'single',
  })
  @ApiCookieAuth('customerRefresh')
  @ApiOperation({ summary: 'Validate or recover the current Storefront customer session' })
  @ApiResponse({
    status: 200,
    type: CustomerSessionBootstrapResponseDto,
    description: 'Returns the current customer and session-bound CSRF state.',
    headers: {
      'Set-Cookie': {
        description: 'Readable CSRF cookie and replacement credentials when refresh was required.',
        schema: { type: 'string' },
      },
      'Cache-Control': { schema: { type: 'string', example: 'no-store' } },
    },
  })
  @ApiResponse({ status: 401, type: ApiErrorDto, description: 'Authentication/session failure.' })
  @ApiResponse({ status: 403, type: ApiErrorDto, description: 'Untrusted request boundary.' })
  @ApiResponse({ status: 429, type: ApiErrorDto, description: 'Refresh throttle response.' })
  @ApiResponse({ status: 500, type: ApiErrorDto, description: 'Safe internal failure.' })
  // نشست فعلی را بازیابی و در صورت نیاز credentialهای چرخیده را فقط در cookie قرار می‌دهد.
  async bootstrap(
    @Req() request: IncomingMessage,
    @Res({ passthrough: true }) response: ServerResponse,
  ): Promise<CustomerSessionBootstrapResponseDto> {
    response.setHeader('Cache-Control', 'no-store');
    try {
      const result = await this.sessionService.bootstrap(request);
      const cookies = [
        this.csrfCookie(result.csrfToken, result.authentication.sessionExpiresAt),
      ];
      if (result.credentials !== null) {
        cookies.unshift(
          this.sessionCookie(
            CUSTOMER_ACCESS_COOKIE_NAME,
            result.credentials.accessToken,
            result.credentials.accessExpiresAt,
          ),
          this.sessionCookie(
            CUSTOMER_REFRESH_COOKIE_NAME,
            result.credentials.refreshToken,
            result.credentials.sessionExpiresAt,
          ),
        );
      }
      response.setHeader('Set-Cookie', cookies);
      return { customer: result.authentication.customer, csrfToken: result.csrfToken };
    } catch (error) {
      return this.sessionFailure(error, response);
    }
  }

  @Post('refresh')
  @HttpCode(200)
  @ApiSuccess({ code: 'CUSTOMER_SESSION_REFRESHED', message: CUSTOMER_SESSION_REFRESHED_MESSAGE, kind: 'none' })
  @ApiCookieAuth('customerRefresh')
  @ApiHeader({
    name: 'X-CSRF-Token',
    required: true,
    description: 'Current customer session CSRF credential.',
    schema: { type: 'string' },
  })
  @ApiOperation({ summary: 'Rotate or narrowly recover the current customer Refresh credential' })
  @ApiResponse({
    status: 200,
    description: 'Customer credentials rotated or safely recovered within the grace window.',
    headers: {
      'Set-Cookie': {
        description: 'Replacement Access and Refresh HttpOnly cookies.',
        schema: { type: 'string' },
      },
      'Cache-Control': { schema: { type: 'string', example: 'no-store' } },
    },
  })
  @ApiResponse({ status: 401, type: ApiErrorDto, description: 'Refresh/session failure or reuse.' })
  @ApiResponse({ status: 403, type: ApiErrorDto, description: 'CSRF validation failure.' })
  @ApiResponse({ status: 429, type: ApiErrorDto, description: 'Refresh throttle response.' })
  @ApiResponse({ status: 500, type: ApiErrorDto, description: 'Safe internal failure.' })
  // Refresh موفق فقط credentialهای HttpOnly را جایگزین و بدنه حساس را خالی نگه می‌دارد.
  async refresh(
    @Req() request: IncomingMessage,
    @Res({ passthrough: true }) response: ServerResponse,
  ): Promise<void> {
    response.setHeader('Cache-Control', 'no-store');
    try {
      const result = await this.sessionService.refresh(request);
      response.setHeader('Set-Cookie', [
        this.sessionCookie(
          CUSTOMER_ACCESS_COOKIE_NAME,
          result.accessToken,
          result.accessExpiresAt,
        ),
        this.sessionCookie(
          CUSTOMER_REFRESH_COOKIE_NAME,
          result.refreshToken,
          result.sessionExpiresAt,
        ),
      ]);
    } catch (error) {
      return this.sessionFailure(error, response);
    }
  }

  @Post('logout')
  @HttpCode(200)
  @ApiSuccess({ code: 'CUSTOMER_LOGOUT', message: CUSTOMER_LOGOUT_MESSAGE, kind: 'none' })
  @ApiCookieAuth('customerRefresh')
  @ApiHeader({
    name: 'X-CSRF-Token',
    required: true,
    description: 'Current customer session CSRF credential.',
    schema: { type: 'string' },
  })
  @ApiOperation({ summary: 'Revoke and clear only the current Storefront customer session' })
  @ApiResponse({
    status: 200,
    description: 'Current customer session revoked and all customer cookies expired.',
    headers: {
      'Set-Cookie': { schema: { type: 'string' } },
      'Cache-Control': { schema: { type: 'string', example: 'no-store' } },
    },
  })
  @ApiResponse({ status: 401, type: ApiErrorDto, description: 'Unknown customer session.' })
  @ApiResponse({ status: 403, type: ApiErrorDto, description: 'CSRF validation failure.' })
  @ApiResponse({ status: 500, type: ApiErrorDto, description: 'Safe internal failure.' })
  // خروج موفق نشست جاری را باطل و فقط cookieهای حوزه مشتری را منقضی می‌کند.
  async logout(
    @Req() request: IncomingMessage,
    @Res({ passthrough: true }) response: ServerResponse,
  ): Promise<void> {
    response.setHeader('Cache-Control', 'no-store');
    try {
      await this.sessionService.logout(request);
      response.setHeader('Set-Cookie', this.expiredSessionCookies());
    } catch (error) {
      return this.sessionFailure(error, response);
    }
  }

  @Get('flow')
  @ApiSuccess({ code: 'CUSTOMER_FLOW_FETCHED', message: CUSTOMER_FLOW_FETCHED_MESSAGE, kind: 'single' })
  @ApiOperation({ summary: 'Return the authoritative non-enumerating customer auth flow stage' })
  @ApiResponse({
    status: 200,
    schema: {
      oneOf: [
        { $ref: getSchemaPath(CustomerMobileRequiredFlowDto) },
        { $ref: getSchemaPath(CustomerOtpPendingFlowDto) },
        { $ref: getSchemaPath(CustomerRegistrationRequiredFlowDto) },
        { $ref: getSchemaPath(CustomerAuthenticatedFlowDto) },
      ],
    },
    headers: {
      'Set-Cookie': { description: 'Expires invalid flow or session cookies.', schema: { type: 'string' } },
      'Cache-Control': { schema: { type: 'string', example: 'no-store' } },
    },
  })
  @ApiResponse({ status: 403, type: ApiErrorDto, description: 'Untrusted request boundary.' })
  @ApiResponse({ status: 500, type: ApiErrorDto, description: 'Safe internal failure.' })
  // مرحله قابل نمایش را فقط از cookieهای HttpOnly و رکوردهای معتبر سرور تعیین می‌کند.
  async flow(
    @Req() request: IncomingMessage,
    @Res({ passthrough: true }) response: ServerResponse,
  ): Promise<CustomerFlowResponse> {
    response.setHeader('Cache-Control', 'no-store');
    try {
      const result = await this.sessionService.flow(request);
      const cookies = [
        ...(result.clearFlow ? [this.expiredFlowCookie()] : []),
        ...(result.clearSession ? this.expiredSessionCookies() : []),
      ];
      if (cookies.length > 0) response.setHeader('Set-Cookie', cookies);
      return result.response;
    } catch (error) {
      return this.sessionFailure(error, response);
    }
  }

  @Post('register')
  @HttpCode(200)
  @ApiSuccess({ code: 'CUSTOMER_REGISTERED', message: CUSTOMER_REGISTERED_MESSAGE, kind: 'single' })
  @ApiOperation({ summary: 'Complete Storefront customer registration from verified flow state' })
  @ApiBody({ type: CustomerRegistrationRequestDto })
  @ApiResponse({
    status: 200,
    type: CustomerRegistrationResponseDto,
    description: 'Creates the customer once and establishes an authenticated customer session.',
    headers: {
      'Set-Cookie': {
        description: 'Expires registration flow state and issues customer session cookies.',
        schema: { type: 'string' },
      },
      'Cache-Control': {
        description: 'Always no-store.',
        schema: { type: 'string', example: 'no-store' },
      },
    },
  })
  @ApiResponse({ status: 401, type: ApiErrorDto, description: 'Invalid or consumed flow.' })
  @ApiResponse({ status: 403, type: ApiErrorDto, description: 'Untrusted request or disabled account.' })
  @ApiResponse({ status: 410, type: ApiErrorDto, description: 'Expired registration flow.' })
  @ApiResponse({ status: 422, type: ApiErrorDto, description: 'Invalid customer names.' })
  @ApiResponse({ status: 500, type: ApiErrorDto, description: 'Safe internal failure.' })
  // ثبت‌نام را فقط از grant کوکی‌شده تکمیل و در همان پاسخ نشست مستقل مشتری را صادر می‌کند.
  async register(
    @Body() body: unknown,
    @Req() request: IncomingMessage,
    @Res({ passthrough: true }) response: ServerResponse,
  ): Promise<CustomerRegistrationResponseDto> {
    response.setHeader('Cache-Control', 'no-store');
    try {
      this.loginSecurity.assertRequestBoundary(request);
      const flowCookie = readCookie(request, CUSTOMER_AUTH_FLOW_COOKIE_NAME);
      if (flowCookie.kind !== 'present' || !/^[A-Za-z0-9_-]{43}$/u.test(flowCookie.value)) {
        response.setHeader('Set-Cookie', this.expiredFlowCookie());
        throw new CustomerAuthenticationError(401, 'AUTH_FLOW_INVALID', AUTH_FLOW_INVALID_MESSAGE);
      }
      const result = await this.registrationService.register(
        flowCookie.value,
        parseCustomerRegistration(body),
      );
      response.setHeader('Set-Cookie', [
        this.expiredFlowCookie(),
        this.sessionCookie(
          CUSTOMER_ACCESS_COOKIE_NAME,
          result.credentials.accessToken,
          result.credentials.accessExpiresAt,
        ),
        this.sessionCookie(
          CUSTOMER_REFRESH_COOKIE_NAME,
          result.credentials.refreshToken,
          result.credentials.sessionExpiresAt,
        ),
        this.csrfCookie(result.credentials.csrfToken, result.credentials.sessionExpiresAt),
      ]);
      return { nextStep: 'AUTHENTICATED', redirectTo: '/', customer: result.customer };
    } catch (error) {
      if (error instanceof AuthenticationError || error instanceof CustomerAuthenticationError) {
        if (
          error instanceof CustomerAuthenticationError &&
          ['AUTH_FLOW_INVALID', 'REGISTRATION_GRANT_EXPIRED', 'CUSTOMER_ACCOUNT_DISABLED'].includes(
            error.code,
          )
        ) {
          response.setHeader('Set-Cookie', this.expiredFlowCookie());
        }
        throw new HttpException(this.errorEnvelope(error), error.statusCode);
      }
      throw new HttpException(
        {
          statusCode: 500,
          code: 'INTERNAL_SERVER_ERROR',
          message: INTERNAL_SERVER_ERROR_MESSAGE,
          details: [],
        } satisfies ErrorEnvelope,
        500,
      );
    }
  }

  @Post('otp/verify')
  @HttpCode(200)
  @ApiSuccess({ code: 'OTP_VERIFIED', message: OTP_VERIFIED_MESSAGE, kind: 'single' })
  @ApiOperation({ summary: 'Verify a Storefront customer OTP and advance the browser flow' })
  @ApiBody({ type: OtpVerificationRequestDto })
  @ApiResponse({
    status: 200,
    schema: {
      oneOf: [
        { $ref: getSchemaPath(OtpAuthenticatedResponseDto) },
        { $ref: getSchemaPath(OtpRegistrationRequiredResponseDto) },
      ],
    },
    description: 'Authenticates an existing customer or issues registration-only flow state.',
    headers: {
      'Set-Cookie': {
        description: 'Customer session cookies or a rotated registration-flow cookie.',
        schema: { type: 'string' },
      },
      'Cache-Control': {
        description: 'Always no-store.',
        schema: { type: 'string', example: 'no-store' },
      },
    },
  })
  @ApiResponse({ status: 401, type: ApiErrorDto, description: 'Invalid or consumed flow.' })
  @ApiResponse({ status: 403, type: ApiErrorDto, description: 'Untrusted request or disabled account.' })
  @ApiResponse({ status: 410, type: ApiErrorDto, description: 'Expired OTP challenge.' })
  @ApiResponse({ status: 422, type: ApiErrorDto, description: 'Invalid OTP code.' })
  @ApiResponse({
    status: 429,
    type: ApiErrorDto,
    description: 'OTP attempt or IP limit exceeded.',
    headers: {
      'Retry-After': {
        description: 'Present for time-based IP throttling.',
        schema: { type: 'integer', minimum: 1 },
      },
    },
  })
  @ApiResponse({ status: 500, type: ApiErrorDto, description: 'Safe internal failure.' })
  // جریان cookie، بودجه تلاش و انتقال به نشست یا ثبت‌نام را بدون افشای authority هماهنگ می‌کند.
  async verifyOtp(
    @Body() body: unknown,
    @Req() request: IncomingMessage,
    @Res({ passthrough: true }) response: ServerResponse,
  ): Promise<OtpVerificationResponse> {
    response.setHeader('Cache-Control', 'no-store');
    let reservation: { readonly key: string; readonly id: string } | undefined;
    let reservationSettled = false;
    try {
      this.loginSecurity.assertRequestBoundary(request);
      const flowCookie = readCookie(request, CUSTOMER_AUTH_FLOW_COOKIE_NAME);
      if (
        flowCookie.kind !== 'present' ||
        !/^[A-Za-z0-9_-]{43}$/u.test(flowCookie.value)
      ) {
        response.setHeader('Set-Cookie', this.expiredFlowCookie());
        throw new CustomerAuthenticationError(401, 'AUTH_FLOW_INVALID', AUTH_FLOW_INVALID_MESSAGE);
      }
      reservation = this.verificationSecurity.reserve(request);
      const result = await this.verificationService.verify(
        flowCookie.value,
        parseOtpVerification(body),
      );
      this.verificationSecurity.release(reservation);
      reservationSettled = true;

      if (result.nextStep === 'REGISTRATION_REQUIRED') {
        response.setHeader('Set-Cookie', this.flowCookie(result.flowToken, result.expiresAt));
        return { nextStep: 'REGISTRATION_REQUIRED' };
      }
      response.setHeader('Set-Cookie', [
        this.expiredFlowCookie(),
        this.sessionCookie(
          CUSTOMER_ACCESS_COOKIE_NAME,
          result.credentials.accessToken,
          result.credentials.accessExpiresAt,
        ),
        this.sessionCookie(
          CUSTOMER_REFRESH_COOKIE_NAME,
          result.credentials.refreshToken,
          result.credentials.sessionExpiresAt,
        ),
        this.csrfCookie(result.credentials.csrfToken, result.credentials.sessionExpiresAt),
      ]);
      return { nextStep: 'AUTHENTICATED', customer: result.customer };
    } catch (error) {
      if (reservation !== undefined && !reservationSettled) {
        if (
          error instanceof CustomerAuthenticationError &&
          (error.code === 'OTP_INVALID' || error.code === 'OTP_ATTEMPTS_EXCEEDED')
        ) {
          this.verificationSecurity.commitFailure(reservation);
        } else {
          this.verificationSecurity.release(reservation);
        }
      }
      if (error instanceof AuthenticationError || error instanceof CustomerAuthenticationError) {
        if (
          error instanceof CustomerAuthenticationError &&
          ['AUTH_FLOW_INVALID', 'OTP_EXPIRED', 'OTP_ATTEMPTS_EXCEEDED', 'CUSTOMER_ACCOUNT_DISABLED'].includes(
            error.code,
          )
        ) {
          response.setHeader('Set-Cookie', this.expiredFlowCookie());
        }
        if (error.retryAfterSeconds !== undefined) {
          response.setHeader('Retry-After', String(error.retryAfterSeconds));
        }
        throw new HttpException(this.errorEnvelope(error), error.statusCode);
      }
      throw new HttpException(
        {
          statusCode: 500,
          code: 'INTERNAL_SERVER_ERROR',
          message: INTERNAL_SERVER_ERROR_MESSAGE,
          details: [],
        } satisfies ErrorEnvelope,
        500,
      );
    }
  }

  @Post('otp/request')
  @HttpCode(200)
  @ApiSuccess({ code: 'OTP_REQUESTED', message: OTP_REQUESTED_MESSAGE, kind: 'single' })
  @ApiOperation({ summary: 'Request or resend a Storefront customer OTP' })
  @ApiBody({ type: OtpRequestDto })
  @ApiResponse({
    status: 200,
    type: OtpRequestResponseDto,
    description: 'A generic response for both existing and new customers.',
    headers: {
      'Set-Cookie': {
        description: 'Opaque, host-only customer authentication flow cookie.',
        schema: { type: 'string' },
      },
      'Cache-Control': {
        description: 'Always no-store.',
        schema: { type: 'string', example: 'no-store' },
      },
    },
  })
  @ApiResponse({ status: 403, type: ApiErrorDto, description: 'Untrusted request boundary.' })
  @ApiResponse({ status: 422, type: ApiErrorDto, description: 'Invalid mobile number.' })
  @ApiResponse({
    status: 429,
    type: ApiErrorDto,
    description: 'Resend cooldown or OTP request limit.',
    headers: {
      'Retry-After': {
        description: 'Seconds until another request is allowed.',
        schema: { type: 'integer', minimum: 1 },
      },
    },
  })
  @ApiResponse({ status: 500, type: ApiErrorDto, description: 'Safe internal failure.' })
  @ApiResponse({ status: 503, type: ApiErrorDto, description: 'OTP delivery unavailable.' })
  // مرز درخواست، ظرفیت IP، cookie جریان و پاسخ عمومی را در یک نقطه هماهنگ می‌کند.
  async requestOtp(
    @Body() body: unknown,
    @Req() request: IncomingMessage,
    @Res({ passthrough: true }) response: ServerResponse,
  ): Promise<OtpRequestResponseDto> {
    response.setHeader('Cache-Control', 'no-store');
    let reservation: IpSendReservation | undefined;
    let reservationSettled = false;
    try {
      this.loginSecurity.assertRequestBoundary(request);
      const input = parseOtpRequest(body);
      reservation = this.requestSecurity.reserve(request);
      const result = await this.requestService.request(input.mobile);
      if (result.deliveryStatus === 'REJECTED') {
        this.requestSecurity.release(reservation);
        reservationSettled = true;
        response.setHeader('Set-Cookie', this.expiredFlowCookie());
        throw new CustomerAuthenticationError(
          503,
          'OTP_SEND_UNAVAILABLE',
          OTP_SEND_UNAVAILABLE_MESSAGE,
        );
      }

      this.requestSecurity.commit(reservation);
      reservationSettled = true;
      response.setHeader('Set-Cookie', this.flowCookie(result.flowToken, result.expiresAt));
      if (result.deliveryStatus === 'UNKNOWN') {
        throw new CustomerAuthenticationError(
          503,
          'OTP_SEND_UNAVAILABLE',
          OTP_SEND_UNAVAILABLE_MESSAGE,
        );
      }
      return {
        stage: 'OTP_PENDING',
        maskedMobile: maskMobile(result.mobile),
        expiresAt: result.expiresAt.toISOString(),
        resendAvailableAt: result.resendAvailableAt.toISOString(),
      };
    } catch (error) {
      if (reservation !== undefined && !reservationSettled) {
        this.requestSecurity.release(reservation);
      }
      if (error instanceof AuthenticationError || error instanceof CustomerAuthenticationError) {
        if (error.retryAfterSeconds !== undefined) {
          response.setHeader('Retry-After', String(error.retryAfterSeconds));
        }
        throw new HttpException(this.errorEnvelope(error), error.statusCode);
      }
      throw new HttpException(
        {
          statusCode: 500,
          code: 'INTERNAL_SERVER_ERROR',
          message: INTERNAL_SERVER_ERROR_MESSAGE,
          details: [],
        } satisfies ErrorEnvelope,
        500,
      );
    }
  }

  private flowCookie(token: string, expiresAt: Date): string {
    return [
      `${CUSTOMER_AUTH_FLOW_COOKIE_NAME}=${token}`,
      `Path=${CUSTOMER_AUTH_FLOW_COOKIE_PATH}`,
      `Max-Age=${Math.max(0, Math.floor((expiresAt.getTime() - Date.now()) / 1000))}`,
      `Expires=${expiresAt.toUTCString()}`,
      'HttpOnly',
      'SameSite=Strict',
      ...(this.environment.nodeEnv === 'production' ? ['Secure'] : []),
    ].join('; ');
  }

  private expiredFlowCookie(): string {
    return [
      `${CUSTOMER_AUTH_FLOW_COOKIE_NAME}=`,
      `Path=${CUSTOMER_AUTH_FLOW_COOKIE_PATH}`,
      'Max-Age=0',
      'Expires=Thu, 01 Jan 1970 00:00:00 GMT',
      'HttpOnly',
      'SameSite=Strict',
      ...(this.environment.nodeEnv === 'production' ? ['Secure'] : []),
    ].join('; ');
  }

  private sessionCookie(name: string, value: string, expiresAt: Date): string {
    return [
      `${name}=${value}`,
      'Path=/',
      `Max-Age=${Math.max(0, Math.floor((expiresAt.getTime() - Date.now()) / 1000))}`,
      `Expires=${expiresAt.toUTCString()}`,
      'HttpOnly',
      'SameSite=Lax',
      ...(this.environment.nodeEnv === 'production' ? ['Secure'] : []),
    ].join('; ');
  }

  private csrfCookie(value: string, expiresAt: Date): string {
    return [
      `${CUSTOMER_CSRF_COOKIE_NAME}=${value}`,
      'Path=/',
      `Max-Age=${Math.max(0, Math.floor((expiresAt.getTime() - Date.now()) / 1000))}`,
      `Expires=${expiresAt.toUTCString()}`,
      'SameSite=Strict',
      ...(this.environment.nodeEnv === 'production' ? ['Secure'] : []),
    ].join('; ');
  }

  private expiredSessionCookies(): string[] {
    return [
      this.expiredSessionCookie(CUSTOMER_ACCESS_COOKIE_NAME),
      this.expiredSessionCookie(CUSTOMER_REFRESH_COOKIE_NAME),
      this.expiredCsrfCookie(),
    ];
  }

  private expiredSessionCookie(name: string): string {
    return [
      `${name}=`,
      'Path=/',
      'Max-Age=0',
      'Expires=Thu, 01 Jan 1970 00:00:00 GMT',
      'HttpOnly',
      'SameSite=Lax',
      ...(this.environment.nodeEnv === 'production' ? ['Secure'] : []),
    ].join('; ');
  }

  private expiredCsrfCookie(): string {
    return [
      `${CUSTOMER_CSRF_COOKIE_NAME}=`,
      'Path=/',
      'Max-Age=0',
      'Expires=Thu, 01 Jan 1970 00:00:00 GMT',
      'SameSite=Strict',
      ...(this.environment.nodeEnv === 'production' ? ['Secure'] : []),
    ].join('; ');
  }

  // خطاهای قطعی نشست را به پاسخ امن تبدیل و authority منقضی را از مرورگر پاک می‌کند.
  private sessionFailure(error: unknown, response: ServerResponse): never {
    if (error instanceof AuthenticationError || error instanceof CustomerAuthenticationError) {
      if (error.retryAfterSeconds !== undefined) {
        response.setHeader('Retry-After', String(error.retryAfterSeconds));
      }
      if (
        error instanceof CustomerAuthenticationError &&
        [
          'AUTHENTICATION_REQUIRED',
          'CUSTOMER_ACCOUNT_DISABLED',
          'REFRESH_TOKEN_EXPIRED',
          'REFRESH_TOKEN_INVALID',
          'REFRESH_TOKEN_REUSED',
        ].includes(error.code)
      ) {
        response.setHeader('Set-Cookie', this.expiredSessionCookies());
      }
      throw new HttpException(this.errorEnvelope(error), error.statusCode);
    }
    throw new HttpException(
      {
        statusCode: 500,
        code: 'INTERNAL_SERVER_ERROR',
        message: INTERNAL_SERVER_ERROR_MESSAGE,
        details: [],
      } satisfies ErrorEnvelope,
      500,
    );
  }

  private errorEnvelope(error: AuthenticationError | CustomerAuthenticationError): ErrorEnvelope {
    return {
      statusCode: error.statusCode,
      code: error.code,
      message: error.message,
      details: [],
    };
  }
}

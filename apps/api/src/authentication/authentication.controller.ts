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
  UseGuards,
} from '@nestjs/common';
import {
  ApiBody,
  ApiCookieAuth,
  ApiHeader,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { IncomingMessage, ServerResponse } from 'node:http';

import type { ApiEnvironment } from '../config/environment.js';
import { API_ENVIRONMENT } from '../config/tokens.js';
import { AccessAuthenticationGuard } from './access-authentication.guard.js';
import { ACCESS_COOKIE_NAME, REFRESH_COOKIE_NAME } from './authentication.constants.js';
import {
  CurrentAuthenticationContext,
  type CurrentAuthentication,
} from './authentication-context.js';
import { AuthenticationError } from './authentication.errors.js';
import { safeInternalHttpException, toAuthenticationHttpException } from './authentication-http.js';
import { AuthenticationService } from './authentication.service.js';
import { LoginSecurity } from './login-security.js';
import { LogoutAuthenticationService } from './logout-authentication.service.js';
import { ApiErrorDto, LoginRequestDto, LoginResponseDto, parseLoginRequest } from './login.dto.js';
import {
  CsrfResponseDto,
  CurrentAuthenticationResponseDto,
} from './protected-authentication.dto.js';
import { ProtectedAuthenticationService } from './protected-authentication.service.js';
import { RefreshAuthenticationService } from './refresh-authentication.service.js';

interface ErrorEnvelope {
  statusCode: number;
  code: string;
  message: string;
  details: string[];
}

@ApiTags('Authentication')
@Controller('auth')
export class AuthenticationController {
  constructor(
    private readonly authentication: AuthenticationService,
    private readonly protectedAuthentication: ProtectedAuthenticationService,
    private readonly refreshAuthentication: RefreshAuthenticationService,
    private readonly logoutAuthentication: LogoutAuthenticationService,
    private readonly security: LoginSecurity,
    @Inject(API_ENVIRONMENT) private readonly environment: ApiEnvironment,
  ) {}

  @Post('logout')
  @HttpCode(204)
  @ApiCookieAuth('adminRefresh')
  @ApiHeader({
    name: 'X-CSRF-Token',
    required: true,
    description: 'Current session-bound CSRF credential held only in browser memory.',
    schema: { type: 'string' },
  })
  @ApiOperation({ summary: 'Revoke and clear the current browser session' })
  @ApiResponse({
    status: 204,
    description: 'Current known session revoked idempotently and both cookies cleared; no body.',
    headers: {
      'Set-Cookie': {
        description: 'Expired host-only Access and Refresh HttpOnly cookies.',
        schema: { type: 'string' },
      },
      'Cache-Control': {
        description: 'Always no-store.',
        schema: { type: 'string', example: 'no-store' },
      },
    },
  })
  @ApiResponse({ status: 401, type: ApiErrorDto, description: 'Unknown authentication session.' })
  @ApiResponse({ status: 403, type: ApiErrorDto, description: 'CSRF validation failure.' })
  @ApiResponse({ status: 500, type: ApiErrorDto, description: 'Safe internal failure response.' })
  async logout(
    @Req() request: IncomingMessage,
    @Res({ passthrough: true }) response: ServerResponse,
  ): Promise<void> {
    response.setHeader('Cache-Control', 'no-store');
    try {
      await this.logoutAuthentication.logout(request);
      response.setHeader('Set-Cookie', [
        this.serializeExpiredCookie(ACCESS_COOKIE_NAME),
        this.serializeExpiredCookie(REFRESH_COOKIE_NAME),
      ]);
    } catch (error) {
      if (error instanceof AuthenticationError) throw toAuthenticationHttpException(error);
      throw safeInternalHttpException();
    }
  }

  @Post('refresh')
  @HttpCode(204)
  @ApiCookieAuth('adminRefresh')
  @ApiHeader({
    name: 'X-CSRF-Token',
    required: true,
    description: 'Current session-bound CSRF credential held only in browser memory.',
    schema: { type: 'string' },
  })
  @ApiOperation({ summary: 'Rotate or narrowly recover the current Refresh credential' })
  @ApiResponse({
    status: 204,
    description: 'Credentials rotated or latest in-grace credential safely reissued; no body.',
    headers: {
      'Set-Cookie': {
        description: 'Replacement host-only Access and Refresh HttpOnly cookies.',
        schema: { type: 'string' },
      },
      'Cache-Control': {
        description: 'Always no-store.',
        schema: { type: 'string', example: 'no-store' },
      },
    },
  })
  @ApiResponse({ status: 401, type: ApiErrorDto, description: 'Refresh/session failure or reuse.' })
  @ApiResponse({ status: 403, type: ApiErrorDto, description: 'CSRF or permission failure.' })
  @ApiResponse({
    status: 429,
    type: ApiErrorDto,
    description: 'Generic refresh throttle response.',
    headers: {
      'Retry-After': {
        description: 'Seconds until another attempt is allowed.',
        schema: { type: 'integer', minimum: 1 },
      },
    },
  })
  @ApiResponse({ status: 500, type: ApiErrorDto, description: 'Safe internal failure response.' })
  async refresh(
    @Req() request: IncomingMessage,
    @Res({ passthrough: true }) response: ServerResponse,
  ): Promise<void> {
    response.setHeader('Cache-Control', 'no-store');
    try {
      const credentials = await this.refreshAuthentication.refresh(request);
      response.setHeader('Set-Cookie', [
        this.serializeCookie(
          ACCESS_COOKIE_NAME,
          credentials.accessToken,
          credentials.accessExpiresAt,
        ),
        this.serializeCookie(
          REFRESH_COOKIE_NAME,
          credentials.refreshToken,
          credentials.sessionExpiresAt,
        ),
      ]);
    } catch (error) {
      if (error instanceof AuthenticationError) {
        if (error.retryAfterSeconds !== undefined) {
          response.setHeader('Retry-After', String(error.retryAfterSeconds));
        }
        throw toAuthenticationHttpException(error);
      }
      throw safeInternalHttpException();
    }
  }

  @Get('csrf')
  @ApiCookieAuth('adminRefresh')
  @ApiOperation({ summary: 'Bootstrap the current session CSRF token without rotation' })
  @ApiResponse({
    status: 200,
    type: CsrfResponseDto,
    description: 'Returns the existing session-bound token after Refresh/session validation.',
    headers: {
      'Cache-Control': {
        description: 'Always no-store.',
        schema: { type: 'string', example: 'no-store' },
      },
    },
  })
  @ApiResponse({ status: 401, type: ApiErrorDto, description: 'Authentication/session failure.' })
  @ApiResponse({ status: 403, type: ApiErrorDto, description: 'Current Admin lacks access.' })
  @ApiResponse({ status: 500, type: ApiErrorDto, description: 'Safe internal failure response.' })
  async csrf(
    @Req() request: IncomingMessage,
    @Res({ passthrough: true }) response: ServerResponse,
  ): Promise<CsrfResponseDto> {
    response.setHeader('Cache-Control', 'no-store');
    try {
      return { csrfToken: await this.protectedAuthentication.bootstrapCsrf(request) };
    } catch (error) {
      if (error instanceof AuthenticationError) throw toAuthenticationHttpException(error);
      throw safeInternalHttpException();
    }
  }

  @Get('me')
  @UseGuards(AccessAuthenticationGuard)
  @ApiCookieAuth('adminAccess')
  @ApiOperation({ summary: 'Return current Admin identity and effective authorization' })
  @ApiResponse({
    status: 200,
    type: CurrentAuthenticationResponseDto,
    description: 'Current server-authoritative Admin identity, Roles, and Permissions.',
    headers: {
      'Cache-Control': {
        description: 'Always no-store.',
        schema: { type: 'string', example: 'no-store' },
      },
    },
  })
  @ApiResponse({ status: 401, type: ApiErrorDto, description: 'Access/session/Admin failure.' })
  @ApiResponse({ status: 403, type: ApiErrorDto, description: 'Insufficient current permission.' })
  @ApiResponse({ status: 500, type: ApiErrorDto, description: 'Safe internal failure response.' })
  me(
    @CurrentAuthenticationContext() authentication: CurrentAuthentication,
    @Res({ passthrough: true }) response: ServerResponse,
  ): CurrentAuthenticationResponseDto {
    response.setHeader('Cache-Control', 'no-store');
    return {
      admin: { ...authentication.admin },
      authorization: {
        roles: [...authentication.roles],
        permissions: [...authentication.permissions],
      },
    };
  }

  @Post('login')
  @HttpCode(200)
  @ApiOperation({ summary: 'Establish an Admin browser session' })
  @ApiBody({ type: LoginRequestDto })
  @ApiResponse({
    status: 200,
    type: LoginResponseDto,
    description: 'Session established. Authentication tokens are issued only as HttpOnly cookies.',
    headers: {
      'Set-Cookie': {
        description: 'Host-only Access and Refresh HttpOnly cookies.',
        schema: { type: 'string' },
      },
      'Cache-Control': {
        description: 'Always no-store.',
        schema: { type: 'string', example: 'no-store' },
      },
    },
  })
  @ApiResponse({ status: 400, type: ApiErrorDto, description: 'Malformed login request.' })
  @ApiResponse({
    status: 403,
    type: ApiErrorDto,
    description: 'Untrusted Origin/Referer or Fetch Metadata.',
  })
  @ApiResponse({
    status: 401,
    type: ApiErrorDto,
    description: 'Generic invalid credentials response.',
  })
  @ApiResponse({
    status: 429,
    type: ApiErrorDto,
    description: 'Generic authentication throttle response.',
    headers: {
      'Retry-After': {
        description: 'Seconds until another attempt is allowed.',
        schema: { type: 'integer', minimum: 1 },
      },
    },
  })
  @ApiResponse({ status: 500, type: ApiErrorDto, description: 'Safe internal failure response.' })
  async login(
    @Body() body: unknown,
    @Req() request: IncomingMessage,
    @Res({ passthrough: true }) response: ServerResponse,
  ): Promise<LoginResponseDto> {
    response.setHeader('Cache-Control', 'no-store');
    try {
      this.security.assertRequestBoundary(request);
      this.security.consumeIpAttempt(request);
      const input = parseLoginRequest(body);
      const credentials = await this.authentication.login(input);
      response.setHeader('Set-Cookie', [
        this.serializeCookie(
          ACCESS_COOKIE_NAME,
          credentials.accessToken,
          credentials.accessExpiresAt,
        ),
        this.serializeCookie(
          REFRESH_COOKIE_NAME,
          credentials.refreshToken,
          credentials.sessionExpiresAt,
        ),
      ]);
      return { csrfToken: credentials.csrfToken };
    } catch (error) {
      if (error instanceof AuthenticationError) {
        if (error.retryAfterSeconds !== undefined) {
          response.setHeader('Retry-After', String(error.retryAfterSeconds));
        }
        throw new HttpException(this.errorEnvelope(error), error.statusCode);
      }
      throw new HttpException(
        {
          statusCode: 500,
          code: 'INTERNAL_SERVER_ERROR',
          message: 'خطای داخلی سرور رخ داد.',
          details: [],
        } satisfies ErrorEnvelope,
        500,
      );
    }
  }

  private errorEnvelope(error: AuthenticationError): ErrorEnvelope {
    return {
      statusCode: error.statusCode,
      code: error.code,
      message: error.message,
      details: [],
    };
  }

  private serializeCookie(name: string, value: string, expiresAt: Date): string {
    const secure = this.environment.nodeEnv === 'production';
    const maxAge = Math.max(0, Math.floor((expiresAt.getTime() - Date.now()) / 1000));
    return [
      `${name}=${value}`,
      'Path=/',
      `Max-Age=${maxAge}`,
      `Expires=${expiresAt.toUTCString()}`,
      'HttpOnly',
      'SameSite=Lax',
      ...(secure ? ['Secure'] : []),
    ].join('; ');
  }

  private serializeExpiredCookie(name: string): string {
    const secure = this.environment.nodeEnv === 'production';
    return [
      `${name}=`,
      'Path=/',
      'Max-Age=0',
      'Expires=Thu, 01 Jan 1970 00:00:00 GMT',
      'HttpOnly',
      'SameSite=Lax',
      ...(secure ? ['Secure'] : []),
    ].join('; ');
  }
}

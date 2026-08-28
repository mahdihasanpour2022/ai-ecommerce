import { Body, Controller, HttpCode, HttpException, Post, Req, Res, Inject } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { IncomingMessage, ServerResponse } from 'node:http';

import type { ApiEnvironment } from '../config/environment.js';
import { API_ENVIRONMENT } from '../config/tokens.js';
import { ACCESS_COOKIE_NAME, REFRESH_COOKIE_NAME } from './authentication.constants.js';
import { AuthenticationError } from './authentication.errors.js';
import { AuthenticationService } from './authentication.service.js';
import { LoginSecurity } from './login-security.js';
import { ApiErrorDto, LoginRequestDto, LoginResponseDto, parseLoginRequest } from './login.dto.js';

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
    private readonly security: LoginSecurity,
    @Inject(API_ENVIRONMENT) private readonly environment: ApiEnvironment,
  ) {}

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
}

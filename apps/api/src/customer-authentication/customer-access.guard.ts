import { CanActivate, ExecutionContext, HttpException, Injectable } from '@nestjs/common';
import type { ServerResponse } from 'node:http';

import { safeInternalHttpException } from '../authentication/authentication-http.js';
import {
  CUSTOMER_AUTHENTICATION_CONTEXT,
  type CustomerAuthenticatedRequest,
} from './customer-authentication-context.js';
import { CustomerAuthenticationError } from './customer-authentication.errors.js';
import { CustomerSessionSecurity } from './customer-session.security.js';
import { CustomerSessionService } from './customer-session.service.js';

@Injectable()
export class CustomerAccessGuard implements CanActivate {
  constructor(
    private readonly sessions: CustomerSessionService,
    private readonly security: CustomerSessionSecurity,
  ) {}

  // Access را اعتبارسنجی و درخواست‌های تغییردهنده را به CSRF همان نشست مقید می‌کند.
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<CustomerAuthenticatedRequest>();
    context.switchToHttp().getResponse<ServerResponse>().setHeader('Cache-Control', 'no-store');
    try {
      const authentication = await this.sessions.authenticateAccess(request);
      if (request.method !== 'GET' && request.method !== 'HEAD') {
        this.security.assertCsrf(request, authentication.csrfTokenHash);
      }
      request[CUSTOMER_AUTHENTICATION_CONTEXT] = authentication;
      return true;
    } catch (error) {
      if (error instanceof CustomerAuthenticationError) {
        throw new HttpException(
          {
            statusCode: error.statusCode,
            code: error.code,
            message: error.message,
            details: [],
          },
          error.statusCode,
        );
      }
      throw safeInternalHttpException();
    }
  }
}

@Injectable()
export class OptionalCustomerAccessGuard implements CanActivate {
  constructor(private readonly sessions: CustomerSessionService) {}

  // درخواست عمومی را با Access معتبر شخصی‌سازی می‌کند و credential غایب یا نامعتبر را مهمان در نظر می‌گیرد.
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<CustomerAuthenticatedRequest>();
    context
      .switchToHttp()
      .getResponse<ServerResponse>()
      .setHeader('Cache-Control', 'private, no-store');
    try {
      request[CUSTOMER_AUTHENTICATION_CONTEXT] =
        await this.sessions.authenticateAccess(request);
    } catch (error) {
      if (error instanceof CustomerAuthenticationError) return true;
      throw safeInternalHttpException();
    }
    return true;
  }
}

import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import type { ServerResponse } from 'node:http';

import { AUTHENTICATION_CONTEXT, type AuthenticatedRequest } from './authentication-context.js';
import { AuthenticationError } from './authentication.errors.js';
import { safeInternalHttpException, toAuthenticationHttpException } from './authentication-http.js';
import { ProtectedAuthenticationService } from './protected-authentication.service.js';

@Injectable()
export class AccessAuthenticationGuard implements CanActivate {
  constructor(private readonly authentication: ProtectedAuthenticationService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    context.switchToHttp().getResponse<ServerResponse>().setHeader('Cache-Control', 'no-store');
    try {
      request[AUTHENTICATION_CONTEXT] = await this.authentication.authenticateAccess(request);
      return true;
    } catch (error) {
      if (error instanceof AuthenticationError) throw toAuthenticationHttpException(error);
      throw safeInternalHttpException();
    }
  }
}

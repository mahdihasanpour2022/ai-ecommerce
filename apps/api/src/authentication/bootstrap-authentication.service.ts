import { Injectable } from '@nestjs/common';
import type { IncomingMessage } from 'node:http';

import type { CurrentAuthentication } from './authentication-context.js';
import { AuthenticationError } from './authentication.errors.js';
import { LoginSecurity } from './login-security.js';
import { ProtectedAuthenticationService } from './protected-authentication.service.js';
import {
  RefreshAuthenticationService,
  type RefreshResult,
} from './refresh-authentication.service.js';

export interface BootstrapResult {
  readonly authentication: CurrentAuthentication;
  readonly csrfToken: string;
  readonly credentials: RefreshResult | null;
}

@Injectable()
export class BootstrapAuthenticationService {
  constructor(
    private readonly protectedAuthentication: ProtectedAuthenticationService,
    private readonly refreshAuthentication: RefreshAuthenticationService,
    private readonly security: LoginSecurity,
  ) {}

  async bootstrap(request: IncomingMessage, now = new Date()): Promise<BootstrapResult> {
    this.security.assertRequestBoundary(request);
    let authentication: CurrentAuthentication;
    try {
      authentication = await this.protectedAuthentication.authenticateAccess(request, now);
    } catch (error) {
      if (!(error instanceof AuthenticationError) || error.statusCode !== 401) throw error;
      const credentials = await this.refreshAuthentication.refreshForBootstrap(request, now);
      return {
        authentication: credentials.authentication,
        csrfToken: this.protectedAuthentication.recoverCsrfToken(credentials.authentication),
        credentials,
      };
    }
    const refreshSession = await this.protectedAuthentication.bootstrapCsrf(request, now);
    if (refreshSession.authentication.sessionId !== authentication.sessionId) {
      throw new AuthenticationError(401, 'AUTHENTICATION_REQUIRED', '');
    }
    return {
      authentication,
      csrfToken: refreshSession.csrfToken,
      credentials: null,
    };
  }
}

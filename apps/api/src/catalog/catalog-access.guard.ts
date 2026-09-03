import { CanActivate, ExecutionContext, Injectable, SetMetadata } from '@nestjs/common';
import type { ServerResponse } from 'node:http';
import { Reflector } from '@nestjs/core';

import {
  AUTHENTICATION_CONTEXT,
  type AuthenticatedRequest,
} from '../authentication/authentication-context.js';
import { AuthenticationError } from '../authentication/authentication.errors.js';
import {
  safeInternalHttpException,
  toAuthenticationHttpException,
} from '../authentication/authentication-http.js';
import { CsrfService } from '../authentication/csrf.service.js';
import { ProtectedAuthenticationService } from '../authentication/protected-authentication.service.js';
import { INSUFFICIENT_PERMISSION_MESSAGE } from '../authentication/authentication.constants.js';

export type CatalogPermissionCode = 'catalog.manage' | 'catalog.read';
const CATALOG_PERMISSION = 'catalog:permission';

export const CatalogPermission = (permission: CatalogPermissionCode): MethodDecorator =>
  SetMetadata(CATALOG_PERMISSION, permission);

@Injectable()
export class CatalogAccessGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly authentication: ProtectedAuthenticationService,
    private readonly csrf: CsrfService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    context.switchToHttp().getResponse<ServerResponse>().setHeader('Cache-Control', 'no-store');
    try {
      const required = this.reflector.get<CatalogPermissionCode>(
        CATALOG_PERMISSION,
        context.getHandler(),
      );
      if (required === undefined) throw new Error('Catalog permission metadata is unavailable.');
      const current = await this.authentication.authenticateAccess(request);
      if (!current.permissions.includes(required)) {
        throw new AuthenticationError(
          403,
          'INSUFFICIENT_PERMISSION',
          INSUFFICIENT_PERMISSION_MESSAGE,
        );
      }
      this.csrf.assertUnsafeRequest(request, current.csrfTokenHash);
      request[AUTHENTICATION_CONTEXT] = current;
      return true;
    } catch (error) {
      if (error instanceof AuthenticationError) throw toAuthenticationHttpException(error);
      throw safeInternalHttpException();
    }
  }
}

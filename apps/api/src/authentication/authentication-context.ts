import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { IncomingMessage } from 'node:http';

export interface CurrentAuthentication {
  readonly sessionId: string;
  readonly sessionExpiresAt: Date;
  readonly csrfTokenHash: Uint8Array<ArrayBuffer>;
  readonly admin: {
    readonly id: string;
    readonly email: string;
    readonly displayName: string;
  };
  readonly roles: readonly string[];
  readonly permissions: readonly string[];
}

export const AUTHENTICATION_CONTEXT = Symbol('AUTHENTICATION_CONTEXT');

export type AuthenticatedRequest = IncomingMessage & {
  [AUTHENTICATION_CONTEXT]?: CurrentAuthentication;
};

export const CurrentAuthenticationContext = createParamDecorator(
  (_data: unknown, context: ExecutionContext): CurrentAuthentication => {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const authentication = request[AUTHENTICATION_CONTEXT];
    if (authentication === undefined) throw new Error('Authentication context is unavailable.');
    return authentication;
  },
);

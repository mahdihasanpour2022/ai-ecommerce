export type AuthenticationErrorCode =
  | 'ACCESS_TOKEN_EXPIRED'
  | 'ACCOUNT_DISABLED'
  | 'AUTHENTICATION_REQUIRED'
  | 'AUTH_RATE_LIMITED'
  | 'CSRF_VALIDATION_FAILED'
  | 'INSUFFICIENT_PERMISSION'
  | 'INVALID_ACCESS_TOKEN'
  | 'INVALID_CREDENTIALS'
  | 'INVALID_REQUEST'
  | 'ORIGIN_NOT_ALLOWED'
  | 'REFRESH_TOKEN_EXPIRED'
  | 'REFRESH_TOKEN_INVALID'
  | 'REFRESH_TOKEN_REUSED';

export class AuthenticationError extends Error {
  constructor(
    readonly statusCode: number,
    readonly code: AuthenticationErrorCode,
    message: string,
    readonly retryAfterSeconds?: number,
  ) {
    super(message);
    this.name = 'AuthenticationError';
  }
}

export type AuthenticationErrorCode =
  'INVALID_REQUEST' | 'ORIGIN_NOT_ALLOWED' | 'INVALID_CREDENTIALS' | 'AUTH_RATE_LIMITED';

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

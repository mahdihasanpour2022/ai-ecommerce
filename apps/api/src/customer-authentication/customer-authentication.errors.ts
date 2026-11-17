export type CustomerAuthenticationErrorCode =
  | 'ACCESS_TOKEN_EXPIRED'
  | 'AUTHENTICATION_REQUIRED'
  | 'AUTH_FLOW_INVALID'
  | 'AUTH_RATE_LIMITED'
  | 'CUSTOMER_ACCOUNT_DISABLED'
  | 'CUSTOMER_NAME_INVALID'
  | 'CSRF_VALIDATION_FAILED'
  | 'INVALID_ACCESS_TOKEN'
  | 'MOBILE_INVALID'
  | 'OTP_ATTEMPTS_EXCEEDED'
  | 'OTP_EXPIRED'
  | 'OTP_INVALID'
  | 'OTP_RESEND_NOT_READY'
  | 'OTP_SEND_UNAVAILABLE'
  | 'REFRESH_TOKEN_EXPIRED'
  | 'REFRESH_TOKEN_INVALID'
  | 'REFRESH_TOKEN_REUSED'
  | 'REGISTRATION_GRANT_EXPIRED';

export class CustomerAuthenticationError extends Error {
  constructor(
    readonly statusCode: number,
    readonly code: CustomerAuthenticationErrorCode,
    message: string,
    readonly retryAfterSeconds?: number,
  ) {
    super(message);
    this.name = 'CustomerAuthenticationError';
  }
}

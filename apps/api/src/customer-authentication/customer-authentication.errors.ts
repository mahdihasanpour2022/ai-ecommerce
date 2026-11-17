export type CustomerAuthenticationErrorCode =
  | 'AUTH_FLOW_INVALID'
  | 'AUTH_RATE_LIMITED'
  | 'CUSTOMER_ACCOUNT_DISABLED'
  | 'MOBILE_INVALID'
  | 'OTP_ATTEMPTS_EXCEEDED'
  | 'OTP_EXPIRED'
  | 'OTP_INVALID'
  | 'OTP_RESEND_NOT_READY'
  | 'OTP_SEND_UNAVAILABLE';

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

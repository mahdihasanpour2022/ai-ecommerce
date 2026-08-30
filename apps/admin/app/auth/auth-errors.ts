import { AdminHttpError } from '../http/http-client';
import type { CsrfCredentialStore } from '../http/csrf-credential';
import type { AuthAction } from './auth-types';

export const CONNECTIVITY_MESSAGE = 'ارتباط با سرور برقرار نشد. لطفاً دوباره تلاش کنید.';
export const INVALID_CREDENTIALS_MESSAGE = 'اطلاعات ورود نادرست است.';
export const RATE_LIMIT_MESSAGE =
  'تعداد تلاش‌ها بیش از حد مجاز است. لطفاً کمی بعد دوباره تلاش کنید.';
export const ACCOUNT_DISABLED_MESSAGE = 'حساب کاربری غیرفعال است.';
export const INVALID_SESSION_MESSAGE = 'نشست معتبر نیست. لطفاً دوباره وارد شوید.';
export const FORBIDDEN_MESSAGE = 'شما دسترسی لازم برای ورود به پنل مدیریت را ندارید.';
export const CSRF_MESSAGE = 'درخواست معتبر نیست. لطفاً صفحه را تازه‌سازی و دوباره تلاش کنید.';
export const SERVER_MESSAGE = 'خطایی در سرور رخ داد. لطفاً دوباره تلاش کنید.';

const UNAUTHENTICATED_CODES = new Set([
  'AUTHENTICATION_REQUIRED',
  'INVALID_ACCESS_TOKEN',
  'ACCESS_TOKEN_EXPIRED',
  'REFRESH_TOKEN_INVALID',
  'REFRESH_TOKEN_EXPIRED',
  'REFRESH_TOKEN_REUSED',
]);

export function mapBootstrapFailure(error: unknown): AuthAction {
  if (!(error instanceof AdminHttpError)) {
    return { type: 'failed', kind: 'server', message: SERVER_MESSAGE, recoverable: true };
  }
  if (error.kind === 'network' || error.kind === 'timeout') {
    return {
      type: 'failed',
      kind: 'connectivity',
      message: CONNECTIVITY_MESSAGE,
      recoverable: true,
    };
  }
  if (error.code === 'ACCOUNT_DISABLED') {
    return { type: 'unauthenticated', message: ACCOUNT_DISABLED_MESSAGE };
  }
  if (UNAUTHENTICATED_CODES.has(error.code) || error.status === 401) {
    return { type: 'unauthenticated' };
  }
  if (error.code === 'CSRF_VALIDATION_FAILED') {
    return { type: 'failed', kind: 'server', message: CSRF_MESSAGE, recoverable: true };
  }
  if (error.code === 'INSUFFICIENT_PERMISSION' || error.status === 403) {
    return { type: 'failed', kind: 'forbidden', message: FORBIDDEN_MESSAGE, recoverable: false };
  }
  return { type: 'failed', kind: 'server', message: SERVER_MESSAGE, recoverable: true };
}

export function applyCredentialPolicy(action: AuthAction, credentials: CsrfCredentialStore): void {
  if (action.type === 'unauthenticated' || (action.type === 'failed' && !action.recoverable)) {
    credentials.clear();
  }
}

export function mapLoginFailure(error: unknown): string {
  if (!(error instanceof AdminHttpError)) return SERVER_MESSAGE;
  if (error.kind === 'network' || error.kind === 'timeout') return CONNECTIVITY_MESSAGE;
  if (error.code === 'INVALID_CREDENTIALS') return INVALID_CREDENTIALS_MESSAGE;
  if (error.code === 'AUTH_RATE_LIMITED' || error.status === 429) return RATE_LIMIT_MESSAGE;
  if (error.code === 'ACCOUNT_DISABLED') return ACCOUNT_DISABLED_MESSAGE;
  if (error.code === 'INSUFFICIENT_PERMISSION' || error.status === 403) return FORBIDDEN_MESSAGE;
  if (error.status === 401) return INVALID_SESSION_MESSAGE;
  return SERVER_MESSAGE;
}

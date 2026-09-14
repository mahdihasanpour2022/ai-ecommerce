import { AdminHttpError } from '../app/http/http-client';

export function safeRequestPath(value: string): string {
  if (
    !value.startsWith('/') ||
    value.startsWith('//') ||
    !/^\/[A-Za-z0-9/_-]+$/u.test(value) ||
    value.split('/').some((segment) => segment === '.' || segment === '..')
  ) {
    throw new AdminHttpError('configuration', null, 'UNSAFE_REQUEST_PATH');
  }
  return value;
}

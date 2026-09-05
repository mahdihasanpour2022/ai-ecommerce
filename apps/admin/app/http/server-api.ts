export const ACCESS_COOKIE_NAME = 'admin_access_token';
export const REFRESH_COOKIE_NAME = 'admin_refresh_token';
export const CSRF_COOKIE_NAME = 'admin_csrf_token';
export const AUTH_COOKIE_NAMES = [
  ACCESS_COOKIE_NAME,
  REFRESH_COOKIE_NAME,
  CSRF_COOKIE_NAME,
] as const;

const DEFAULT_BACKEND_API_URL = 'http://localhost:3002/api/v1';
const FORWARDED_REQUEST_HEADERS = ['accept', 'content-type', 'if-match', 'x-csrf-token'] as const;
const FORWARDED_RESPONSE_HEADERS = [
  'cache-control',
  'content-disposition',
  'content-type',
  'etag',
  'last-modified',
  'retry-after',
] as const;

export function getBackendApiUrl(value = process.env.API_BASE_URL): string {
  const url = new URL(value?.trim() || DEFAULT_BACKEND_API_URL);
  if (
    !['http:', 'https:'].includes(url.protocol) ||
    url.username !== '' ||
    url.password !== '' ||
    url.search !== '' ||
    url.hash !== ''
  ) {
    throw new Error('API_BASE_URL must be an HTTP(S) URL without credentials, query, or hash.');
  }
  return url.toString().replace(/\/$/u, '');
}

export function backendHeaders(request: Request): Headers {
  const headers = new Headers();
  for (const name of FORWARDED_REQUEST_HEADERS) {
    const value = request.headers.get(name);
    if (value !== null) headers.set(name, value);
  }
  const cookie = request.headers.get('cookie');
  if (cookie !== null) headers.set('cookie', cookie);
  headers.set('origin', new URL(request.url).origin);
  headers.set('sec-fetch-site', 'same-origin');
  return headers;
}

export function backendSetCookies(headers: Headers): readonly string[] {
  const extended = headers as Headers & { getSetCookie?: () => string[] };
  return extended.getSetCookie?.() ?? [];
}

export function appendBackendResponseHeaders(target: Headers, source: Headers): void {
  for (const name of FORWARDED_RESPONSE_HEADERS) {
    const value = source.get(name);
    if (value !== null) target.set(name, value);
  }
  for (const cookie of backendSetCookies(source)) target.append('set-cookie', cookie);
  target.set('cache-control', 'no-store');
}

export function expireAuthenticationCookies(response: Response): void {
  const secure = process.env.NODE_ENV === 'production';
  for (const name of AUTH_COOKIE_NAMES) {
    const csrf = name === CSRF_COOKIE_NAME;
    response.headers.append(
      'set-cookie',
      [
        `${name}=`,
        'Path=/',
        'Max-Age=0',
        'Expires=Thu, 01 Jan 1970 00:00:00 GMT',
        ...(csrf ? [] : ['HttpOnly']),
        `SameSite=${csrf ? 'Strict' : 'Lax'}`,
        ...(secure ? ['Secure'] : []),
      ].join('; '),
    );
  }
}

export function safeGatewayFailure(): Response {
  return Response.json(
    {
      statusCode: 502,
      code: 'AUTH_BACKEND_UNAVAILABLE',
      message: 'ارتباط با سرور برقرار نشد. لطفاً دوباره تلاش کنید.',
      details: [],
    },
    { status: 502, headers: { 'Cache-Control': 'no-store' } },
  );
}

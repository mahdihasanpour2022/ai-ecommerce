const DEFAULT_BACKEND_API_URL = 'http://localhost:3002/api/v1';
const FORWARDED_REQUEST_HEADERS = ['accept', 'content-type', 'if-match'] as const;
const FORWARDED_RESPONSE_HEADERS = [
  'cache-control',
  'content-disposition',
  'content-type',
  'etag',
  'last-modified',
  'retry-after',
] as const;

// آدرس Backend را فقط از یک URL سروری معتبر و بدون credential می‌پذیرد.
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

// فقط headerهای عمومی مجاز را عبور می‌دهد و cookieهای Admin را از Storefront جدا نگه می‌دارد.
export function backendHeaders(request: Request): Headers {
  const headers = new Headers();
  for (const name of FORWARDED_REQUEST_HEADERS) {
    const value = request.headers.get(name);
    if (value !== null) headers.set(name, value);
  }
  headers.set('origin', new URL(request.url).origin);
  headers.set('sec-fetch-site', 'same-origin');
  return headers;
}

// پاسخ Backend را بدون افشای headerهای داخلی یا cookieهای احراز هویت Admin بازمی‌گرداند.
export function appendBackendResponseHeaders(target: Headers, source: Headers): void {
  for (const name of FORWARDED_RESPONSE_HEADERS) {
    const value = source.get(name);
    if (value !== null) target.set(name, value);
  }
  target.set('cache-control', 'no-store');
}

// شکست ارتباط BFF را با envelope امن و قابل‌نمایش به کاربر پاسخ می‌دهد.
export function safeGatewayFailure(): Response {
  return Response.json(
    {
      statusCode: 502,
      hasError: true,
      code: 'BACKEND_UNAVAILABLE',
      message: 'ارتباط با سرور برقرار نشد. لطفاً دوباره تلاش کنید.',
      count: 0,
      result: null,
      singleResult: null,
      details: null,
    },
    { status: 502, headers: { 'Cache-Control': 'no-store' } },
  );
}

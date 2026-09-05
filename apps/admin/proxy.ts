import { NextResponse, type NextRequest } from 'next/server';
import {
  appendBackendSetCookies,
  backendHeaders,
  expireAuthenticationCookies,
  getBackendApiUrl,
  REFRESH_COOKIE_NAME,
} from './app/http/server-api';
import { AUTH_STATE_HEADER, encodeAuthenticationHeader } from './app/auth/server-auth-header';
import { parseCurrentAuthentication } from './app/auth/session-contract';
import { safeReturnDestination } from './app/auth/return-destination';

function loginUrl(request: NextRequest): URL {
  const destination = new URL('/login', request.url);
  if (request.nextUrl.pathname !== '/') {
    destination.searchParams.set(
      'returnTo',
      `${request.nextUrl.pathname}${request.nextUrl.search}`,
    );
  }
  return destination;
}

function nextWithoutAuthHeader(request: NextRequest): NextResponse {
  const requestHeaders = new Headers(request.headers);
  requestHeaders.delete(AUTH_STATE_HEADER);
  return NextResponse.next({ request: { headers: requestHeaders } });
}

export async function proxy(request: NextRequest): Promise<NextResponse> {
  const isLogin = request.nextUrl.pathname === '/login';
  if (isLogin && request.cookies.get(REFRESH_COOKIE_NAME) === undefined) {
    const response = nextWithoutAuthHeader(request);
    expireAuthenticationCookies(response);
    return response;
  }
  if (!isLogin && request.cookies.get(REFRESH_COOKIE_NAME) === undefined) {
    const response = NextResponse.redirect(loginUrl(request));
    expireAuthenticationCookies(response);
    return response;
  }

  let upstream: Response;
  try {
    upstream = await fetch(`${getBackendApiUrl()}/auth/bootstrap`, {
      method: 'POST',
      headers: backendHeaders(request),
      cache: 'no-store',
      redirect: 'manual',
    });
  } catch {
    return new NextResponse('ارتباط با سرور احراز هویت برقرار نشد.', {
      status: 503,
      headers: { 'Cache-Control': 'no-store', 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }

  if (!upstream.ok) {
    if (upstream.status === 401 || upstream.status === 403) {
      if (!isLogin) {
        const response = NextResponse.redirect(loginUrl(request));
        expireAuthenticationCookies(response);
        return response;
      }
      const response = nextWithoutAuthHeader(request);
      expireAuthenticationCookies(response);
      return response;
    }
    return new NextResponse(
      upstream.status === 429
        ? 'تعداد درخواست‌ها بیش از حد مجاز است. کمی بعد دوباره تلاش کنید.'
        : 'ارتباط با سرور احراز هویت برقرار نشد.',
      {
        status: upstream.status === 429 ? 429 : 503,
        headers: { 'Cache-Control': 'no-store', 'Content-Type': 'text/plain; charset=utf-8' },
      },
    );
  }

  let body: unknown;
  try {
    body = await upstream.json();
  } catch {
    return new NextResponse('پاسخ احراز هویت معتبر نیست.', { status: 502 });
  }
  const current = parseCurrentAuthentication(body);
  if (current === null) return new NextResponse('پاسخ احراز هویت معتبر نیست.', { status: 502 });

  if (isLogin) {
    const destination = safeReturnDestination(request.nextUrl.searchParams.get('returnTo'));
    const response = NextResponse.redirect(new URL(destination, request.url));
    appendBackendSetCookies(response.headers, upstream.headers);
    response.headers.set('cache-control', 'no-store');
    return response;
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.delete(AUTH_STATE_HEADER);
  requestHeaders.set(AUTH_STATE_HEADER, encodeAuthenticationHeader(current));
  const response = NextResponse.next({ request: { headers: requestHeaders } });
  appendBackendSetCookies(response.headers, upstream.headers);
  response.headers.set('cache-control', 'no-store');
  return response;
}

export const config = {
  matcher: ['/', '/login', '/catalog/:path*'],
};

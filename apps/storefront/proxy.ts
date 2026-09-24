import { NextResponse, type NextRequest } from 'next/server';

export async function proxy(request: NextRequest): Promise<NextResponse<unknown> | undefined> {
  if (request.nextUrl.pathname === '/home') {
    const redirectUrl = new URL('/', request.url);
    const response = NextResponse.redirect(redirectUrl);
    return response;
  }
}

export const config = {
  matcher: ['/', '/home'],
};

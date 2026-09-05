import {
  appendBackendResponseHeaders,
  backendHeaders,
  getBackendApiUrl,
  safeGatewayFailure,
} from '../../../http/server-api';

const UNSAFE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

async function forward(
  request: Request,
  context: RouteContext<'/api/v1/[...path]'>,
): Promise<Response> {
  const method = request.method.toUpperCase();
  const requestOrigin = new URL(request.url).origin;
  if (
    UNSAFE_METHODS.has(method) &&
    (request.headers.get('origin') !== requestOrigin ||
      request.headers.get('sec-fetch-site') === 'cross-site')
  ) {
    return Response.json(
      { statusCode: 403, code: 'ORIGIN_NOT_ALLOWED', message: 'درخواست معتبر نیست.', details: [] },
      { status: 403, headers: { 'Cache-Control': 'no-store' } },
    );
  }

  const { path } = await context.params;
  const upstreamUrl = new URL(`${getBackendApiUrl()}/${path.map(encodeURIComponent).join('/')}`);
  upstreamUrl.search = new URL(request.url).search;
  try {
    const upstream = await fetch(upstreamUrl, {
      method,
      headers: backendHeaders(request),
      ...(method === 'GET' || method === 'HEAD' ? {} : { body: await request.arrayBuffer() }),
      cache: 'no-store',
      redirect: 'manual',
    });
    const response = new Response(method === 'HEAD' ? null : upstream.body, {
      status: upstream.status,
      statusText: upstream.statusText,
    });
    appendBackendResponseHeaders(response.headers, upstream.headers);
    return response;
  } catch {
    return safeGatewayFailure();
  }
}

export const GET = forward;
export const POST = forward;
export const PUT = forward;
export const PATCH = forward;
export const DELETE = forward;
export const HEAD = forward;

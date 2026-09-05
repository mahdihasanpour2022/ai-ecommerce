import { createServer } from 'node:http';

const port = 3202;

function cookies(header = '') {
  return Object.fromEntries(
    header
      .split(';')
      .map((part) => part.trim().split('='))
      .filter(([name]) => name)
      .map(([name, ...value]) => [name, decodeURIComponent(value.join('='))]),
  );
}

const server = createServer((request, response) => {
  if (request.method !== 'POST' || request.url !== '/api/v1/auth/bootstrap') {
    response.writeHead(404).end();
    return;
  }
  const state = cookies(request.headers.cookie);
  response.setHeader('Cache-Control', 'no-store');
  response.setHeader('Content-Type', 'application/json; charset=utf-8');
  if (state.e2e_auth !== 'catalog') {
    response.writeHead(401).end(
      JSON.stringify({
        statusCode: 401,
        code: 'AUTHENTICATION_REQUIRED',
        message: 'نشست معتبر نیست.',
        details: [],
      }),
    );
    return;
  }
  const permissions = (state.e2e_permissions || 'admin.access|catalog.read|inventory.update')
    .split('|')
    .filter(Boolean);
  response.setHeader('Set-Cookie', 'admin_csrf_token=synthetic-csrf; Path=/; SameSite=Strict');
  response.writeHead(200).end(
    JSON.stringify({
      csrfToken: 'synthetic-csrf',
      admin: {
        id: '55555555-5555-4555-8555-555555555555',
        email: 'catalog@example.com',
        displayName: 'مدیر کاتالوگ',
      },
      authorization: { roles: ['CATALOG_READER'], permissions },
    }),
  );
});

server.listen(port, '127.0.0.1');

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => server.close(() => process.exit(0)));
}

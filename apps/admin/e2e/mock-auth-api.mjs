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
  const state = cookies(request.headers.cookie);
  response.setHeader('Cache-Control', 'no-store');
  response.setHeader('Content-Type', 'application/json; charset=utf-8');

  if (request.method === 'GET' && request.url === '/api/v1/admin/catalog/categories') {
    if (state.e2e_auth !== 'authenticated') {
      response.writeHead(401).end(
        JSON.stringify({
          statusCode: 401,
          hasError: true,
          code: 'AUTHENTICATION_REQUIRED',
          message: 'نشست معتبر نیست.',
          count: 0,
          result: null,
          singleResult: null,
          details: null,
        }),
      );
      return;
    }
    const now = '2026-09-11T10:00:00.000Z';
    const categories = [
      {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'پوشاک',
        parentId: null,
        level: 1,
        children: [
          {
            id: '223e4567-e89b-42d3-a456-426614174001',
            name: 'مانتو',
            parentId: '123e4567-e89b-12d3-a456-426614174000',
            level: 2,
            children: [],
            createdAt: now,
            updatedAt: now,
          },
        ],
        createdAt: now,
        updatedAt: now,
      },
    ];
    response.writeHead(200).end(
      JSON.stringify({
        statusCode: 200,
        hasError: false,
        code: 'CATEGORIES_FETCHED',
        message: 'دسته‌بندی‌ها با موفقیت دریافت شدند.',
        count: categories.length,
        result: categories,
        singleResult: null,
        details: null,
      }),
    );
    return;
  }

  if (request.method !== 'POST' || request.url !== '/api/v1/auth/bootstrap') {
    response.writeHead(404).end();
    return;
  }
  if (state.e2e_auth !== 'authenticated') {
    response.writeHead(401).end(
      JSON.stringify({
        statusCode: 401,
        hasError: true,
        code: 'AUTHENTICATION_REQUIRED',
        message: 'نشست معتبر نیست.',
        count: 0,
        result: null,
        singleResult: null,
        details: null,
      }),
    );
    return;
  }
  response.setHeader('Set-Cookie', 'admin_csrf_token=synthetic-csrf; Path=/; SameSite=Strict');
  response.writeHead(200).end(
    JSON.stringify({
      statusCode: 200,
      hasError: false,
      code: 'AUTHENTICATION_BOOTSTRAPPED',
      message: 'نشست مدیریت با موفقیت بازیابی شد.',
      count: 1,
      result: null,
      singleResult: {
        csrfToken: 'synthetic-csrf',
        admin: {
          id: '55555555-5555-4555-8555-555555555555',
          email: 'admin@example.com',
          displayName: 'مدیر فروشگاه',
        },
        authorization: { roles: ['SUPER_ADMIN'], permissions: ['admin.access'] },
      },
      details: null,
    }),
  );
});

server.listen(port, '127.0.0.1');

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => server.close(() => process.exit(0)));
}

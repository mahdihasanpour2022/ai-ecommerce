import assert from 'node:assert/strict';
import test from 'node:test';

import { buildErrorResponse } from '../src/http/api-exception.filter';
import { buildSuccessResponse } from '../src/http/api-response.interceptor';
import { applyApiResponseContract } from '../src/http/openapi-response';
import type { OpenAPIObject } from '@nestjs/swagger';

void test('builds the canonical collection and no-payload success shapes', () => {
  assert.deepEqual(
    buildSuccessResponse(
      200,
      { code: 'ITEMS_FETCHED', message: 'داده‌ها دریافت شدند.', kind: 'collection' },
      [{ id: 'one' }],
    ),
    {
      statusCode: 200,
      hasError: false,
      message: 'داده‌ها دریافت شدند.',
      code: 'ITEMS_FETCHED',
      count: 1,
      result: [{ id: 'one' }],
      singleResult: null,
      details: null,
    },
  );
  assert.deepEqual(
    buildSuccessResponse(
      200,
      { code: 'ITEM_DELETED', message: 'داده حذف شد.', kind: 'none' },
      undefined,
    ),
    {
      statusCode: 200,
      hasError: false,
      message: 'داده حذف شد.',
      code: 'ITEM_DELETED',
      count: 0,
      result: null,
      singleResult: null,
      details: null,
    },
  );
});

void test('normalizes known and unknown failures without leaking diagnostics', () => {
  assert.deepEqual(
    buildErrorResponse(409, {
      code: 'CATEGORY_NAME_CONFLICT',
      message: 'نام دسته‌بندی تکراری است.',
      details: { name: ['نام تکراری است.'] },
    }),
    {
      statusCode: 409,
      hasError: true,
      message: 'نام دسته‌بندی تکراری است.',
      code: 'CATEGORY_NAME_CONFLICT',
      count: 0,
      result: null,
      singleResult: null,
      details: { name: ['نام تکراری است.'] },
    },
  );
  assert.equal(buildErrorResponse(500, null).code, 'INTERNAL_SERVER_ERROR');
});

void test('wraps JSON success schemas while preserving raw binary responses', () => {
  const document = {
    paths: {
      '/items': {
        get: {
          responses: {
            '200': {
              content: {
                'application/json': { schema: { type: 'array', items: { type: 'string' } } },
              },
            },
          },
        },
      },
      '/image': {
        get: {
          responses: {
            '200': { content: { 'image/png': { schema: { type: 'string', format: 'binary' } } } },
          },
        },
      },
    },
  } as unknown as OpenAPIObject;

  applyApiResponseContract(document);

  const jsonSchema = (
    document.paths['/items']?.get?.responses?.['200'] as {
      content?: { 'application/json'?: { schema?: Record<string, unknown> } };
    }
  ).content?.['application/json']?.schema;
  assert.equal(jsonSchema?.type, 'object');
  assert.deepEqual((jsonSchema?.properties as Record<string, unknown>).result, {
    type: 'array',
    items: { type: 'string' },
  });
  assert.deepEqual(
    (document.paths['/image']?.get?.responses?.['200'] as { content?: unknown }).content,
    { 'image/png': { schema: { type: 'string', format: 'binary' } } },
  );
});

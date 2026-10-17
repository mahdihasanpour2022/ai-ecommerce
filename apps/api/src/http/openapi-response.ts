import type { OpenAPIObject } from '@nestjs/swagger';

type Schema = Record<string, unknown>;

export function applyApiResponseContract(document: OpenAPIObject): OpenAPIObject {
  for (const path of Object.values(document.paths)) {
    if (!path) continue;
    for (const operation of Object.values(path as Record<string, unknown>)) {
      if (!operation || typeof operation !== 'object' || !('responses' in operation)) continue;
      const apiOperation = operation as Record<string, unknown>;
      const responses = apiOperation.responses as Record<string, Record<string, unknown>>;
      for (const [status, response] of Object.entries(responses)) {
        if (!/^2\d\d$/u.test(status) || '$ref' in response) continue;
        const content = response.content as Record<string, { schema?: Schema }> | undefined;
        if (content && !('application/json' in content)) continue;
        const original = content?.['application/json']?.schema;
        const paginated = apiOperation['x-api-response-kind'] === 'page';
        const collection = original?.type === 'array';
        const noPayload = original === undefined;
        response.content = {
          'application/json': {
            schema: paginated
              ? paginatedEnvelopeSchema(document, original)
              : envelopeSchema(
                  collection ? original : null,
                  !collection && !noPayload ? original : null,
                ),
          },
        };
      }
    }
  }
  return document;
}

function paginatedEnvelopeSchema(document: OpenAPIObject, original: Schema | undefined): Schema {
  const pageSchema = resolveSchema(document, original);
  const properties = pageSchema?.properties as Record<string, Schema> | undefined;
  const result = properties?.items;
  if (
    result === undefined ||
    properties?.page === undefined ||
    properties.pageSize === undefined ||
    properties.totalItems === undefined ||
    properties.totalPages === undefined
  ) {
    throw new Error('Paginated OpenAPI response schema is invalid.');
  }
  const envelope = envelopeSchema(result, null);
  const envelopeProperties = envelope.properties as Record<string, Schema>;
  envelope.required = [
    ...(envelope.required as string[]),
    'page',
    'pageSize',
    'totalItems',
    'totalPages',
  ];
  envelope.properties = {
    ...envelopeProperties,
    page: properties.page,
    pageSize: properties.pageSize,
    totalItems: properties.totalItems,
    totalPages: properties.totalPages,
  };
  return envelope;
}

function resolveSchema(document: OpenAPIObject, schema: Schema | undefined): Schema | undefined {
  const reference = schema?.['$ref'];
  if (typeof reference !== 'string') return schema;
  const prefix = '#/components/schemas/';
  if (!reference.startsWith(prefix)) return undefined;
  return document.components?.schemas?.[reference.slice(prefix.length)] as Schema | undefined;
}

function envelopeSchema(result: Schema | null, singleResult: Schema | null): Schema {
  return {
    type: 'object',
    required: [
      'statusCode',
      'hasError',
      'message',
      'code',
      'count',
      'result',
      'singleResult',
      'details',
    ],
    properties: {
      statusCode: { type: 'integer' },
      hasError: { type: 'boolean', example: false },
      message: { type: 'string' },
      code: { type: 'string', pattern: '^[A-Z][A-Z0-9_]*$' },
      count: { type: 'integer', minimum: 0 },
      result: result ?? { type: 'null' },
      singleResult: singleResult ?? { type: 'null' },
      details: { type: 'null' },
    },
  };
}

import type { OpenAPIObject } from '@nestjs/swagger';

type Schema = Record<string, unknown>;

export function applyApiResponseContract(document: OpenAPIObject): OpenAPIObject {
  for (const path of Object.values(document.paths)) {
    if (!path) continue;
    for (const operation of Object.values(path as Record<string, unknown>)) {
      if (!operation || typeof operation !== 'object' || !('responses' in operation)) continue;
      const responses = operation.responses as Record<string, Record<string, unknown>>;
      for (const [status, response] of Object.entries(responses)) {
        if (!/^2\d\d$/u.test(status) || '$ref' in response) continue;
        const content = response.content as Record<string, { schema?: Schema }> | undefined;
        if (content && !('application/json' in content)) continue;
        const original = content?.['application/json']?.schema;
        const collection = original?.type === 'array';
        const noPayload = original === undefined;
        response.content = {
          'application/json': {
            schema: envelopeSchema(
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

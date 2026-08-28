import { HttpException } from '@nestjs/common';

import { AuthenticationError } from './authentication.errors.js';

export function toAuthenticationHttpException(error: AuthenticationError): HttpException {
  return new HttpException(
    {
      statusCode: error.statusCode,
      code: error.code,
      message: error.message,
      details: [],
    },
    error.statusCode,
  );
}

export function safeInternalHttpException(): HttpException {
  return new HttpException(
    {
      statusCode: 500,
      code: 'INTERNAL_SERVER_ERROR',
      message: 'خطای داخلی سرور رخ داد.',
      details: [],
    },
    500,
  );
}

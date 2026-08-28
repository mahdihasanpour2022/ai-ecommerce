import { ApiProperty } from '@nestjs/swagger';

import { AuthenticationError } from './authentication.errors.js';
import { INVALID_REQUEST_MESSAGE } from './authentication.constants.js';

export class LoginRequestDto {
  @ApiProperty({ example: 'admin@example.com', maxLength: 254, format: 'email' })
  email!: string;

  @ApiProperty({
    description: 'Admin password. Never logged or echoed.',
    minLength: 1,
    maxLength: 128,
  })
  password!: string;
}

export class LoginResponseDto {
  @ApiProperty({ description: 'Session-bound 256-bit CSRF token held in browser memory.' })
  csrfToken!: string;
}

export class ApiErrorDto {
  @ApiProperty({ example: 401 })
  statusCode!: number;

  @ApiProperty({ example: 'INVALID_CREDENTIALS' })
  code!: string;

  @ApiProperty({ example: 'اطلاعات ورود نادرست است.' })
  message!: string;

  @ApiProperty({ type: [String], example: [] })
  details!: string[];
}

export interface LoginInput {
  readonly email: string;
  readonly password: string;
}

function containsControlCharacter(value: string): boolean {
  return Array.from(value).some((character) => {
    const point = character.codePointAt(0);
    return point !== undefined && (point < 32 || (point >= 127 && point <= 159));
  });
}

export function parseLoginRequest(body: unknown): LoginInput {
  if (body === null || Array.isArray(body) || typeof body !== 'object') {
    throw new AuthenticationError(400, 'INVALID_REQUEST', INVALID_REQUEST_MESSAGE);
  }
  const record = body as Record<string, unknown>;
  if (
    Object.keys(record).length !== 2 ||
    typeof record.email !== 'string' ||
    typeof record.password !== 'string'
  ) {
    throw new AuthenticationError(400, 'INVALID_REQUEST', INVALID_REQUEST_MESSAGE);
  }
  const email = record.email.trim().toLowerCase();
  if (
    email.length === 0 ||
    email.length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(email) ||
    containsControlCharacter(email) ||
    Array.from(record.password).length < 1 ||
    Array.from(record.password).length > 128 ||
    containsControlCharacter(record.password)
  ) {
    throw new AuthenticationError(400, 'INVALID_REQUEST', INVALID_REQUEST_MESSAGE);
  }
  return { email, password: record.password };
}

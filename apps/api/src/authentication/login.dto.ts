import { ApiProperty } from '@nestjs/swagger';

import {
  isValidAdminEmail,
  isValidAdminPassword,
  isValidAdminUsername,
  normalizeAdminEmail,
  normalizeAdminUsername,
} from '../administration/admin-credential-policy.js';
import { AuthenticationError } from './authentication.errors.js';
import { INVALID_REQUEST_MESSAGE } from './authentication.constants.js';
import { CurrentAuthenticationResponseDto } from './protected-authentication.dto.js';

export class LoginRequestDto {
  @ApiProperty({
    description: 'Canonical Admin email address or username.',
    example: 'admin_user',
    maxLength: 254,
  })
  identifier!: string;

  @ApiProperty({
    description: 'Exactly six ASCII digits. Never logged or echoed.',
    minLength: 6,
    maxLength: 6,
    pattern: '^[0-9]{6}$',
  })
  password!: string;
}

export class LoginResponseDto extends CurrentAuthenticationResponseDto {
  @ApiProperty({
    description: 'Session-bound 256-bit CSRF token also issued as a readable cookie.',
  })
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
  readonly identifier: string;
  readonly identifierKind: 'email' | 'username';
  readonly password: string;
}

export function parseLoginRequest(body: unknown): LoginInput {
  if (body === null || Array.isArray(body) || typeof body !== 'object') {
    throw new AuthenticationError(400, 'INVALID_REQUEST', INVALID_REQUEST_MESSAGE);
  }
  const record = body as Record<string, unknown>;
  if (
    Object.keys(record).length !== 2 ||
    typeof record.identifier !== 'string' ||
    typeof record.password !== 'string'
  ) {
    throw new AuthenticationError(400, 'INVALID_REQUEST', INVALID_REQUEST_MESSAGE);
  }
  const identifierKind = record.identifier.includes('@') ? 'email' : 'username';
  const identifier =
    identifierKind === 'email'
      ? normalizeAdminEmail(record.identifier)
      : normalizeAdminUsername(record.identifier);
  const validIdentifier =
    identifierKind === 'email' ? isValidAdminEmail(identifier) : isValidAdminUsername(identifier);
  if (!validIdentifier || !isValidAdminPassword(record.password)) {
    throw new AuthenticationError(400, 'INVALID_REQUEST', INVALID_REQUEST_MESSAGE);
  }
  return { identifier, identifierKind, password: record.password };
}

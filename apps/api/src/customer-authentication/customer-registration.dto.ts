import { ApiProperty } from '@nestjs/swagger';

import { CUSTOMER_NAME_INVALID_MESSAGE } from './customer-authentication.constants.js';
import { CustomerAuthenticationError } from './customer-authentication.errors.js';
import { CustomerSnapshotDto } from './otp-verification.dto.js';

const CUSTOMER_NAME_MIN_LENGTH = 2;
const CUSTOMER_NAME_MAX_LENGTH = 50;
const CUSTOMER_NAME_PATTERN = /^[\p{L}\p{M}]+(?:[ '\u200C’-][\p{L}\p{M}]+)*$/u;

export class CustomerRegistrationRequestDto {
  @ApiProperty({ example: 'علی', minLength: 2, maxLength: 50 })
  firstName!: string;

  @ApiProperty({ example: 'احمدی', minLength: 2, maxLength: 50 })
  lastName!: string;
}

export class CustomerRegistrationResponseDto {
  @ApiProperty({ enum: ['AUTHENTICATED'] })
  nextStep!: 'AUTHENTICATED';

  @ApiProperty({ example: '/' })
  redirectTo!: '/';

  @ApiProperty({ type: CustomerSnapshotDto })
  customer!: CustomerSnapshotDto;
}

export interface CustomerRegistrationInput {
  readonly firstName: string;
  readonly lastName: string;
}

// نام‌ها را با حفظ نویسه‌های معتبر فارسی و فاصله‌های معنایی به مقدار قابل ذخیره‌سازی تبدیل می‌کند.
export function parseCustomerRegistration(body: unknown): CustomerRegistrationInput {
  if (body === null || Array.isArray(body) || typeof body !== 'object') {
    throw invalidName();
  }
  const record = body as Record<string, unknown>;
  if (
    Object.keys(record).length !== 2 ||
    typeof record.firstName !== 'string' ||
    typeof record.lastName !== 'string'
  ) {
    throw invalidName();
  }
  const firstName = normalizeName(record.firstName);
  const lastName = normalizeName(record.lastName);
  if (!isValidName(firstName) || !isValidName(lastName)) throw invalidName();
  return { firstName, lastName };
}

// فاصله‌های ورودی را بدون دست‌کاری حروف، نشانه‌ها و نیم‌فاصله یکدست می‌کند.
function normalizeName(value: string): string {
  return value.normalize('NFC').trim().replace(/\s+/gu, ' ');
}

// طول را بر پایه code point و محتوا را فقط بر پایه نویسه‌های معتبر نام می‌سنجد.
function isValidName(value: string): boolean {
  const length = Array.from(value).length;
  return (
    length >= CUSTOMER_NAME_MIN_LENGTH &&
    length <= CUSTOMER_NAME_MAX_LENGTH &&
    CUSTOMER_NAME_PATTERN.test(value)
  );
}

function invalidName(): CustomerAuthenticationError {
  return new CustomerAuthenticationError(
    422,
    'CUSTOMER_NAME_INVALID',
    CUSTOMER_NAME_INVALID_MESSAGE,
  );
}

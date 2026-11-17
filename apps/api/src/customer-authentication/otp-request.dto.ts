import { ApiProperty } from '@nestjs/swagger';

import { MOBILE_INVALID_MESSAGE } from './customer-authentication.constants.js';
import { CustomerAuthenticationError } from './customer-authentication.errors.js';

export class OtpRequestDto {
  @ApiProperty({
    description: 'Iranian mobile number in local or canonical international form.',
    example: '09217101700',
  })
  mobile!: string;
}

export class OtpRequestResponseDto {
  @ApiProperty({ enum: ['OTP_PENDING'], example: 'OTP_PENDING' })
  stage!: 'OTP_PENDING';

  @ApiProperty({ example: '09*****1700' })
  maskedMobile!: string;

  @ApiProperty({ format: 'date-time' })
  expiresAt!: string;

  @ApiProperty({ format: 'date-time' })
  resendAvailableAt!: string;
}

export interface OtpRequestInput {
  readonly mobile: string;
}

// ارقام فارسی و عربی و قالب‌های رایج شماره ایران را به یک مقدار canonical تبدیل می‌کند.
export function parseOtpRequest(body: unknown): OtpRequestInput {
  if (body === null || Array.isArray(body) || typeof body !== 'object') {
    throw new CustomerAuthenticationError(422, 'MOBILE_INVALID', MOBILE_INVALID_MESSAGE);
  }
  const record = body as Record<string, unknown>;
  if (Object.keys(record).length !== 1 || typeof record.mobile !== 'string') {
    throw new CustomerAuthenticationError(422, 'MOBILE_INVALID', MOBILE_INVALID_MESSAGE);
  }
  const normalizedDigits = record.mobile
    .trim()
    .replace(/[۰-۹]/gu, (digit) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(digit)))
    .replace(/[٠-٩]/gu, (digit) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit)));
  const localMatch = /^09\d{9}$/u.test(normalizedDigits);
  const internationalMatch = /^\+989\d{9}$/u.test(normalizedDigits);
  const prefixedMatch = /^00989\d{9}$/u.test(normalizedDigits);
  if (!localMatch && !internationalMatch && !prefixedMatch) {
    throw new CustomerAuthenticationError(422, 'MOBILE_INVALID', MOBILE_INVALID_MESSAGE);
  }
  if (localMatch) return { mobile: `+98${normalizedDigits.slice(1)}` };
  if (prefixedMatch) return { mobile: `+${normalizedDigits.slice(2)}` };
  return { mobile: normalizedDigits };
}

export function maskMobile(mobile: string): string {
  const local = `0${mobile.slice(3)}`;
  return `${local.slice(0, 2)}*****${local.slice(-4)}`;
}

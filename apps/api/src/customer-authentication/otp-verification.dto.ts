import { ApiProperty } from '@nestjs/swagger';

export class OtpVerificationRequestDto {
  @ApiProperty({
    description: 'Exactly six digits; Persian and Arabic digits are normalized server-side.',
    example: '123456',
    minLength: 6,
    maxLength: 6,
    pattern: '^[0-9]{6}$',
  })
  code!: string;
}

export class CustomerSnapshotDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: '+989217101700' })
  mobile!: string;

  @ApiProperty({ example: 'علی' })
  firstName!: string;

  @ApiProperty({ example: 'احمدی' })
  lastName!: string;
}

export class OtpAuthenticatedResponseDto {
  @ApiProperty({ enum: ['AUTHENTICATED'] })
  nextStep!: 'AUTHENTICATED';

  @ApiProperty({ type: CustomerSnapshotDto })
  customer!: CustomerSnapshotDto;
}

export class OtpRegistrationRequiredResponseDto {
  @ApiProperty({ enum: ['REGISTRATION_REQUIRED'] })
  nextStep!: 'REGISTRATION_REQUIRED';
}

export type OtpVerificationResponse =
  | OtpAuthenticatedResponseDto
  | OtpRegistrationRequiredResponseDto;

export interface ParsedOtpVerification {
  readonly code: string;
  readonly validFormat: boolean;
}

// قالب درخواست را بدون خروج زودهنگام به ورودی ثابت برای مقایسه امن تبدیل می‌کند.
export function parseOtpVerification(body: unknown): ParsedOtpVerification {
  if (body === null || Array.isArray(body) || typeof body !== 'object') {
    return { code: '000000', validFormat: false };
  }
  const record = body as Record<string, unknown>;
  if (Object.keys(record).length !== 1 || typeof record.code !== 'string') {
    return { code: '000000', validFormat: false };
  }
  const normalized = record.code
    .replace(/[۰-۹]/gu, (digit) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(digit)))
    .replace(/[٠-٩]/gu, (digit) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit)));
  return /^\d{6}$/u.test(normalized)
    ? { code: normalized, validFormat: true }
    : { code: '000000', validFormat: false };
}

import { ApiProperty } from '@nestjs/swagger';

import { CustomerSnapshotDto } from './otp-verification.dto.js';

export class CustomerSessionBootstrapResponseDto {
  @ApiProperty({ type: CustomerSnapshotDto })
  customer!: CustomerSnapshotDto;

  @ApiProperty({ description: 'Stable session-bound CSRF token also issued as a readable cookie.' })
  csrfToken!: string;
}

export class CustomerMobileRequiredFlowDto {
  @ApiProperty({ enum: ['MOBILE_REQUIRED'] })
  stage!: 'MOBILE_REQUIRED';
}

export class CustomerOtpPendingFlowDto {
  @ApiProperty({ enum: ['OTP_PENDING'] })
  stage!: 'OTP_PENDING';

  @ApiProperty({ example: '09*****1700' })
  maskedMobile!: string;

  @ApiProperty({ format: 'date-time' })
  expiresAt!: string;

  @ApiProperty({ format: 'date-time' })
  resendAvailableAt!: string;
}

export class CustomerRegistrationRequiredFlowDto {
  @ApiProperty({ enum: ['REGISTRATION_REQUIRED'] })
  stage!: 'REGISTRATION_REQUIRED';

  @ApiProperty({ format: 'date-time' })
  expiresAt!: string;
}

export class CustomerAuthenticatedFlowDto {
  @ApiProperty({ enum: ['AUTHENTICATED'] })
  stage!: 'AUTHENTICATED';
}

export type CustomerFlowResponse =
  | CustomerMobileRequiredFlowDto
  | CustomerOtpPendingFlowDto
  | CustomerRegistrationRequiredFlowDto
  | CustomerAuthenticatedFlowDto;

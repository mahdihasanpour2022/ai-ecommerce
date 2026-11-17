import { Injectable } from '@nestjs/common';

import {
  AUTH_FLOW_INVALID_MESSAGE,
  CUSTOMER_ACCOUNT_DISABLED_MESSAGE,
  OTP_ATTEMPTS_EXCEEDED_MESSAGE,
  OTP_EXPIRED_MESSAGE,
  OTP_INVALID_MESSAGE,
} from './customer-authentication.constants.js';
import { CustomerAuthenticationError } from './customer-authentication.errors.js';
import type { ParsedOtpVerification } from './otp-verification.dto.js';
import {
  OtpVerificationRepository,
  type CustomerSnapshot,
} from './otp-verification.repository.js';
import type { IssuedCustomerSession } from './customer-session.crypto.js';
import { OtpRequestCrypto } from './otp-request.crypto.js';

export type OtpVerificationResult =
  | {
      readonly nextStep: 'AUTHENTICATED';
      readonly customer: CustomerSnapshot;
      readonly credentials: IssuedCustomerSession;
    }
  | {
      readonly nextStep: 'REGISTRATION_REQUIRED';
      readonly flowToken: string;
      readonly expiresAt: Date;
    };

@Injectable()
export class OtpVerificationService {
  constructor(
    private readonly crypto: OtpRequestCrypto,
    private readonly repository: OtpVerificationRepository,
  ) {}

  // تصمیم‌های داخلی تراکنش را فقط به قرارداد عمومی و خطاهای امن تبدیل می‌کند.
  async verify(
    flowToken: string,
    input: ParsedOtpVerification,
  ): Promise<OtpVerificationResult> {
    const decision = await this.repository.verify(
      this.crypto.flowTokenHash(flowToken),
      input.code,
      input.validFormat,
    );
    switch (decision.kind) {
      case 'flow_invalid':
        throw new CustomerAuthenticationError(401, 'AUTH_FLOW_INVALID', AUTH_FLOW_INVALID_MESSAGE);
      case 'expired':
        throw new CustomerAuthenticationError(410, 'OTP_EXPIRED', OTP_EXPIRED_MESSAGE);
      case 'invalid_code':
        throw new CustomerAuthenticationError(422, 'OTP_INVALID', OTP_INVALID_MESSAGE);
      case 'attempts_exceeded':
        throw new CustomerAuthenticationError(
          429,
          'OTP_ATTEMPTS_EXCEEDED',
          OTP_ATTEMPTS_EXCEEDED_MESSAGE,
        );
      case 'account_disabled':
        throw new CustomerAuthenticationError(
          403,
          'CUSTOMER_ACCOUNT_DISABLED',
          CUSTOMER_ACCOUNT_DISABLED_MESSAGE,
        );
      case 'authenticated':
        return {
          nextStep: 'AUTHENTICATED',
          customer: decision.customer,
          credentials: decision.credentials,
        };
      case 'registration_required':
        return {
          nextStep: 'REGISTRATION_REQUIRED',
          flowToken: decision.flowToken,
          expiresAt: decision.expiresAt,
        };
    }
  }
}

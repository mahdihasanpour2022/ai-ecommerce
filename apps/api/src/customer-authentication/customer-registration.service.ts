import { Injectable } from '@nestjs/common';

import {
  AUTH_FLOW_INVALID_MESSAGE,
  CUSTOMER_ACCOUNT_DISABLED_MESSAGE,
  REGISTRATION_GRANT_EXPIRED_MESSAGE,
} from './customer-authentication.constants.js';
import { CustomerAuthenticationError } from './customer-authentication.errors.js';
import type { CustomerRegistrationInput } from './customer-registration.dto.js';
import {
  CustomerRegistrationRepository,
  type CustomerRegistrationDecision,
} from './customer-registration.repository.js';
import { OtpRequestCrypto } from './otp-request.crypto.js';

type SuccessfulRegistration = Extract<CustomerRegistrationDecision, { kind: 'authenticated' }>;

@Injectable()
export class CustomerRegistrationService {
  constructor(
    private readonly crypto: OtpRequestCrypto,
    private readonly repository: CustomerRegistrationRepository,
  ) {}

  // نتیجه تراکنش ثبت‌نام را به قرارداد موفق یا خطای عمومی و امن تبدیل می‌کند.
  async register(
    flowToken: string,
    input: CustomerRegistrationInput,
  ): Promise<SuccessfulRegistration> {
    const decision = await this.repository.complete(this.crypto.flowTokenHash(flowToken), input);
    switch (decision.kind) {
      case 'flow_invalid':
        throw new CustomerAuthenticationError(401, 'AUTH_FLOW_INVALID', AUTH_FLOW_INVALID_MESSAGE);
      case 'expired':
        throw new CustomerAuthenticationError(
          410,
          'REGISTRATION_GRANT_EXPIRED',
          REGISTRATION_GRANT_EXPIRED_MESSAGE,
        );
      case 'account_disabled':
        throw new CustomerAuthenticationError(
          403,
          'CUSTOMER_ACCOUNT_DISABLED',
          CUSTOMER_ACCOUNT_DISABLED_MESSAGE,
        );
      case 'authenticated':
        return decision;
    }
  }
}

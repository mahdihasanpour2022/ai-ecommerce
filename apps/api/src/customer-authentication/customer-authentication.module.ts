import { Module } from '@nestjs/common';

import type { ApiEnvironment } from '../config/environment.js';
import { API_ENVIRONMENT } from '../config/tokens.js';
import { GhasedakOtpSender } from './ghasedak-otp.sender.js';
import { OTP_SENDER } from './otp-sender.js';

// Provider واقعی پشت توکن خنثی قرار می‌گیرد تا مصرف‌کننده به قاصدک وابسته نشود.
const otpSenderProvider = {
  provide: OTP_SENDER,
  inject: [API_ENVIRONMENT],
  useFactory: (environment: ApiEnvironment): GhasedakOtpSender =>
    new GhasedakOtpSender(environment.otpProvider),
};

@Module({
  providers: [otpSenderProvider],
  exports: [OTP_SENDER],
})
export class CustomerAuthenticationModule {}

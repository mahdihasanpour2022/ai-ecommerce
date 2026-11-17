import { Module } from '@nestjs/common';

import { AuthenticationModule } from '../authentication/authentication.module.js';
import type { ApiEnvironment } from '../config/environment.js';
import { API_ENVIRONMENT } from '../config/tokens.js';
import { DatabaseModule } from '../database/database.module.js';
import { CustomerAuthenticationController } from './customer-authentication.controller.js';
import { CustomerSessionCrypto } from './customer-session.crypto.js';
import { GhasedakOtpSender } from './ghasedak-otp.sender.js';
import { OtpRequestCrypto } from './otp-request.crypto.js';
import { OtpRequestRepository } from './otp-request.repository.js';
import { OtpRequestSecurity } from './otp-request.security.js';
import { OtpRequestService } from './otp-request.service.js';
import { OtpVerificationRepository } from './otp-verification.repository.js';
import { OtpVerificationSecurity } from './otp-verification.security.js';
import { OtpVerificationService } from './otp-verification.service.js';
import { OTP_SENDER } from './otp-sender.js';

// Provider واقعی پشت توکن خنثی قرار می‌گیرد تا مصرف‌کننده به قاصدک وابسته نشود.
const otpSenderProvider = {
  provide: OTP_SENDER,
  inject: [API_ENVIRONMENT],
  useFactory: (environment: ApiEnvironment): GhasedakOtpSender =>
    new GhasedakOtpSender(environment.otpProvider),
};

@Module({
  imports: [AuthenticationModule, DatabaseModule],
  controllers: [CustomerAuthenticationController],
  providers: [
    otpSenderProvider,
    CustomerSessionCrypto,
    OtpRequestCrypto,
    OtpRequestRepository,
    OtpRequestSecurity,
    OtpRequestService,
    OtpVerificationRepository,
    OtpVerificationSecurity,
    OtpVerificationService,
  ],
  exports: [OTP_SENDER],
})
export class CustomerAuthenticationModule {}

import { Inject, Injectable } from '@nestjs/common';

import {
  OTP_LIFETIME_SECONDS,
  OTP_RESEND_SECONDS,
} from './customer-authentication.constants.js';
import { OtpRequestCrypto } from './otp-request.crypto.js';
import { OtpRequestRepository } from './otp-request.repository.js';
import { OTP_SENDER, type OtpSender } from './otp-sender.js';

export interface OtpRequestResult {
  readonly deliveryStatus: 'ACCEPTED' | 'REJECTED' | 'UNKNOWN';
  readonly flowToken: string;
  readonly mobile: string;
  readonly expiresAt: Date;
  readonly resendAvailableAt: Date;
}

@Injectable()
export class OtpRequestService {
  constructor(
    private readonly crypto: OtpRequestCrypto,
    private readonly repository: OtpRequestRepository,
    @Inject(OTP_SENDER) private readonly sender: OtpSender,
  ) {}

  // چالش را پیش از تماس خارجی ذخیره و نتیجه ارسال را با همان رکورد تطبیق می‌دهد.
  async request(mobile: string, now = new Date()): Promise<OtpRequestResult> {
    const secrets = this.crypto.issue(mobile);
    const expiresAt = new Date(now.getTime() + OTP_LIFETIME_SECONDS * 1000);
    const resendAvailableAt = new Date(now.getTime() + OTP_RESEND_SECONDS * 1000);
    await this.repository.prepare({
      challengeId: secrets.challengeId,
      clientReferenceId: secrets.clientReferenceId,
      flowTokenHash: secrets.flowTokenHash,
      mobile,
      mobileKey: secrets.mobileKey,
      otpDigest: secrets.otpDigest,
      expiresAt,
      resendAvailableAt,
      now,
    });
    const outcome = await this.sender.send({
      mobile,
      code: secrets.code,
      clientReferenceId: secrets.clientReferenceId,
    });
    await this.repository.reconcile(secrets.challengeId, outcome.status, now);
    return {
      deliveryStatus: outcome.status,
      flowToken: secrets.flowToken,
      mobile,
      expiresAt,
      resendAvailableAt,
    };
  }
}

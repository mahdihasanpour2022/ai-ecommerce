import type {
  OtpSender,
  SendOtpCommand,
  SendOtpOutcome,
} from '../../src/customer-authentication/otp-sender.js';

export class FakeOtpSender implements OtpSender {
  readonly commands: SendOtpCommand[] = [];

  constructor(private outcome: SendOtpOutcome = { status: 'ACCEPTED' }) {}

  // فرمان‌ها را بدون ارسال شبکه ثبت و نتیجه قابل‌کنترل تست را برمی‌گرداند.
  async send(command: SendOtpCommand): Promise<SendOtpOutcome> {
    this.commands.push({ ...command });
    return this.outcome;
  }

  setOutcome(outcome: SendOtpOutcome): void {
    this.outcome = outcome;
  }
}

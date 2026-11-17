import type { OtpProviderEnvironment } from '../config/environment.js';
import type { OtpSender, SendOtpCommand, SendOtpOutcome } from './otp-sender.js';

const GHASEDAK_OTP_URL =
  'https://gateway.ghasedak.me/rest/api/v1/WebService/SendOtpSMS';
const REQUEST_TIMEOUT_MS = 8_000;
const MAX_RESPONSE_BYTES = 32_768;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;

type FetchRequest = typeof globalThis.fetch;

export class GhasedakOtpSender implements OtpSender {
  constructor(
    private readonly environment: OtpProviderEnvironment,
    private readonly request: FetchRequest = globalThis.fetch,
  ) {}

  // درخواست قاصدک را یک‌بار ارسال می‌کند و وضعیت مبهم را هرگز به موفقیت تبدیل نمی‌کند.
  async send(command: SendOtpCommand): Promise<SendOtpOutcome> {
    const mobile = toProviderMobile(command.mobile);
    if (
      mobile === null ||
      !/^\d{6}$/u.test(command.code) ||
      !UUID_PATTERN.test(command.clientReferenceId)
    ) {
      return { status: 'REJECTED' };
    }

    try {
      const response = await this.request(GHASEDAK_OTP_URL, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'ApiKey': this.environment.ghasedakApiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sendDate: null,
          receptors: [{ mobile, clientReferenceId: command.clientReferenceId }],
          templateName: this.environment.ghasedakTemplateName,
          inputs: [{ param: 'Code', value: command.code }],
          isVoice: false,
        }),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });

      if (response.status >= 500) return { status: 'UNKNOWN' };
      if (!response.ok) return { status: 'REJECTED' };

      const responseText = await response.text();
      if (Buffer.byteLength(responseText, 'utf8') > MAX_RESPONSE_BYTES) {
        return { status: 'UNKNOWN' };
      }
      const providerAccepted = readProviderAcceptance(responseText);
      if (providerAccepted === null) return { status: 'UNKNOWN' };
      return { status: providerAccepted ? 'ACCEPTED' : 'REJECTED' };
    } catch {
      return { status: 'UNKNOWN' };
    }
  }
}

// موبایل canonical داخلی را فقط در مرز provider به قالب 09 تبدیل می‌کند.
function toProviderMobile(mobile: string): string | null {
  const match = /^\+98(9\d{9})$/u.exec(mobile);
  return match === null ? null : `0${match[1]}`;
}

// تنها پاسخ JSON با فلگ و کد وضعیت صریح مستندشده را معتبر می‌داند.
function readProviderAcceptance(responseText: string): boolean | null {
  let body: unknown;
  try {
    body = JSON.parse(responseText) as unknown;
  } catch {
    return null;
  }
  if (body === null || Array.isArray(body) || typeof body !== 'object') return null;
  const record = body as Record<string, unknown>;
  const isSuccess = record.IsSuccess ?? record.isSuccess;
  const statusCode = record.StatusCode ?? record.statusCode;
  if (typeof isSuccess !== 'boolean' || typeof statusCode !== 'number') return null;
  if (!isSuccess) return false;
  return statusCode === 200 ? true : null;
}

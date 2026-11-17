import { randomInt, randomUUID } from 'node:crypto';

import { GhasedakOtpSender } from '../dist/customer-authentication/ghasedak-otp.sender.js';

const apiKey = process.env.GHASEDAK_API_KEY ?? '';
const templateName = process.env.GHASEDAK_OTP_TEMPLATE_NAME ?? '';
const configuredMobile = (process.env.GHASEDAK_SANDBOX_MOBILE ?? '').trim();

// شماره محلی sandbox فقط برای ورود به مرز داخلی به قالب canonical تبدیل می‌شود.
const mobile = /^09[0-9]{9}$/u.test(configuredMobile)
  ? `+98${configuredMobile.slice(1)}`
  : configuredMobile;

if (apiKey.length === 0) throw new Error('Missing GHASEDAK_API_KEY.');
if (!/^[A-Za-z0-9_-]{1,100}$/u.test(templateName)) {
  throw new Error('Invalid GHASEDAK_OTP_TEMPLATE_NAME.');
}
if (!/^\+989[0-9]{9}$/u.test(mobile)) throw new Error('Invalid GHASEDAK_SANDBOX_MOBILE.');

const reference = randomUUID();
const sender = new GhasedakOtpSender({
  ghasedakApiKey: apiKey,
  ghasedakTemplateName: templateName,
});

const outcome = await sender.send({
  mobile,
  code: String(randomInt(100_000, 1_000_000)),
  clientReferenceId: reference,
});

// خروجی دستی فقط شواهد ماسک‌شده را نگه می‌دارد و هیچ secret یا OTP را چاپ نمی‌کند.
const providerMobile = mobile.replace(/^\+98/u, '0');
console.log({
  templateName,
  receptor: `${providerMobile.slice(0, 4)}***${providerMobile.slice(-4)}`,
  clientReferenceId: `${reference.slice(0, 8)}…`,
  providerStatus: outcome.status,
});

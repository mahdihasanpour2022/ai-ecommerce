const apiKey = process.env.GHASEDAK_API_KEY ?? '';
const templateName = process.env.GHASEDAK_OTP_TEMPLATE_NAME ?? '';

if (apiKey.length === 0) throw new Error('Missing GHASEDAK_API_KEY.');
if (!/^[A-Za-z0-9_-]{1,100}$/u.test(templateName)) {
  throw new Error('Invalid GHASEDAK_OTP_TEMPLATE_NAME.');
}

const url = new URL(
  'https://gateway.ghasedak.me/rest/api/v1/WebService/GetOtpTemplateParameters',
);
url.searchParams.set('TemplateName', templateName);
const response = await fetch(url, {
  headers: { Accept: 'application/json', ApiKey: apiKey },
  signal: AbortSignal.timeout(8_000),
});
const responseText = await response.text();
let body = null;
try {
  body = JSON.parse(responseText);
} catch {
  body = null;
}

// تشخیص قالب فقط وضعیت‌های غیرمحرمانه را ثبت می‌کند و متن پاسخ provider را بازتاب نمی‌دهد.
const record = body !== null && !Array.isArray(body) && typeof body === 'object' ? body : {};
const parameters = record.Params ?? record.params;
console.log({
  templateName,
  httpStatus: response.status,
  isSuccess: record.IsSuccess ?? record.isSuccess ?? null,
  providerStatusCode: record.StatusCode ?? record.statusCode ?? null,
  parameterNames: Array.isArray(parameters)
    ? parameters.filter((parameter) => typeof parameter === 'string')
    : [],
});

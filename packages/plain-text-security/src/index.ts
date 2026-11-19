export type PlainTextInvalidReason =
  | 'DISALLOWED_CONTROL_CHARACTER'
  | 'HTML_MARKUP'
  | 'EXECUTABLE_PROTOCOL'
  | 'HTML_EVENT_HANDLER'
  | 'SCRIPT_EXECUTION';

export type PlainTextValidationResult =
  | { readonly valid: true; readonly value: string }
  | { readonly valid: false; readonly reason: PlainTextInvalidReason };

const DISALLOWED_CONTROL_PATTERN =
  /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F\u200B\u200E\u200F\u202A-\u202E\u2060\u2066-\u2069\uFEFF]/u;

// این امضاها فقط ساختارهای اجرایی رایج را هدف می‌گیرند و واژه‌های عادی را رد نمی‌کنند.
const HTML_MARKUP_PATTERN = /<\s*\/?\s*[a-z][^>]*>|<!--[\s\S]*?-->|<!doctype\b[^>]*>/iu;
const EXECUTABLE_PROTOCOL_PATTERN =
  /\b(?:javascript|vbscript)\s*:|\bdata\s*:\s*(?:text\/html|image\/svg\+xml)/iu;
const HTML_EVENT_HANDLER_PATTERN =
  /\bon(?:abort|animationend|animationiteration|animationstart|beforeinput|blur|change|click|error|focus|input|keydown|keypress|keyup|load|mousedown|mouseenter|mouseleave|mousemove|mouseout|mouseover|mouseup|pointercancel|pointerdown|pointerenter|pointerleave|pointermove|pointerout|pointerover|pointerup|reset|resize|scroll|submit|touchcancel|touchend|touchmove|touchstart|wheel)\s*=/iu;
const SCRIPT_EXECUTION_PATTERN =
  /\b(?:eval|setInterval|setTimeout|Function)\s*\(|\b(?:document\s*\.\s*(?:write|writeln)|window\s*\.\s*(?:eval|open))\s*\(|\b(?:innerHTML|outerHTML)\s*=/iu;

// متن را بدون حذف بی‌صدای نویسه‌های کنترلی به نمایش Unicode و فاصله‌گذاری پایدار تبدیل می‌کند.
function normalizePlainText(value: string): PlainTextValidationResult {
  const unicodeNormalized = value.normalize('NFKC');

  if (DISALLOWED_CONTROL_PATTERN.test(unicodeNormalized)) {
    return { valid: false, reason: 'DISALLOWED_CONTROL_CHARACTER' };
  }

  return { valid: true, value: unicodeNormalized.trim().replace(/\s+/gu, ' ') };
}

// ورودی متنی را به نتیجه‌ای محدود و قابل‌آزمون تبدیل می‌کند تا جزئیات امضاها به مصرف‌کننده نشت نکند.
export function validatePlainText(value: string): PlainTextValidationResult {
  const normalized = normalizePlainText(value);
  if (!normalized.valid) return normalized;

  if (HTML_MARKUP_PATTERN.test(normalized.value)) {
    return { valid: false, reason: 'HTML_MARKUP' };
  }
  if (EXECUTABLE_PROTOCOL_PATTERN.test(normalized.value)) {
    return { valid: false, reason: 'EXECUTABLE_PROTOCOL' };
  }
  if (HTML_EVENT_HANDLER_PATTERN.test(normalized.value)) {
    return { valid: false, reason: 'HTML_EVENT_HANDLER' };
  }
  if (SCRIPT_EXECUTION_PATTERN.test(normalized.value)) {
    return { valid: false, reason: 'SCRIPT_EXECUTION' };
  }

  return normalized;
}

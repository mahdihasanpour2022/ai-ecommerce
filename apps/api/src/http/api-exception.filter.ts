import { ArgumentsHost, Catch, HttpException, HttpStatus } from '@nestjs/common';
import type { ExceptionFilter } from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';

import type { ApiResponse } from './api-response.js';

const FALLBACKS: Readonly<Record<number, { readonly code: string; readonly message: string }>> = {
  400: { code: 'BAD_REQUEST', message: 'درخواست ارسال‌شده معتبر نیست.' },
  401: { code: 'UNAUTHORIZED', message: 'برای انجام این درخواست باید وارد حساب شوید.' },
  403: { code: 'FORBIDDEN', message: 'اجازه انجام این درخواست را ندارید.' },
  404: { code: 'NOT_FOUND', message: 'منبع درخواستی پیدا نشد.' },
  409: { code: 'CONFLICT', message: 'درخواست با وضعیت فعلی منبع سازگار نیست.' },
  413: { code: 'PAYLOAD_TOO_LARGE', message: 'حجم اطلاعات ارسالی بیش از حد مجاز است.' },
  415: { code: 'UNSUPPORTED_MEDIA_TYPE', message: 'نوع فایل ارسالی پشتیبانی نمی‌شود.' },
  422: { code: 'VALIDATION_FAILED', message: 'اطلاعات واردشده معتبر نیست.' },
  429: { code: 'TOO_MANY_REQUESTS', message: 'تعداد درخواست‌ها بیش از حد مجاز است.' },
  503: { code: 'SERVICE_UNAVAILABLE', message: 'سرویس موقتاً در دسترس نیست.' },
};
const INTERNAL = { code: 'INTERNAL_SERVER_ERROR', message: 'خطای داخلی سرور رخ داد.' } as const;

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  constructor(private readonly adapterHost: HttpAdapterHost) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const response = http.getResponse<unknown>();
    const statusCode =
      exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const raw = exception instanceof HttpException ? exception.getResponse() : null;
    const body = buildErrorResponse(statusCode, raw);
    this.adapterHost.httpAdapter.reply(response, body, statusCode);
  }
}

export function buildErrorResponse(
  statusCode: number,
  raw: string | object | null,
): ApiResponse<null, null, unknown> {
  const record = typeof raw === 'object' && raw !== null ? (raw as Record<string, unknown>) : null;
  const fallback = FALLBACKS[statusCode] ?? INTERNAL;
  const message = record?.message;
  const code = record?.code;
  return {
    statusCode,
    hasError: true,
    message: typeof message === 'string' && message.trim().length > 0 ? message : fallback.message,
    code: typeof code === 'string' && /^[A-Z][A-Z0-9_]{0,127}$/u.test(code) ? code : fallback.code,
    count: 0,
    result: null,
    singleResult: null,
    details: record && 'details' in record ? (record.details ?? null) : null,
  };
}

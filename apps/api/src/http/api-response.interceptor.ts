import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Observable } from 'rxjs';
import { map } from 'rxjs';

import {
  API_SUCCESS_METADATA,
  RAW_API_RESPONSE_METADATA,
  type ApiResponse,
  type ApiSuccessMetadata,
} from './api-response.js';

const DEFAULT_SUCCESS: ApiSuccessMetadata = {
  code: 'OPERATION_SUCCESS',
  message: 'عملیات با موفقیت انجام شد.',
  kind: 'single',
};

@Injectable()
export class ApiResponseInterceptor implements NestInterceptor {
  constructor(private readonly reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const raw = this.reflector.getAllAndOverride<boolean>(RAW_API_RESPONSE_METADATA, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (raw) return next.handle();

    const metadata =
      this.reflector.getAllAndOverride<ApiSuccessMetadata>(API_SUCCESS_METADATA, [
        context.getHandler(),
        context.getClass(),
      ]) ?? DEFAULT_SUCCESS;
    const response = context.switchToHttp().getResponse<{ statusCode: number }>();

    return next
      .handle()
      .pipe(
        map((payload: unknown) => buildSuccessResponse(response.statusCode, metadata, payload)),
      );
  }
}

export function buildSuccessResponse(
  statusCode: number,
  metadata: ApiSuccessMetadata,
  payload: unknown,
): ApiResponse<unknown, unknown, null> {
  const collection = metadata.kind === 'collection';
  const single = metadata.kind === 'single';
  const count = collection
    ? Array.isArray(payload)
      ? payload.length
      : countFrom(payload, metadata.countProperty)
    : metadata.countProperty
      ? countFrom(payload, metadata.countProperty)
      : 0;

  return {
    statusCode,
    hasError: false,
    message: metadata.message,
    code: metadata.code,
    count,
    result: collection ? payload : null,
    singleResult: single ? payload : null,
    details: null,
  };
}

function countFrom(payload: unknown, property?: string): number {
  if (!property || typeof payload !== 'object' || payload === null) return 0;
  const value = (payload as Record<string, unknown>)[property];
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? value : 0;
}

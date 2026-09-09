import { SetMetadata } from '@nestjs/common';

export interface ApiResponse<Result = null, SingleResult = null, Details = null> {
  statusCode: number;
  hasError: boolean;
  message: string;
  code: string;
  count: number;
  result: Result;
  singleResult: SingleResult;
  details: Details;
}

export type ApiResponseKind = 'collection' | 'single' | 'none';

export interface ApiSuccessMetadata {
  readonly code: string;
  readonly message: string;
  readonly kind: ApiResponseKind;
  readonly countProperty?: string;
}

export const API_SUCCESS_METADATA = Symbol('api-success-metadata');
export const RAW_API_RESPONSE_METADATA = Symbol('raw-api-response-metadata');

export const ApiSuccess = (metadata: ApiSuccessMetadata): MethodDecorator =>
  SetMetadata(API_SUCCESS_METADATA, metadata);

export const RawApiResponse = (): MethodDecorator => SetMetadata(RAW_API_RESPONSE_METADATA, true);

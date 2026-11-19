import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { IncomingMessage } from 'node:http';

import type { CurrentCustomerAuthentication } from './customer-session.service.js';

export const CUSTOMER_AUTHENTICATION_CONTEXT = Symbol('CUSTOMER_AUTHENTICATION_CONTEXT');

export type CustomerAuthenticatedRequest = IncomingMessage & {
  [CUSTOMER_AUTHENTICATION_CONTEXT]?: CurrentCustomerAuthentication;
};

// هویت تأییدشده مشتری را فقط از context ساخته‌شده توسط guard در اختیار endpoint می‌گذارد.
export const CurrentCustomerContext = createParamDecorator(
  (_data: unknown, context: ExecutionContext): CurrentCustomerAuthentication => {
    const request = context.switchToHttp().getRequest<CustomerAuthenticatedRequest>();
    const authentication = request[CUSTOMER_AUTHENTICATION_CONTEXT];
    if (authentication === undefined) {
      throw new Error('Customer authentication context is unavailable.');
    }
    return authentication;
  },
);

// context اختیاری فقط هویت تأییدشده را برمی‌گرداند و برای مهمان مقدار null می‌دهد.
export const OptionalCurrentCustomerContext = createParamDecorator(
  (_data: unknown, context: ExecutionContext): CurrentCustomerAuthentication | null => {
    const request = context.switchToHttp().getRequest<CustomerAuthenticatedRequest>();
    return request[CUSTOMER_AUTHENTICATION_CONTEXT] ?? null;
  },
);

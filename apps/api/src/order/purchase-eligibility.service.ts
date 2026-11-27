import { Injectable } from '@nestjs/common';

import { OrderRepository } from './order.repository.js';

const CANONICAL_UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u;

@Injectable()
export class PurchaseEligibilityService {
  constructor(private readonly repository: OrderRepository) {}

  // ورودی نامعتبر را پیش از Query رد می‌کند و فقط تصمیم دامنه‌ای امن را برمی‌گرداند.
  canCustomerUsePurchasedProduct(customerId: string, productId: string): Promise<boolean> {
    if (!CANONICAL_UUID_PATTERN.test(customerId) || !CANONICAL_UUID_PATTERN.test(productId)) {
      return Promise.resolve(false);
    }

    return this.repository.hasEligiblePurchase(customerId, productId);
  }
}

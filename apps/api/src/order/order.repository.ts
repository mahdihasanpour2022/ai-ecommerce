import { Injectable } from '@nestjs/common';

import { PrismaService } from '../database/prisma.service.js';

@Injectable()
export class OrderRepository {
  constructor(private readonly prisma: PrismaService) {}

  // وجود خرید نهایی با کمیت خالص مثبت را بدون بارگذاری جزئیات خصوصی سفارش بررسی می‌کند.
  async hasEligiblePurchase(customerId: string, productId: string): Promise<boolean> {
    const [result] = await this.prisma.$queryRaw<Array<{ readonly eligible: boolean }>>`
      SELECT EXISTS (
        SELECT 1
        FROM orders purchase_order
        INNER JOIN order_items item ON item.order_id = purchase_order.id
        INNER JOIN product_variants variant ON variant.id = item.variant_id
        WHERE purchase_order.customer_id = ${customerId}::uuid
          AND purchase_order.status = 'FULFILLED'::order_status
          AND item.status = 'FULFILLED'::order_item_status
          AND variant.product_id = ${productId}::uuid
          AND item.fulfilled_quantity - item.refunded_quantity - item.returned_quantity > 0
      ) AS eligible
    `;

    return result?.eligible === true;
  }
}

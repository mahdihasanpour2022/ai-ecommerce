import assert from 'node:assert/strict';
import { randomInt, randomUUID } from 'node:crypto';
import { after, before, beforeEach, describe, test } from 'node:test';

import { OrderItemStatus, OrderStatus } from '../src/generated/prisma/enums.js';
import { PrismaService } from '../src/database/prisma.service.js';
import { OrderRepository } from '../src/order/order.repository.js';
import { PurchaseEligibilityService } from '../src/order/purchase-eligibility.service.js';
import { createTestEnvironment } from './test-environment.js';

const testDatabaseUrl = process.env.TEST_DATABASE_URL;

interface ProductFixture {
  readonly productId: string;
  readonly variantIds: readonly string[];
}

interface PurchaseInput {
  readonly customerId: string;
  readonly variantId: string;
  readonly orderStatus?: OrderStatus;
  readonly itemStatus?: OrderItemStatus;
  readonly fulfilledQuantity?: number;
  readonly refundedQuantity?: number;
  readonly returnedQuantity?: number;
}

// کلاینت واقعی را فقط به دیتابیس disposable تست متصل می‌کند.
function createClient(): PrismaService {
  assert.ok(testDatabaseUrl);
  return new PrismaService(
    createTestEnvironment('test', {
      DATABASE_URL: testDatabaseUrl,
    }),
  );
}

// دسترسی به Variant مورد انتظار را صریح می‌کند تا fixture ناقص بی‌صدا وارد سناریو نشود.
function variantId(product: ProductFixture, index = 0): string {
  const id = product.variantIds[index];
  assert.ok(id);
  return id;
}

void describe(
  'Order purchase eligibility PostgreSQL integration',
  { skip: testDatabaseUrl === undefined, concurrency: 1 },
  () => {
    let prisma: PrismaService;
    let eligibility: PurchaseEligibilityService;

    // داده‌های همین دامنه را با رعایت محدودیت‌های حذف و ترتیب وابستگی‌ها پاک می‌کند.
    async function cleanup(): Promise<void> {
      await prisma.$transaction(async (transaction) => {
        await transaction.orderItem.deleteMany();
        await transaction.order.deleteMany();
        await transaction.inventory.deleteMany();
        await transaction.productVariant.deleteMany();
        await transaction.product.deleteMany();
        await transaction.category.deleteMany();
        await transaction.customer.deleteMany();
      });
    }

    // مشتری مستقل می‌سازد تا جداسازی مالکیت خرید در Query قابل اثبات باشد.
    async function createCustomer(): Promise<string> {
      const customer = await prisma.customer.create({
        data: {
          mobile: `+989${randomInt(100_000_000, 1_000_000_000)}`,
          firstName: 'مشتری',
          lastName: 'آزمایشی',
        },
        select: { id: true },
      });
      return customer.id;
    }

    // محصولی با تعداد Variant مورد نیاز می‌سازد تا اتصال خرید به Product واقعی سنجیده شود.
    async function createProduct(variantCount = 1): Promise<ProductFixture> {
      const category = await prisma.category.create({
        data: {
          name: `Order Category ${randomUUID()}`,
          nameKey: `order-category-${randomUUID()}`,
        },
        select: { id: true },
      });
      const productId = randomUUID();
      const variantIds = Array.from({ length: variantCount }, () => randomUUID());
      await prisma.$transaction(async (transaction) => {
        await transaction.product.create({
          data: {
            id: productId,
            name: `Order Product ${randomUUID()}`,
            originalPriceRial: 1000n,
            categoryId: category.id,
          },
        });
        for (const [index, id] of variantIds.entries()) {
          const size = `Variant ${index + 1}`;
          await transaction.productVariant.create({
            data: {
              id,
              productId,
              sku: `ORDER-${randomUUID()}`.toUpperCase(),
              size,
              sizeKey: size.toLowerCase(),
              isActive: false,
            },
          });
          await transaction.inventory.create({ data: { variantId: id } });
        }
      });
      return { productId, variantIds };
    }

    // واقعیت سفارش را با lifecycle و کمیت‌های صریح برای هر سناریو ثبت می‌کند.
    async function createPurchase(input: PurchaseInput): Promise<{
      readonly orderId: string;
      readonly itemId: string;
    }> {
      const itemStatus = input.itemStatus ?? OrderItemStatus.FULFILLED;
      const itemCreatedAt = new Date();
      const order = await prisma.order.create({
        data: {
          customerId: input.customerId,
          status: input.orderStatus ?? OrderStatus.FULFILLED,
          items: {
            create: {
              variantId: input.variantId,
              status: itemStatus,
              fulfilledQuantity:
                input.fulfilledQuantity ??
                (itemStatus === OrderItemStatus.FULFILLED ? 1 : 0),
              refundedQuantity: input.refundedQuantity ?? 0,
              returnedQuantity: input.returnedQuantity ?? 0,
              fulfilledAt: itemStatus === OrderItemStatus.FULFILLED ? itemCreatedAt : null,
              createdAt: itemCreatedAt,
            },
          },
        },
        select: { id: true, items: { select: { id: true } } },
      });
      const item = order.items[0];
      assert.ok(item);
      return { orderId: order.id, itemId: item.id };
    }

    void before(async () => {
      prisma = createClient();
      eligibility = new PurchaseEligibilityService(new OrderRepository(prisma));
      await prisma.$connect();
    });

    void beforeEach(cleanup);

    void after(async () => {
      await cleanup();
      await prisma.$disconnect();
    });

    // قیود persistence باید داده ناسازگار را پیش از رسیدن به تصمیم eligibility رد کنند.
    void test('rejects negative fulfilled, refunded, and returned quantities', async () => {
      const customerId = await createCustomer();
      const product = await createProduct();
      const order = await prisma.order.create({
        data: { customerId },
        select: { id: true },
      });
      const baseData = { orderId: order.id, variantId: variantId(product) };

      await assert.rejects(
        prisma.orderItem.create({
          data: { ...baseData, fulfilledQuantity: -1 },
        }),
      );
      await assert.rejects(
        prisma.orderItem.create({
          data: {
            ...baseData,
            status: OrderItemStatus.FULFILLED,
            fulfilledQuantity: 1,
            refundedQuantity: -1,
            fulfilledAt: new Date(),
          },
        }),
      );
      await assert.rejects(
        prisma.orderItem.create({
          data: {
            ...baseData,
            status: OrderItemStatus.FULFILLED,
            fulfilledQuantity: 1,
            returnedQuantity: -1,
            fulfilledAt: new Date(),
          },
        }),
      );
    });

    void test('rejects refunded and returned quantities above fulfilled quantity', async () => {
      const customerId = await createCustomer();
      const product = await createProduct();
      const order = await prisma.order.create({
        data: { customerId },
        select: { id: true },
      });

      await assert.rejects(
        prisma.orderItem.create({
          data: {
            orderId: order.id,
            variantId: variantId(product),
            status: OrderItemStatus.FULFILLED,
            fulfilledQuantity: 2,
            refundedQuantity: 1,
            returnedQuantity: 2,
            fulfilledAt: new Date(),
          },
        }),
      );
    });

    void test('restricts deletion of Customer, Order, and ProductVariant with order history', async () => {
      const customerId = await createCustomer();
      const product = await createProduct();
      const purchase = await createPurchase({
        customerId,
        variantId: variantId(product),
      });

      await assert.rejects(prisma.customer.delete({ where: { id: customerId } }));
      await assert.rejects(prisma.order.delete({ where: { id: purchase.orderId } }));
      await assert.rejects(
        prisma.productVariant.delete({ where: { id: variantId(product) } }),
      );
      assert.equal(await prisma.orderItem.count({ where: { id: purchase.itemId } }), 1);
    });

    // تصمیم سرویس فقط از facts پایدار سفارش به‌دست می‌آید و همواره boolean باقی می‌ماند.
    void test('returns true for a fulfilled purchase with positive net quantity', async () => {
      const customerId = await createCustomer();
      const product = await createProduct();
      await createPurchase({ customerId, variantId: variantId(product) });

      const result = await eligibility.canCustomerUsePurchasedProduct(customerId, product.productId);
      assert.equal(result, true);
      assert.equal(typeof result, 'boolean');
    });

    void test('returns false for another Customer or Product', async () => {
      const customerId = await createCustomer();
      const otherCustomerId = await createCustomer();
      const purchasedProduct = await createProduct();
      const otherProduct = await createProduct();
      await createPurchase({ customerId, variantId: variantId(purchasedProduct) });

      assert.equal(
        await eligibility.canCustomerUsePurchasedProduct(
          otherCustomerId,
          purchasedProduct.productId,
        ),
        false,
      );
      assert.equal(
        await eligibility.canCustomerUsePurchasedProduct(customerId, otherProduct.productId),
        false,
      );
    });

    void test('returns false for pending, failed, and cancelled Orders', async () => {
      const customerId = await createCustomer();
      const product = await createProduct(3);
      const statuses = [OrderStatus.PENDING, OrderStatus.FAILED, OrderStatus.CANCELLED];

      for (const [index, status] of statuses.entries()) {
        await createPurchase({
          customerId,
          variantId: variantId(product, index),
          orderStatus: status,
        });
      }

      assert.equal(
        await eligibility.canCustomerUsePurchasedProduct(customerId, product.productId),
        false,
      );
    });

    void test('returns false when no quantity was fulfilled', async () => {
      const customerId = await createCustomer();
      const product = await createProduct();
      await createPurchase({
        customerId,
        variantId: variantId(product),
        itemStatus: OrderItemStatus.PENDING,
        fulfilledQuantity: 0,
      });

      assert.equal(
        await eligibility.canCustomerUsePurchasedProduct(customerId, product.productId),
        false,
      );
    });

    void test('returns false after a full refund or a full return', async () => {
      const customerId = await createCustomer();
      const product = await createProduct(2);
      await createPurchase({
        customerId,
        variantId: variantId(product),
        fulfilledQuantity: 2,
        refundedQuantity: 2,
      });
      await createPurchase({
        customerId,
        variantId: variantId(product, 1),
        fulfilledQuantity: 3,
        returnedQuantity: 3,
      });

      assert.equal(
        await eligibility.canCustomerUsePurchasedProduct(customerId, product.productId),
        false,
      );
    });

    void test('returns true after a partial refund or a partial return', async () => {
      const customerId = await createCustomer();
      const refundedProduct = await createProduct();
      const returnedProduct = await createProduct();
      await createPurchase({
        customerId,
        variantId: variantId(refundedProduct),
        fulfilledQuantity: 3,
        refundedQuantity: 1,
      });
      await createPurchase({
        customerId,
        variantId: variantId(returnedProduct),
        fulfilledQuantity: 3,
        returnedQuantity: 2,
      });

      assert.equal(
        await eligibility.canCustomerUsePurchasedProduct(customerId, refundedProduct.productId),
        true,
      );
      assert.equal(
        await eligibility.canCustomerUsePurchasedProduct(customerId, returnedProduct.productId),
        true,
      );
    });

    void test('returns true when only one of multiple Orders is eligible', async () => {
      const customerId = await createCustomer();
      const product = await createProduct(3);
      await createPurchase({
        customerId,
        variantId: variantId(product),
        orderStatus: OrderStatus.PENDING,
      });
      await createPurchase({
        customerId,
        variantId: variantId(product, 1),
        fulfilledQuantity: 1,
        refundedQuantity: 1,
      });
      await createPurchase({
        customerId,
        variantId: variantId(product, 2),
      });

      assert.equal(
        await eligibility.canCustomerUsePurchasedProduct(customerId, product.productId),
        true,
      );
    });

    void test('accepts a purchase of any Variant belonging to the Product', async () => {
      const customerId = await createCustomer();
      const product = await createProduct(2);
      await createPurchase({ customerId, variantId: variantId(product, 1) });

      assert.equal(
        await eligibility.canCustomerUsePurchasedProduct(customerId, product.productId),
        true,
      );
    });
  },
);

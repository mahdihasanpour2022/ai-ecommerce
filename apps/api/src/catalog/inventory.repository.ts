import { Injectable } from '@nestjs/common';

import { PrismaService } from '../database/prisma.service.js';
import type { Prisma } from '../generated/prisma/client.js';
import type { UpdateInventoryInput, UpdateInventoryResponseDto } from './inventory.dto.js';

type InventoryTransaction = Prisma.TransactionClient;

@Injectable()
export class InventoryRepository {
  constructor(private readonly prisma: PrismaService) {}

  transaction<T>(work: (transaction: InventoryTransaction) => Promise<T>): Promise<T> {
    return this.prisma.$transaction(work, { maxWait: 5000, timeout: 10000 });
  }

  async owningProductId(
    transaction: InventoryTransaction,
    variantId: string,
  ): Promise<string | undefined> {
    const variant = await transaction.productVariant.findUnique({
      where: { id: variantId },
      select: { productId: true },
    });
    return variant?.productId;
  }

  async lockProductStatus(
    transaction: InventoryTransaction,
    productId: string,
  ): Promise<string | undefined> {
    const rows = await transaction.$queryRaw<Array<{ status: string }>>`
      SELECT status::text AS status
      FROM products
      WHERE id = ${productId}::uuid
      FOR UPDATE
    `;
    return rows[0]?.status;
  }

  async update(
    transaction: InventoryTransaction,
    variantId: string,
    input: UpdateInventoryInput,
  ): Promise<UpdateInventoryResponseDto | undefined> {
    const rows = await transaction.$queryRaw<UpdateInventoryResponseDto[]>`
      UPDATE inventories
      SET on_hand_quantity = ${input.onHandQuantity},
          version = version + 1,
          updated_at = CURRENT_TIMESTAMP
      WHERE variant_id = ${variantId}::uuid
        AND version = ${input.version}
      RETURNING on_hand_quantity AS "onHandQuantity", version
    `;
    return rows[0];
  }

  async inventoryExists(transaction: InventoryTransaction, variantId: string): Promise<boolean> {
    return (await transaction.inventory.count({ where: { variantId } })) === 1;
  }
}

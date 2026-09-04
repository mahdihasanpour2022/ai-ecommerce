import { Injectable } from '@nestjs/common';

import type { UpdateInventoryInput, UpdateInventoryResponseDto } from './inventory.dto.js';
import { InventoryError } from './inventory.errors.js';
import { InventoryRepository } from './inventory.repository.js';

@Injectable()
export class InventoryService {
  constructor(private readonly repository: InventoryRepository) {}

  update(variantId: string, input: UpdateInventoryInput): Promise<UpdateInventoryResponseDto> {
    return this.repository.transaction(async (transaction) => {
      const productId = await this.repository.owningProductId(transaction, variantId);
      if (productId === undefined) throw new InventoryError('PRODUCT_VARIANT_NOT_FOUND');
      const status = await this.repository.lockProductStatus(transaction, productId);
      if (status === undefined) throw new InventoryError('PRODUCT_VARIANT_NOT_FOUND');
      if (status === 'ARCHIVED') throw new InventoryError('PRODUCT_LIFECYCLE_CONFLICT');

      const updated = await this.repository.update(transaction, variantId, input);
      if (updated !== undefined) {
        return {
          onHandQuantity: updated.onHandQuantity,
          version: updated.version,
        };
      }
      if (!(await this.repository.inventoryExists(transaction, variantId))) {
        throw new InventoryError('PRODUCT_VARIANT_NOT_FOUND');
      }
      throw new InventoryError('INVENTORY_VERSION_CONFLICT');
    });
  }
}

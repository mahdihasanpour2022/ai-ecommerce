'use client';

import { useQueryClient } from '@tanstack/react-query';
import type { EditProductWorkflowVariables } from '../interfaces/product-contract';
import { useEditProduct } from './useEditProduct';
import { useEditProductInventory } from './useEditProductInventory';
import { useEditProductVariant } from './useEditProductVariant';
import { productKeys } from './useGetProducts';
import { useSaveProductImage } from './useSaveProductImage';

export function useEditProductWorkflow() {
  const queryClient = useQueryClient();
  const product = useEditProduct();
  const variant = useEditProductVariant();
  const inventory = useEditProductInventory();
  const image = useSaveProductImage();

  async function save(changes: EditProductWorkflowVariables): Promise<boolean> {
    let attempted = false;
    try {
      if (changes.product) {
        attempted = true;
        await product.mutateAsync(changes.product);
      }
      if (changes.variant) {
        attempted = true;
        await variant.mutateAsync(changes.variant);
      }
      if (changes.inventory) {
        attempted = true;
        await inventory.mutateAsync(changes.inventory);
      }
      if (changes.image) {
        attempted = true;
        await image.mutateAsync(changes.image);
      }
      return attempted;
    } finally {
      if (attempted) await queryClient.invalidateQueries({ queryKey: productKeys.all });
    }
  }

  return {
    save,
    isPending: product.isPending || variant.isPending || inventory.isPending || image.isPending,
  } as const;
}

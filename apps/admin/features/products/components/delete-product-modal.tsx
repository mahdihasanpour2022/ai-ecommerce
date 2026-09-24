'use client';

import { UiButton } from '../../../app/components/shared/ui-button';
import { UiModal } from '../../../app/components/shared/ui-modal';
import type { Product } from '../interfaces/product-contract';

interface DeleteProductModalProps {
  readonly product: Product | null;
  readonly pending: boolean;
  readonly onCancel: () => void;
  readonly onConfirm: () => void;
}

export function DeleteProductModal({
  product,
  pending,
  onCancel,
  onConfirm,
}: DeleteProductModalProps) {
  return (
    <UiModal.Root
      open={product !== null}
      title="حذف محصول"
      closable={!pending}
      keyboard={!pending}
      mask={{ closable: !pending }}
      onCancel={onCancel}
    >
      <p className="m-0 leading-8 text-foreground">
        آیا از حذف دائمی محصول «{product?.name}» مطمئن هستید؟ تمام تنوع‌ها، موجودی و تصاویر آن
        نیز حذف می‌شوند و این عملیات قابل بازگشت نیست.
      </p>
      <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <UiButton variant="secondary" disabled={pending} onClick={onCancel}>
          انصراف
        </UiButton>
        <UiButton variant="dangerSubtle" loading={pending} onClick={onConfirm}>
          {pending ? 'در حال حذف…' : 'حذف دائمی محصول'}
        </UiButton>
      </div>
    </UiModal.Root>
  );
}

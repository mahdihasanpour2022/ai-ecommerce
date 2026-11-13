'use client';

import type { ProductSizeOption } from '@/hooks/shared/useGetProductSizes';
import { UiButton } from '../../../app/components/shared/ui-button';
import { UiModal } from '../../../app/components/shared/ui-modal';

interface DeleteProductSizeModalProps {
  readonly size: ProductSizeOption | null;
  readonly pending: boolean;
  readonly onCancel: () => void;
  readonly onConfirm: () => void;
}

export function DeleteProductSizeModal({
  size,
  pending,
  onCancel,
  onConfirm,
}: DeleteProductSizeModalProps) {
  return (
    <UiModal.Root
      open={size !== null}
      title="حذف سایز"
      closable={!pending}
      keyboard={!pending}
      mask={{ closable: !pending }}
      onCancel={onCancel}
    >
      <p className="text-foreground m-0 leading-8">
        آیا از حذف سایز «{size?.['persian-size-name']}» مطمئن هستید؟
      </p>
      <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <UiButton variant="secondary" disabled={pending} onClick={onCancel}>
          انصراف
        </UiButton>
        <UiButton variant="dangerSubtle" loading={pending} onClick={onConfirm}>
          {pending ? 'در حال حذف…' : 'حذف سایز'}
        </UiButton>
      </div>
    </UiModal.Root>
  );
}

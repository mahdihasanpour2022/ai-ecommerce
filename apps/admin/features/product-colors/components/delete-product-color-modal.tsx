'use client';

import { UiButton } from '../../../app/components/shared/ui-button';
import { UiModal } from '../../../app/components/shared/ui-modal';
import type { ProductColorOption } from '../../../hooks/shared/useGetProductColors';

interface DeleteProductColorModalProps {
  readonly color: ProductColorOption | null;
  readonly pending: boolean;
  readonly onCancel: () => void;
  readonly onConfirm: () => void;
}

export function DeleteProductColorModal({
  color,
  pending,
  onCancel,
  onConfirm,
}: DeleteProductColorModalProps) {
  return (
    <UiModal.Root
      open={color !== null}
      title="حذف رنگ"
      closable={!pending}
      keyboard={!pending}
      mask={{ closable: !pending }}
      onCancel={onCancel}
    >
      <p className="text-foreground m-0 leading-8">
        آیا از حذف رنگ «{color?.['persian-color-name']}» مطمئن هستید؟
      </p>
      <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <UiButton variant="secondary" disabled={pending} onClick={onCancel}>
          انصراف
        </UiButton>
        <UiButton variant="dangerSubtle" loading={pending} onClick={onConfirm}>
          {pending ? 'در حال حذف…' : 'حذف رنگ'}
        </UiButton>
      </div>
    </UiModal.Root>
  );
}

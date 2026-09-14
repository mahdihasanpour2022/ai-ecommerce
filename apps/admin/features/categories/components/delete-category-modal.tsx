'use client';

import { UiButton } from '../../../app/components/shared/ui-button';
import { UiModal } from '../../../app/components/shared/ui-modal';
import type { Category } from '../interfaces/category-contract';

interface DeleteCategoryModalProps {
  readonly category: Category | null;
  readonly pending: boolean;
  readonly onCancel: () => void;
  readonly onConfirm: () => void;
}

export function DeleteCategoryModal({
  category,
  pending,
  onCancel,
  onConfirm,
}: DeleteCategoryModalProps) {
  return (
    <UiModal.Root
      open={category !== null}
      title="حذف دسته‌بندی"
      closable={!pending}
      keyboard={!pending}
      mask={{ closable: !pending }}
      onCancel={onCancel}
    >
      <p className="m-0 leading-8 text-foreground">
        آیا از حذف دسته‌بندی «{category?.name}» مطمئن هستید؟ این عملیات قابل بازگشت نیست.
      </p>
      <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <UiButton variant="secondary" disabled={pending} onClick={onCancel}>
          انصراف
        </UiButton>
        <UiButton variant="dangerSubtle" disabled={pending} aria-busy={pending} onClick={onConfirm}>
          {pending ? 'در حال حذف…' : 'حذف دسته‌بندی'}
        </UiButton>
      </div>
    </UiModal.Root>
  );
}

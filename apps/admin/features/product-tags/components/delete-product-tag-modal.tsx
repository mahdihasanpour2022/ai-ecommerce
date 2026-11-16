'use client';

import type { ProductTagOption } from '@/hooks/shared/useGetProductTags';
import { UiButton } from '../../../app/components/shared/ui-button';
import { UiModal } from '../../../app/components/shared/ui-modal';

interface DeleteProductTagModalProps {
  readonly tag: ProductTagOption | null;
  readonly pending: boolean;
  readonly onCancel: () => void;
  readonly onConfirm: () => void;
}

export function DeleteProductTagModal({
  tag,
  pending,
  onCancel,
  onConfirm,
}: DeleteProductTagModalProps) {
  return (
    <UiModal.Root
      open={tag !== null}
      title="حذف برچسب"
      closable={!pending}
      keyboard={!pending}
      mask={{ closable: !pending }}
      onCancel={onCancel}
    >
      <p className="text-foreground m-0 leading-8">
        آیا از حذف برچسب «{tag?.['english-tag-name']}» مطمئن هستید؟
      </p>
      <p className="text-muted mt-2 mb-0 text-sm">
        این برچسب از محصولاتی که از آن استفاده می‌کنند نیز حذف می‌شود.
      </p>
      <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <UiButton variant="secondary" disabled={pending} onClick={onCancel}>
          انصراف
        </UiButton>
        <UiButton variant="dangerSubtle" loading={pending} onClick={onConfirm}>
          {pending ? 'در حال حذف…' : 'حذف برچسب'}
        </UiButton>
      </div>
    </UiModal.Root>
  );
}

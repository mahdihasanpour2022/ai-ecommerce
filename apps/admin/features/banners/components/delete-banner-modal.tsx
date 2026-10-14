'use client';

import { UiButton } from '../../../app/components/shared/ui-button';
import { UiModal } from '../../../app/components/shared/ui-modal';
import type { Banner } from '../interfaces/banner-contract';

interface DeleteBannerModalProps {
  readonly banner: Banner | null;
  readonly pending: boolean;
  readonly onCancel: () => void;
  readonly onConfirm: () => void;
}

export function DeleteBannerModal({ banner, pending, onCancel, onConfirm }: DeleteBannerModalProps) {
  return (
    <UiModal.Root
      open={banner !== null}
      title="حذف بنر"
      closable={!pending}
      keyboard={!pending}
      mask={{ closable: !pending }}
      onCancel={onCancel}
    >
      <p className="m-0 leading-8 text-foreground">
        آیا از حذف این بنر مطمئن هستید؟ این عملیات قابل بازگشت نیست.
      </p>
      <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <UiButton variant="secondary" disabled={pending} onClick={onCancel}>
          انصراف
        </UiButton>
        <UiButton variant="dangerSubtle" loading={pending} onClick={onConfirm}>
          {pending ? 'در حال حذف…' : 'حذف بنر'}
        </UiButton>
      </div>
    </UiModal.Root>
  );
}

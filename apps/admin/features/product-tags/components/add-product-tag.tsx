'use client';

import { useRef, useState } from 'react';
import { UiButton } from '../../../app/components/shared/ui-button';
import { ProductTagFormModal } from './product-tag-form-modal';

export function AddProductTag() {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

  return (
    <>
      <UiButton ref={triggerRef} onClick={() => setOpen(true)}>
        افزودن برچسب
      </UiButton>
      <ProductTagFormModal
        mode="create"
        open={open}
        onClose={() => {
          setOpen(false);
          queueMicrotask(() => triggerRef.current?.focus());
        }}
      />
    </>
  );
}

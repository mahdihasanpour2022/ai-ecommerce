'use client';

import { useRef, useState } from 'react';
import { UiButton } from '../../../app/components/shared/ui-button';
import { ProductColorFormModal } from './product-color-form-modal';

export function AddProductColor() {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

  return (
    <>
      <UiButton ref={triggerRef} onClick={() => setOpen(true)}>
        ایجاد رنگ جدید
      </UiButton>
      <ProductColorFormModal
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

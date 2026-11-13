'use client';

import { useRef, useState } from 'react';
import { UiButton } from '../../../app/components/shared/ui-button';
import { ProductSizeFormModal } from './product-size-form-modal';

export function AddProductSizes() {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

  return (
    <>
      <UiButton ref={triggerRef} onClick={() => setOpen(true)}>
        ایجاد سایز جدید
      </UiButton>
      <ProductSizeFormModal
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

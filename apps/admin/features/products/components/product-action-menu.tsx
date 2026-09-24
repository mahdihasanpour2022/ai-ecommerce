'use client';

import { Popover } from 'antd';
import { useState } from 'react';
import { UiButton } from '../../../app/components/shared/ui-button';
import {
  ActionMenuIcon,
  DeleteIcon,
  EditIcon,
  StatusIcon,
} from '../../../app/components/shared/ui-icons';
import type { Product } from '../interfaces/product-contract';

interface ProductActionMenuProps {
  readonly product: Product;
  readonly disabled: boolean;
  readonly onChangeStatus: (product: Product) => void;
  readonly onDelete: (product: Product) => void;
  readonly onEdit: (product: Product) => void;
}

export function ProductActionMenu({
  product,
  disabled,
  onChangeStatus,
  onDelete,
  onEdit,
}: ProductActionMenuProps) {
  const [open, setOpen] = useState(false);
  const content = (
    <div className="grid min-w-32 gap-2" role="dialog" aria-label={`عملیات ${product.name}`}>
      <UiButton
        className="w-full"
        size="small"
        variant="secondary"
        onClick={() => {
          setOpen(false);
          onEdit(product);
        }}
      >
        <EditIcon />
        ویرایش
      </UiButton>
      <UiButton
        className="w-full"
        size="small"
        variant="secondary"
        onClick={() => {
          setOpen(false);
          onChangeStatus(product);
        }}
      >
        <StatusIcon />
        تغییر وضعیت
      </UiButton>
      <UiButton
        className="w-full"
        size="small"
        variant="dangerSubtle"
        onClick={() => {
          setOpen(false);
          onDelete(product);
        }}
      >
        <DeleteIcon />
        حذف
      </UiButton>
    </div>
  );

  return (
    <Popover content={content} open={open} trigger="click" destroyOnHidden onOpenChange={setOpen}>
      <UiButton
        size="icon"
        variant="secondary"
        disabled={disabled}
        aria-label={`عملیات محصول ${product.name}`}
        aria-expanded={open}
        aria-haspopup="dialog"
        className="w-8! h-8!"
      >
        <ActionMenuIcon className="size-4" />
      </UiButton>
    </Popover>
  );
}

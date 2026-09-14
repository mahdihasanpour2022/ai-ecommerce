'use client';

import { Popover } from 'antd';
import { useState } from 'react';
import { UiButton } from '../../../app/components/shared/ui-button';
import { ActionMenuIcon, DeleteIcon, EditIcon } from '../../../app/components/shared/ui-icons';
import type { Category } from '../interfaces/category-contract';

interface CategoryActionMenuProps {
  readonly category: Category;
  readonly disabled: boolean;
  readonly onDelete: (category: Category) => void;
  readonly onEdit: (category: Category) => void;
}

export function CategoryActionMenu({
  category,
  disabled,
  onDelete,
  onEdit,
}: CategoryActionMenuProps) {
  const [open, setOpen] = useState(false);
  const content = (
    <div className="grid min-w-32 gap-2" role="dialog" aria-label={`عملیات ${category.name}`}>
      <UiButton
        className="w-full"
        size="small"
        variant="secondary"
        onClick={() => {
          setOpen(false);
          onEdit(category);
        }}
      >
        <EditIcon />
        ویرایش
      </UiButton>
      <UiButton
        className="w-full"
        size="small"
        variant="dangerSubtle"
        onClick={() => {
          setOpen(false);
          onDelete(category);
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
        aria-label={`عملیات دسته‌بندی ${category.name}`}
        aria-expanded={open}
        aria-haspopup="dialog"
        className="w-8! h-8!"
      >
        <ActionMenuIcon className="size-4" />
      </UiButton>
    </Popover>
  );
}

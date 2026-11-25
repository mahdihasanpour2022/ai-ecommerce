'use client';

import { useState } from 'react';
import { UiButton } from '../../../app/components/shared/ui-button';
import {
  MAX_MAIN_SPECS,
  MAX_PRODUCT_SPECS,
  type ProductMainSpec,
} from '../schemas/product-main-spec-schema';
import { ProductMainSpecModal } from './product-main-spec-modal';

interface ProductMainSpecSectionProps {
  readonly fields: readonly (ProductMainSpec & { readonly id: string })[];
  readonly disabled: boolean;
  readonly reservedKeys?: readonly string[];
  readonly totalSpecificationCount?: number;
  readonly onAdd: (item: ProductMainSpec) => void;
  readonly onRemove: (index: number) => void;
}

export function ProductMainSpecSection({
  fields,
  disabled,
  reservedKeys = [],
  totalSpecificationCount = fields.length,
  onAdd,
  onRemove,
}: ProductMainSpecSectionProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const atMainLimit = fields.length >= MAX_MAIN_SPECS;
  const atProductLimit = totalSpecificationCount >= MAX_PRODUCT_SPECS;
  const atLimit = atMainLimit || atProductLimit;

  return (
    <section
      className="border-border grid gap-4 rounded-xl border p-4"
      aria-labelledby="main-specs-title"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 id="main-specs-title" className="text-foreground m-0 text-sm font-bold">
            ویژگی‌های اصلی (حداکثر ۳ مورد)
          </h3>
          <p className="text-muted mt-1 mb-0 text-xs leading-6">
            عنوان حداکثر ۲۰ و مقدار حداکثر ۱۰۰ کاراکتر است.
          </p>
        </div>
        <UiButton
          type="button"
          size="small"
          variant="secondary"
          disabled={disabled || atLimit}
          onClick={() => setModalOpen(true)}
        >
          {atMainLimit
            ? 'سقف ۳ ویژگی تکمیل شد'
            : atProductLimit
              ? 'سقف ۳۰ ویژگی تکمیل شد'
              : 'افزودن ویژگی'}
        </UiButton>
      </div>

      {fields.length === 0 ? (
        <p className="bg-surface-subtle text-muted m-0 rounded-xl p-4 text-sm">
          هنوز ویژگی اصلی ثبت نشده است.
        </p>
      ) : (
        <ol className="m-0 grid list-none gap-3 p-0">
          {fields.map((field, index) => (
            <li
              key={field.id}
              className="border-border flex min-w-0 flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-center"
            >
              <span className="text-foreground shrink-0 text-sm font-bold">{index + 1}.</span>
              <div className="grid min-w-0 flex-1 gap-1">
                <span className="text-foreground text-sm font-bold wrap-break-word">
                  {field.key}
                </span>
                <span className="text-muted text-sm wrap-break-word">{field.value}</span>
              </div>
              <UiButton
                type="button"
                size="small"
                variant="dangerSubtle"
                disabled={disabled}
                aria-label={`حذف ویژگی اصلی ${index + 1}`}
                onClick={() => onRemove(index)}
              >
                حذف
              </UiButton>
            </li>
          ))}
        </ol>
      )}

      <ProductMainSpecModal
        open={modalOpen}
        existingKeys={[...fields.map((field) => field.key), ...reservedKeys]}
        onCancel={() => setModalOpen(false)}
        onAdd={(item: ProductMainSpec) => {
          onAdd(item);
          setModalOpen(false);
        }}
      />
    </section>
  );
}

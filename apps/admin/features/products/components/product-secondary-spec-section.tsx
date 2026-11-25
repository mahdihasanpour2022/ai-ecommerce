'use client';

import { useState } from 'react';
import { UiButton } from '../../../app/components/shared/ui-button';
import { MAX_PRODUCT_SPECS, type ProductMainSpec } from '../schemas/product-main-spec-schema';
import { ProductMainSpecModal } from './product-main-spec-modal';

interface ProductSecondarySpecSectionProps {
  readonly fields: readonly (ProductMainSpec & { readonly id: string })[];
  readonly mainSpecKeys: readonly string[];
  readonly disabled: boolean;
  readonly onAdd: (item: ProductMainSpec) => void;
  readonly onRemove: (index: number) => void;
}

export function ProductSecondarySpecSection({
  fields,
  mainSpecKeys,
  disabled,
  onAdd,
  onRemove,
}: ProductSecondarySpecSectionProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const atLimit = fields.length + mainSpecKeys.length >= MAX_PRODUCT_SPECS;

  return (
    <section
      className="border-border grid gap-4 rounded-xl border p-4"
      aria-labelledby="secondary-specs-title"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 id="secondary-specs-title" className="text-foreground m-0 text-sm font-bold">
            ویژگی‌های فرعی (حداکثر ۳۰ مورد)
          </h3>
          <p className="text-muted mt-1 mb-0 text-xs leading-6">
            سقف ۳۰ مورد با احتساب ویژگی‌های اصلی؛ عنوان حداکثر ۲۰ و مقدار حداکثر ۱۰۰ کاراکتر است.
          </p>
        </div>
        <UiButton
          type="button"
          size="small"
          variant="secondary"
          disabled={disabled || atLimit}
          onClick={() => setModalOpen(true)}
        >
          {atLimit ? 'سقف ۳۰ ویژگی تکمیل شد' : 'افزودن ویژگی'}
        </UiButton>
      </div>

      {fields.length === 0 ? (
        <p className="bg-surface-subtle text-muted m-0 rounded-xl p-4 text-sm">
          هنوز ویژگی فرعی ثبت نشده است.
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
                <span className="text-foreground text-sm font-bold break-words">{field.key}</span>
                <span className="text-muted text-sm break-words">{field.value}</span>
              </div>
              <UiButton
                type="button"
                size="small"
                variant="dangerSubtle"
                disabled={disabled}
                aria-label={`حذف ویژگی فرعی ${index + 1}`}
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
        kind="secondary"
        existingKeys={[...fields.map((field) => field.key), ...mainSpecKeys]}
        onCancel={() => setModalOpen(false)}
        onAdd={(item) => {
          onAdd(item);
          setModalOpen(false);
        }}
      />
    </section>
  );
}

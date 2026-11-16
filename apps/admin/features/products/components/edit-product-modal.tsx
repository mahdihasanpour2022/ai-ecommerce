'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useGetProductTags } from '@/hooks/shared/useGetProductTags';
import { UiButton } from '../../../app/components/shared/ui-button';
import { UiForm } from '../../../app/components/shared/ui-form';
import { UiModal } from '../../../app/components/shared/ui-modal';
import { UiSelect } from '../../../app/components/shared/ui-select';
import { formatPriceInput, normalizePriceInput } from '../../../utils/price-input';
import { CATEGORY_OPTIONS_PAGE_SIZE } from '../../categories/constants/pagination';
import { useGetCategories } from '../../categories/hooks/useGetCategories';
import { categoryOptions } from '../../categories/utils/category-options';
import type {
  EditProductVariables,
  EditProductWorkflowVariables,
  Product,
} from '../interfaces/product-contract';
import type { EditProductFormValues } from '../schemas/edit-product-schema';
import { editProductSchema } from '../schemas/edit-product-schema';

interface EditProductModalProps {
  readonly product: Product | null;
  readonly pending: boolean;
  readonly onCancel: () => void;
  readonly onSubmit: (variables: EditProductWorkflowVariables) => Promise<void>;
}

// این فرم فقط مشخصات اصلی محصول را ویرایش می‌کند و مدیریت واریانت‌ها در جدول انجام می‌شود.
export function EditProductModal({ product, pending, onCancel, onSubmit }: EditProductModalProps) {
  const categories = useGetCategories({
    page: 1,
    pageSize: CATEGORY_OPTIONS_PAGE_SIZE,
    enabled: product !== null,
  });
  const tags = useGetProductTags(product !== null);
  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<EditProductFormValues>({
    resolver: zodResolver(editProductSchema),
    defaultValues: {
      name: '',
      description: '',
      tag: '',
      categoryId: '',
      originalPriceRial: '',
      discountPercent: '0',
    },
    mode: 'onChange',
    shouldFocusError: true,
  });

  useEffect(() => {
    if (product) reset(formValues(product));
  }, [product, reset]);

  const submit = handleSubmit(async (values) => {
    if (!product) return;
    const changes = productChanges(product, values);
    await onSubmit(changes ? { product: changes } : {});
  });
  const categoryItems = categories.data ? categoryOptions(categories.data.result) : [];
  // گزینه‌های تگ فرم ویرایش از منبع مدیریت تگ‌ها خوانده می‌شوند.
  const tagItems = (tags.data?.result ?? []).map((tag) => ({
    value: tag['english-tag-name'],
    label: tag['english-tag-name'],
  }));
  const submitting = pending || isSubmitting;

  return (
    <UiModal.Root
      open={product !== null}
      title="ویرایش محصول"
      width={720}
      styles={{
        container: { display: 'flex', height: '50vh', flexDirection: 'column' },
        body: { minHeight: 0, flex: 1, overflowY: 'auto' },
      }}
      closable={!submitting}
      keyboard={!submitting}
      mask={{ closable: !submitting }}
      onCancel={onCancel}
    >
      <UiForm.Root onSubmit={(event) => void submit(event)}>
        <div className="grid gap-5 md:grid-cols-2">
          <UiForm.Field>
            <UiForm.Label htmlFor="edit-product-name">نام محصول</UiForm.Label>
            <UiForm.TextInput
              id="edit-product-name"
              autoComplete="off"
              maxLength={200}
              disabled={submitting}
              aria-invalid={errors.name ? 'true' : 'false'}
              aria-describedby={errors.name ? 'edit-product-name-error' : undefined}
              {...register('name')}
            />
            {errors.name ? (
              <UiForm.Error id="edit-product-name-error">{errors.name.message}</UiForm.Error>
            ) : null}
          </UiForm.Field>

          <UiForm.Field>
            <UiForm.Label htmlFor="edit-product-category">دسته‌بندی</UiForm.Label>
            <Controller
              name="categoryId"
              control={control}
              render={({ field }) => (
                <UiSelect.Root
                  id="edit-product-category"
                  ref={field.ref}
                  value={field.value || null}
                  options={categoryItems.map((option) => ({
                    value: option.id,
                    label: option.label,
                    level: option.level,
                  }))}
                  placeholder="انتخاب دسته‌بندی"
                  loading={categories.isFetching}
                  disabled={submitting || categories.isFetching || categories.isError}
                  status={errors.categoryId ? 'error' : ''}
                  aria-invalid={errors.categoryId ? 'true' : 'false'}
                  aria-describedby={errors.categoryId ? 'edit-product-category-error' : undefined}
                  onBlur={field.onBlur}
                  onChange={field.onChange}
                />
              )}
            />
            {errors.categoryId ? (
              <UiForm.Error id="edit-product-category-error">
                {errors.categoryId.message}
              </UiForm.Error>
            ) : null}
            {categories.isError ? (
              <UiForm.Error>دریافت دسته‌بندی‌ها ناموفق بود.</UiForm.Error>
            ) : null}
          </UiForm.Field>
        </div>

        <UiForm.Field>
          <UiForm.Label htmlFor="edit-product-description">توضیحات (اختیاری)</UiForm.Label>
          <UiForm.TextArea
            id="edit-product-description"
            maxLength={200}
            disabled={submitting}
            aria-invalid={errors.description ? 'true' : 'false'}
            aria-describedby={errors.description ? 'edit-product-description-error' : undefined}
            {...register('description')}
          />
          {errors.description ? (
            <UiForm.Error id="edit-product-description-error">
              {errors.description.message}
            </UiForm.Error>
          ) : null}
        </UiForm.Field>

        <UiForm.Field>
          <UiForm.Label htmlFor="edit-product-tag">تگ (اختیاری)</UiForm.Label>
          <Controller
            name="tag"
            control={control}
            render={({ field }) => (
              <UiSelect.Root
                id="edit-product-tag"
                ref={field.ref}
                value={field.value || null}
                options={tagItems}
                placeholder="انتخاب تگ"
                allowClear
                showSearch
                optionFilterProp="label"
                loading={tags.isFetching}
                disabled={submitting || tags.isFetching || tags.isError}
                status={errors.tag ? 'error' : ''}
                aria-invalid={errors.tag ? 'true' : 'false'}
                aria-describedby={errors.tag ? 'edit-product-tag-error' : undefined}
                onBlur={field.onBlur}
                onChange={(value) => field.onChange(value ?? '')}
              />
            )}
          />
          {errors.tag ? (
            <UiForm.Error id="edit-product-tag-error">{errors.tag.message}</UiForm.Error>
          ) : null}
          {tags.isError ? <UiForm.Error>دریافت تگ‌ها ناموفق بود.</UiForm.Error> : null}
        </UiForm.Field>

        <fieldset className="border-border grid gap-5 rounded-xl border p-4">
          <legend className="text-foreground px-2 text-sm font-bold">قیمت محصول</legend>
          <div className="grid gap-5 md:grid-cols-2">
            <UiForm.Field>
              <UiForm.Label htmlFor="edit-product-price">قیمت اصلی (ریال)</UiForm.Label>
              <Controller
                name="originalPriceRial"
                control={control}
                render={({ field }) => (
                  <UiForm.TextInput
                    id="edit-product-price"
                    ref={field.ref}
                    name={field.name}
                    value={formatPriceInput(field.value)}
                    inputMode="numeric"
                    dir="ltr"
                    disabled={submitting}
                    aria-invalid={errors.originalPriceRial ? 'true' : 'false'}
                    aria-describedby={
                      errors.originalPriceRial ? 'edit-product-price-error' : undefined
                    }
                    onBlur={field.onBlur}
                    onChange={(event) => field.onChange(normalizePriceInput(event.target.value))}
                  />
                )}
              />
              {errors.originalPriceRial ? (
                <UiForm.Error id="edit-product-price-error">
                  {errors.originalPriceRial.message}
                </UiForm.Error>
              ) : null}
            </UiForm.Field>

            <UiForm.Field>
              <UiForm.Label htmlFor="edit-product-discount">درصد تخفیف</UiForm.Label>
              <Controller
                name="discountPercent"
                control={control}
                render={({ field }) => (
                  <UiForm.TextInput
                    id="edit-product-discount"
                    ref={field.ref}
                    name={field.name}
                    value={field.value}
                    inputMode="numeric"
                    dir="ltr"
                    disabled={submitting}
                    aria-invalid={errors.discountPercent ? 'true' : 'false'}
                    aria-describedby={
                      errors.discountPercent ? 'edit-product-discount-error' : undefined
                    }
                    onBlur={field.onBlur}
                    onChange={(event) => field.onChange(normalizePriceInput(event.target.value))}
                  />
                )}
              />
              {errors.discountPercent ? (
                <UiForm.Error id="edit-product-discount-error">
                  {errors.discountPercent.message}
                </UiForm.Error>
              ) : null}
            </UiForm.Field>
          </div>
        </fieldset>

        <UiForm.Actions>
          <UiButton variant="secondary" disabled={submitting} onClick={onCancel}>
            انصراف
          </UiButton>
          <UiButton type="submit" disabled={submitting} loading={submitting}>
            {submitting ? 'در حال ذخیره…' : 'ذخیره تغییرات'}
          </UiButton>
        </UiForm.Actions>
      </UiForm.Root>
    </UiModal.Root>
  );
}

function formValues(product: Product): EditProductFormValues {
  return {
    name: product.name,
    description: product.description ?? '',
    tag: product.tag ?? '',
    categoryId: product.category.id,
    originalPriceRial: String(product.originalPriceRial),
    discountPercent: String(product.discountPercent),
  };
}

function productChanges(
  product: Product,
  values: EditProductFormValues,
): EditProductVariables | undefined {
  const description = values.description || null;
  const tag = values.tag || null;
  const originalPriceRial = Number(values.originalPriceRial);
  const discountPercent = Number(values.discountPercent);
  const changes = {
    ...(values.name === product.name ? {} : { name: values.name }),
    ...(description === product.description ? {} : { description }),
    ...(tag === product.tag ? {} : { tag }),
    ...(originalPriceRial === product.originalPriceRial ? {} : { originalPriceRial }),
    ...(discountPercent === product.discountPercent ? {} : { discountPercent }),
    ...(values.categoryId === product.category.id ? {} : { categoryId: values.categoryId }),
  };
  return Object.keys(changes).length === 0 ? undefined : { productId: product.id, ...changes };
}

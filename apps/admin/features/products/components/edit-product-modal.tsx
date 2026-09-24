'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { App } from 'antd';
import { useEffect } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import type { UseFormSetValue } from 'react-hook-form';
import { UiButton } from '../../../app/components/shared/ui-button';
import { UiForm } from '../../../app/components/shared/ui-form';
import { UiModal } from '../../../app/components/shared/ui-modal';
import { UiSelect } from '../../../app/components/shared/ui-select';
import { CATEGORY_OPTIONS_PAGE_SIZE } from '../../categories/constants/pagination';
import { useGetCategories } from '../../categories/hooks/useGetCategories';
import { categoryOptions } from '../../categories/utils/category-options';
import { useGetProductDetail } from '../hooks/useGetProductDetail';
import { useGetProductColors, useGetProductSizes } from '../hooks/useGetProductOptions';
import type {
  EditProductWorkflowVariables,
  Product,
  ProductDetail,
  ProductVariant,
} from '../interfaces/product-contract';
import type { EditProductFormValues } from '../schemas/edit-product-schema';
import { editProductSchema } from '../schemas/edit-product-schema';
import {
  imageSanitizer,
  PRODUCT_IMAGE_ACCEPT,
  ProductImageSanitizationError,
} from '../utils/image-sanitizer';
import { formatPriceInput, normalizePriceInput } from '../../../utils/price-input';

interface EditProductModalProps {
  readonly product: Product | null;
  readonly pending: boolean;
  readonly onCancel: () => void;
  readonly onSubmit: (variables: EditProductWorkflowVariables) => Promise<void>;
}

export function EditProductModal({ product, pending, onCancel, onSubmit }: EditProductModalProps) {
  const { message } = App.useApp();
  const detailQuery = useGetProductDetail(product?.id ?? null);
  const categories = useGetCategories({
    page: 1,
    pageSize: CATEGORY_OPTIONS_PAGE_SIZE,
    enabled: product !== null,
  });
  const sizes = useGetProductSizes(product !== null);
  const colors = useGetProductColors(product !== null);
  const {
    control,
    register,
    handleSubmit,
    reset,
    setError,
    clearErrors,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<EditProductFormValues>({
    resolver: zodResolver(editProductSchema),
    defaultValues: {
      name: '',
      description: '',
      categoryId: '',
      variantId: '',
      size: '',
      color: '',
      priceRial: '',
      onHandQuantity: '',
    },
    mode: 'onChange',
    shouldFocusError: true,
  });

  const detail = detailQuery.data?.singleResult;
  const selectedVariantId = useWatch({ control, name: 'variantId' });
  const selectedVariant =
    detail?.variants.find((variant) => variant.id === selectedVariantId) ?? detail?.variants[0];

  useEffect(() => {
    if (!detail) return;
    const variant = detail.variants[0];
    if (!variant) return;
    reset(formValues(detail, variant));
  }, [detail, reset]);

  const submit = handleSubmit(async (values) => {
    if (!detail || !selectedVariant) return;
    await onSubmit(editWorkflowChanges(detail, selectedVariant, values));
  });

  const categoryItems = categories.data ? categoryOptions(categories.data.result) : [];
  const sizeOptions = (sizes.data?.result ?? []).map((size) => ({ value: size, label: size }));
  const colorOptions = (colors.data?.result ?? []).map((color) => ({
    value: color['color-name'],
    label: color['color-name'],
    hexCode: color['hex-code'],
  }));
  const detailPending = detailQuery.isFetching;
  const detailFailed = detailQuery.isError;
  const submitting = pending || isSubmitting;

  return (
    <UiModal.Root
      open={product !== null}
      title="ویرایش محصول"
      width={720}
      closable={!submitting}
      keyboard={!submitting}
      mask={{ closable: !submitting }}
      onCancel={onCancel}
    >
      {detailPending ? (
        <p className="m-0 text-sm leading-7 text-muted">در حال دریافت اطلاعات محصول…</p>
      ) : detailFailed || !detail || !selectedVariant ? (
        <div className="grid gap-4">
          <UiForm.Error>دریافت اطلاعات کامل محصول ناموفق بود.</UiForm.Error>
          <UiButton variant="secondary" onClick={() => void detailQuery.refetch()}>
            تلاش دوباره
          </UiButton>
        </div>
      ) : (
        <UiForm.Root onSubmit={(event) => void submit(event)}>
          <UiForm.Field>
            <UiForm.Label htmlFor="edit-product-image">تصویر جدید (اختیاری)</UiForm.Label>
            <Controller
              name="image"
              control={control}
              render={({ field }) => (
                <UiForm.TextInput
                  key={`${detail.id}:${detail.imageVersion}`}
                  id="edit-product-image"
                  ref={field.ref}
                  name={field.name}
                  type="file"
                  accept={PRODUCT_IMAGE_ACCEPT}
                  disabled={submitting}
                  aria-invalid={errors.image ? 'true' : 'false'}
                  aria-describedby={
                    errors.image
                      ? 'edit-product-image-help edit-product-image-error'
                      : 'edit-product-image-help'
                  }
                  className="cursor-pointer file:me-3 file:rounded-lg file:border-0 file:bg-brand file:px-3 file:py-2 file:font-bold file:text-accent-foreground"
                  onBlur={field.onBlur}
                  onChange={(event) => {
                    const input = event.currentTarget;
                    const file = input.files?.[0];
                    if (!file) {
                      field.onChange(undefined);
                      return;
                    }
                    void imageSanitizer(file)
                      .then((safeFile) => {
                        field.onChange(safeFile);
                        clearErrors('image');
                      })
                      .catch(async (error: unknown) => {
                        const errorMessage =
                          error instanceof ProductImageSanitizationError
                            ? error.message
                            : 'بررسی تصویر ممکن نشد. تصویر دیگری انتخاب کنید.';
                        input.value = '';
                        field.onChange(undefined);
                        setError('image', { type: 'validate', message: errorMessage });
                        await message.error({
                          key: 'edit-product-image-validation-error',
                          content: errorMessage,
                        });
                      });
                  }}
                />
              )}
            />
            <p id="edit-product-image-help" className="m-0 text-xs leading-6 text-muted">
              انتخاب نکردن فایل، تصویر فعلی را حفظ می‌کند. فرمت‌های مجاز: JPG، JPEG، PNG و WebP —
              حجم حداکثر ۴۰۰ کیلوبایت است.
            </p>
            {errors.image ? (
              <UiForm.Error id="edit-product-image-error">{errors.image.message}</UiForm.Error>
            ) : null}
          </UiForm.Field>

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
                <UiForm.Error>دریافت دسته‌بندی‌ها ناموفق بود. فرم را ببندید و دوباره تلاش کنید.</UiForm.Error>
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

          <fieldset className="grid gap-5 rounded-xl border border-border p-4">
            <legend className="px-2 text-sm font-bold text-foreground">تنوع محصول</legend>
            {detail.variants.length > 1 ? (
              <UiForm.Field>
                <UiForm.Label htmlFor="edit-product-variant">انتخاب تنوع</UiForm.Label>
                <Controller
                  name="variantId"
                  control={control}
                  render={({ field }) => (
                    <UiSelect.Root
                      id="edit-product-variant"
                      ref={field.ref}
                      value={field.value || null}
                      options={detail.variants.map((variant) => ({
                        value: variant.id,
                        label: variantLabel(variant),
                      }))}
                      disabled={submitting}
                      onBlur={field.onBlur}
                      onChange={(variantId) => {
                        field.onChange(variantId);
                        const variant = detail.variants.find(({ id }) => id === variantId);
                        if (variant) setVariantValues(setValue, variant);
                      }}
                    />
                  )}
                />
              </UiForm.Field>
            ) : null}

            <div className="grid gap-5 md:grid-cols-2">
              <UiForm.Field>
                <UiForm.Label htmlFor="edit-product-price">قیمت (ریال)</UiForm.Label>
                <Controller
                  name="priceRial"
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
                      aria-invalid={errors.priceRial ? 'true' : 'false'}
                      aria-describedby={errors.priceRial ? 'edit-product-price-error' : undefined}
                      onBlur={field.onBlur}
                      onChange={(event) => field.onChange(normalizePriceInput(event.target.value))}
                    />
                  )}
                />
                {errors.priceRial ? (
                  <UiForm.Error id="edit-product-price-error">
                    {errors.priceRial.message}
                  </UiForm.Error>
                ) : null}
              </UiForm.Field>

              <UiForm.Field>
                <UiForm.Label htmlFor="edit-product-size">سایز</UiForm.Label>
                <Controller
                  name="size"
                  control={control}
                  render={({ field }) => (
                    <UiSelect.Root
                      id="edit-product-size"
                      ref={field.ref}
                      value={field.value || null}
                      options={sizeOptions}
                      placeholder="بدون سایز"
                      allowClear
                      loading={sizes.isFetching}
                      disabled={submitting || sizes.isFetching || sizes.isError}
                      onBlur={field.onBlur}
                      onChange={(value) => field.onChange(value ?? '')}
                    />
                  )}
                />
                {sizes.isError ? (
                  <UiForm.Error>دریافت گزینه‌های سایز ناموفق بود.</UiForm.Error>
                ) : null}
              </UiForm.Field>

              <UiForm.Field>
                <UiForm.Label htmlFor="edit-product-color">رنگ</UiForm.Label>
                <Controller
                  name="color"
                  control={control}
                  render={({ field }) => (
                    <UiSelect.Root
                      id="edit-product-color"
                      ref={field.ref}
                      value={field.value || null}
                      options={colorOptions}
                      placeholder="بدون رنگ"
                      allowClear
                      loading={colors.isFetching}
                      disabled={submitting || colors.isFetching || colors.isError}
                      onBlur={field.onBlur}
                      onChange={(value) => field.onChange(value ?? '')}
                    />
                  )}
                />
                {colors.isError ? (
                  <UiForm.Error>دریافت گزینه‌های رنگ ناموفق بود.</UiForm.Error>
                ) : null}
              </UiForm.Field>

              <UiForm.Field>
                <UiForm.Label htmlFor="edit-product-quantity">موجودی</UiForm.Label>
                <UiForm.TextInput
                  id="edit-product-quantity"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={2147483647}
                  step={1}
                  dir="ltr"
                  disabled={submitting}
                  aria-invalid={errors.onHandQuantity ? 'true' : 'false'}
                  aria-describedby={
                    errors.onHandQuantity ? 'edit-product-quantity-error' : undefined
                  }
                  {...register('onHandQuantity')}
                />
                {errors.onHandQuantity ? (
                  <UiForm.Error id="edit-product-quantity-error">
                    {errors.onHandQuantity.message}
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
      )}
    </UiModal.Root>
  );
}

function formValues(detail: ProductDetail, variant: ProductVariant): EditProductFormValues {
  return {
    name: detail.name,
    description: detail.description ?? '',
    categoryId: detail.category.id,
    variantId: variant.id,
    size: variant.size ?? '',
    color: variant.color ?? '',
    priceRial: String(variant.priceRial),
    onHandQuantity: String(variant.inventory.onHandQuantity),
  };
}

function setVariantValues(
  setValue: UseFormSetValue<EditProductFormValues>,
  variant: ProductVariant,
): void {
  setValue('size', variant.size ?? '');
  setValue('color', variant.color ?? '');
  setValue('priceRial', String(variant.priceRial));
  setValue('onHandQuantity', String(variant.inventory.onHandQuantity));
}

function variantLabel(variant: ProductVariant): string {
  return [variant.sku, variant.size, variant.color].filter(Boolean).join(' — ');
}

function editWorkflowChanges(
  detail: ProductDetail,
  variant: ProductVariant,
  values: EditProductFormValues,
): EditProductWorkflowVariables {
  const nextDescription = values.description || null;
  const nextSize = values.size || null;
  const nextColor = values.color || null;
  const nextPrice = Number(values.priceRial);
  const nextQuantity = Number(values.onHandQuantity);
  const productChanges = {
    ...(values.name === detail.name ? {} : { name: values.name }),
    ...(nextDescription === detail.description ? {} : { description: nextDescription }),
    ...(values.categoryId === detail.category.id ? {} : { categoryId: values.categoryId }),
  };
  const variantChanges = {
    ...(nextSize === variant.size ? {} : { size: nextSize }),
    ...(nextColor === variant.color ? {} : { color: nextColor }),
    ...(nextPrice === variant.priceRial ? {} : { priceRial: nextPrice }),
  };
  const mainImage = detail.images.find(({ position }) => position === 0) ?? null;

  return {
    ...(Object.keys(productChanges).length === 0
      ? {}
      : { product: { productId: detail.id, ...productChanges } }),
    ...(Object.keys(variantChanges).length === 0
      ? {}
      : { variant: { variantId: variant.id, ...variantChanges } }),
    ...(nextQuantity === variant.inventory.onHandQuantity
      ? {}
      : {
          inventory: {
            variantId: variant.id,
            onHandQuantity: nextQuantity,
            version: variant.inventory.version,
          },
        }),
    ...(values.image
      ? {
          image: {
            productId: detail.id,
            currentImageId: mainImage?.id ?? null,
            imageVersion: detail.imageVersion,
            file: values.image,
          },
        }
      : {}),
  };
}

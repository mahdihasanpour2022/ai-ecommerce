'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { App } from 'antd';
import { useEffect } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import type { UseFormSetValue } from 'react-hook-form';
import { UiButton } from '../../../app/components/shared/ui-button';
import { UiForm } from '../../../app/components/shared/ui-form';
import { UiImageInput } from '../../../app/components/shared/ui-image-input';
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
      tag: '',
      categoryId: '',
      variantId: '',
      size: '',
      color: '',
      originalPriceRial: '',
      discountPercent: '0',
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
  const sizeOptions = (sizes.data?.result ?? []).map((size) => ({
    value: size['english-size-name'],
    label: size['persian-size-name'],
  }));
  const colorOptions = (colors.data?.result ?? []).map((color) => ({
    value: color['english-color-name'],
    label: color['persian-color-name'],
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
        <p className="text-muted m-0 text-sm leading-7">در حال دریافت اطلاعات محصول…</p>
      ) : detailFailed || !detail || !selectedVariant ? (
        <div className="grid gap-4">
          <UiForm.Error>دریافت اطلاعات کامل محصول ناموفق بود.</UiForm.Error>
          <UiButton variant="secondary" onClick={() => void detailQuery.refetch()}>
            تلاش دوباره
          </UiButton>
        </div>
      ) : (
        <UiForm.Root onSubmit={(event) => void submit(event)}>
          <Controller
            name="image"
            control={control}
            render={({ field }) => (
              <UiImageInput
                key={`${detail.id}:${detail.imageVersion}`}
                id="edit-product-image"
                ref={field.ref}
                name={field.name}
                label="تصویر جدید (اختیاری)"
                help="انتخاب نکردن فایل، تصویر فعلی را حفظ می‌کند. فرمت‌های مجاز: JPG، JPEG، PNG و WebP — حجم حداکثر ۴۰۰ کیلوبایت است."
                error={errors.image?.message}
                disabled={submitting}
                toastKey="edit-product-image-validation-error"
                onBlur={field.onBlur}
                onChange={(file) => {
                  field.onChange(file);
                  if (file) clearErrors('image');
                }}
                onValidationError={(errorMessage) =>
                  setError('image', { type: 'validate', message: errorMessage })
                }
              />
            )}
          />

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
                <UiForm.Error>
                  دریافت دسته‌بندی‌ها ناموفق بود. فرم را ببندید و دوباره تلاش کنید.
                </UiForm.Error>
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
            <UiForm.Label htmlFor="edit-product-tag">تگ انگلیسی (اختیاری)</UiForm.Label>
            <UiForm.TextInput
              id="edit-product-tag"
              dir="ltr"
              autoComplete="off"
              maxLength={80}
              placeholder="my_amazing"
              disabled={submitting}
              aria-invalid={errors.tag ? 'true' : 'false'}
              aria-describedby={
                errors.tag
                  ? 'edit-product-tag-help edit-product-tag-error'
                  : 'edit-product-tag-help'
              }
              {...register('tag')}
            />
            <p id="edit-product-tag-help" className="text-muted m-0 text-xs leading-6">
              فقط حروف انگلیسی؛ برای چند کلمه از _ استفاده کنید.
            </p>
            {errors.tag ? (
              <UiForm.Error id="edit-product-tag-error">{errors.tag.message}</UiForm.Error>
            ) : null}
          </UiForm.Field>

          <fieldset className="border-border grid gap-5 rounded-xl border p-4">
            <legend className="text-foreground px-2 text-sm font-bold">قیمت و تنوع محصول</legend>
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
    tag: detail.tag ?? '',
    categoryId: detail.category.id,
    variantId: variant.id,
    size: variant.size ?? '',
    color: variant.color ?? '',
    originalPriceRial: String(detail.originalPriceRial),
    discountPercent: String(detail.discountPercent),
    onHandQuantity: String(variant.inventory.onHandQuantity),
  };
}

function setVariantValues(
  setValue: UseFormSetValue<EditProductFormValues>,
  variant: ProductVariant,
): void {
  setValue('size', variant.size ?? '');
  setValue('color', variant.color ?? '');
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
  const nextTag = values.tag || null;
  const nextSize = values.size || null;
  const nextColor = values.color || null;
  const nextOriginalPrice = Number(values.originalPriceRial);
  const nextDiscount = Number(values.discountPercent);
  const nextQuantity = Number(values.onHandQuantity);
  const productChanges = {
    ...(values.name === detail.name ? {} : { name: values.name }),
    ...(nextDescription === detail.description ? {} : { description: nextDescription }),
    ...(nextTag === detail.tag ? {} : { tag: nextTag }),
    ...(nextOriginalPrice === detail.originalPriceRial
      ? {}
      : { originalPriceRial: nextOriginalPrice }),
    ...(nextDiscount === detail.discountPercent ? {} : { discountPercent: nextDiscount }),
    ...(values.categoryId === detail.category.id ? {} : { categoryId: values.categoryId }),
  };
  const variantChanges = {
    ...(nextSize === variant.size ? {} : { size: nextSize }),
    ...(nextColor === variant.color ? {} : { color: nextColor }),
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

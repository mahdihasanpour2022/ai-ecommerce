'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { App } from 'antd';
import { useEffect, useRef, useState } from 'react';
import type { DefaultValues } from 'react-hook-form';
import { Controller, useForm } from 'react-hook-form';
import { UiButton } from '../../../app/components/shared/ui-button';
import { UiForm } from '../../../app/components/shared/ui-form';
import { UiModal } from '../../../app/components/shared/ui-modal';
import { UiSelect } from '../../../app/components/shared/ui-select';
import { normalizeHttpFailure } from '../../../app/http/http-client';
import { CATEGORY_OPTIONS_PAGE_SIZE } from '../../categories/constants/pagination';
import { useGetCategories } from '../../categories/hooks/useGetCategories';
import { categoryOptions } from '../../categories/utils/category-options';
import { useCreateProduct } from '../hooks/useCreateProduct';
import { useGetProductColors, useGetProductSizes } from '../hooks/useGetProductOptions';
import { useUploadProductImage } from '../hooks/useUploadProductImage';
import type { ProductDetail } from '../interfaces/product-contract';
import type { CreateProductFormValues } from '../schemas/create-product-schema';
import { createProductSchema } from '../schemas/create-product-schema';
import {
  imageSanitizer,
  PRODUCT_IMAGE_ACCEPT,
  ProductImageSanitizationError,
} from '../utils/image-sanitizer';
import { formatPriceInput, normalizePriceInput } from '../../../utils/price-input';

const DEFAULT_VALUES: DefaultValues<CreateProductFormValues> = {
  name: '',
  description: '',
  categoryId: '',
  size: '',
  color: '',
  priceRial: '',
  onHandQuantity: '',
};

export default function AddProduct({ onCreated }: Readonly<{ onCreated?: () => void }>) {
  const [open, setOpen] = useState(false);
  const [imageInputKey, setImageInputKey] = useState(0);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const submissionErrorRef = useRef<HTMLParagraphElement>(null);
  const { message } = App.useApp();
  const categories = useGetCategories({
    page: 1,
    pageSize: CATEGORY_OPTIONS_PAGE_SIZE,
    enabled: open,
  });
  const sizes = useGetProductSizes(open);
  const colors = useGetProductColors(open);
  const createProduct = useCreateProduct();
  const uploadProductImage = useUploadProductImage();
  const {
    control,
    register,
    handleSubmit,
    reset,
    clearErrors,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<CreateProductFormValues>({
    resolver: zodResolver(createProductSchema),
    defaultValues: DEFAULT_VALUES,
    mode: 'onChange',
    shouldFocusError: true,
  });
  const submitting = createProduct.isPending || uploadProductImage.isPending || isSubmitting;

  useEffect(() => {
    if (createProduct.error) submissionErrorRef.current?.focus();
  }, [createProduct.error]);

  const close = () => {
    if (submitting) return;
    setOpen(false);
    createProduct.reset();
    uploadProductImage.reset();
    reset(DEFAULT_VALUES);
    setImageInputKey((current) => current + 1);
  };

  const submit = handleSubmit(async (values) => {
    let createdProduct: ProductDetail | null = null;
    try {
      const response = await createProduct.mutateAsync({
        name: values.name,
        description: values.description || null,
        categoryId: values.categoryId,
        variants: [
          {
            size: values.size,
            color: values.color,
            priceRial: Number(values.priceRial),
            isActive: true,
            onHandQuantity: Number(values.onHandQuantity),
          },
        ],
      });
      createdProduct = response.singleResult;
      await uploadProductImage.mutateAsync({
        productId: createdProduct.id,
        imageVersion: createdProduct.imageVersion,
        file: values.image,
      });
      reset(DEFAULT_VALUES);
      setImageInputKey((current) => current + 1);
      setOpen(false);
      onCreated?.();
      await message.success('محصول و تصویر آن با موفقیت ایجاد شدند.');
    } catch (error) {
      const failure = normalizeHttpFailure(error);
      if (createdProduct) {
        reset(DEFAULT_VALUES);
        setImageInputKey((current) => current + 1);
        setOpen(false);
        onCreated?.();
        await message.error({
          key: 'product-image-upload-error',
          content: `محصول ایجاد شد، اما تصویر ذخیره نشد. ${failure.message}`,
        });
        return;
      }
      await message.error({
        key: 'product-create-error',
        content: failure.message,
      });
    }
  });

  const options = categories.data ? categoryOptions(categories.data.result) : [];
  const sizeOptions = (sizes.data?.result ?? []).map((size) => ({ value: size, label: size }));
  const colorOptions = (colors.data?.result ?? []).map((color) => ({
    value: color['color-name'],
    label: color['color-name'],
    hexCode: color['hex-code'],
  }));

  return (
    <div className="absolute left-0 top-0 flex justify-end">
      <UiButton ref={triggerRef} variant="primary" onClick={() => setOpen(true)}>
        افزودن محصول
      </UiButton>
      <UiModal.Root
        open={open}
        title="ایجاد محصول"
        width={720}
        closable={!submitting}
        keyboard={!submitting}
        mask={{ closable: !submitting }}
        onCancel={close}
        afterOpenChange={(isOpen) => {
          if (!isOpen) triggerRef.current?.focus();
        }}
      >
        <UiForm.Root onSubmit={(event) => void submit(event)}>
          <UiForm.Field>
            <UiForm.Label htmlFor="product-image">تصویر محصول</UiForm.Label>
            <Controller
              name="image"
              control={control}
              render={({ field }) => (
                <UiForm.TextInput
                  key={imageInputKey}
                  id="product-image"
                  ref={field.ref}
                  name={field.name}
                  type="file"
                  accept={PRODUCT_IMAGE_ACCEPT}
                  disabled={submitting}
                  aria-invalid={errors.image ? 'true' : 'false'}
                  aria-describedby={
                    errors.image ? 'product-image-help product-image-error' : 'product-image-help'
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
                          key: 'product-image-validation-error',
                          content: errorMessage,
                        });
                      });
                  }}
                />
              )}
            />
            <p id="product-image-help" className="m-0 text-xs leading-6 text-muted">
              فرمت‌های مجاز: JPG، JPEG، PNG و WebP — حجم حداکثر ۴۰۰ کیلوبایت است.
            </p>
            {errors.image ? (
              <UiForm.Error id="product-image-error">{errors.image.message}</UiForm.Error>
            ) : null}
          </UiForm.Field>

          <div className="grid gap-5 md:grid-cols-2">
            <UiForm.Field>
              <UiForm.Label htmlFor="product-name">نام محصول</UiForm.Label>
              <UiForm.TextInput
                id="product-name"
                autoComplete="off"
                autoFocus
                maxLength={200}
                placeholder="مثلاً پیراهن لینن"
                disabled={submitting}
                aria-invalid={errors.name ? 'true' : 'false'}
                aria-describedby={errors.name ? 'product-name-error' : undefined}
                {...register('name')}
              />
              {errors.name ? (
                <UiForm.Error id="product-name-error">{errors.name.message}</UiForm.Error>
              ) : null}
            </UiForm.Field>

            <UiForm.Field>
              <UiForm.Label htmlFor="product-category">دسته‌بندی</UiForm.Label>
              <Controller
                name="categoryId"
                control={control}
                render={({ field }) => (
                  <UiSelect.Root
                    id="product-category"
                    ref={field.ref}
                    value={field.value || null}
                    options={options.map((option) => ({
                      value: option.id,
                      label: option.label,
                      level: option.level,
                    }))}
                    placeholder="انتخاب دسته‌بندی"
                    loading={categories.isFetching}
                    disabled={submitting || categories.isFetching || categories.isError}
                    status={errors.categoryId ? 'error' : ''}
                    aria-invalid={errors.categoryId ? 'true' : 'false'}
                    aria-describedby={errors.categoryId ? 'product-category-error' : undefined}
                    onBlur={field.onBlur}
                    onChange={field.onChange}
                    optionRender={(option) => (
                      <UiSelect.OptionContent
                        label={option.label}
                        hint={`سطح ${String(option.data.level)}`}
                      />
                    )}
                  />
                )}
              />
              {errors.categoryId ? (
                <UiForm.Error id="product-category-error">{errors.categoryId.message}</UiForm.Error>
              ) : null}
              {categories.isError ? (
                <UiForm.Error>
                  دریافت دسته‌بندی‌ها ناموفق بود. فرم را ببندید و دوباره تلاش کنید.
                </UiForm.Error>
              ) : null}
            </UiForm.Field>
          </div>

          <UiForm.Field>
            <UiForm.Label htmlFor="product-description">توضیحات (اختیاری)</UiForm.Label>
            <UiForm.TextArea
              id="product-description"
              maxLength={200}
              placeholder="توضیح کوتاه محصول"
              disabled={submitting}
              aria-invalid={errors.description ? 'true' : 'false'}
              aria-describedby={
                errors.description
                  ? 'product-description-help product-description-error'
                  : 'product-description-help'
              }
              {...register('description')}
            />
            <p id="product-description-help" className="m-0 text-xs leading-6 text-muted">
              حداکثر ۲۰۰ کاراکتر.
            </p>
            {errors.description ? (
              <UiForm.Error id="product-description-error">
                {errors.description.message}
              </UiForm.Error>
            ) : null}
          </UiForm.Field>

          <fieldset className="grid gap-5 rounded-xl border border-border p-4">
            <legend className="px-2 text-sm font-bold text-foreground">تنوع اولیه</legend>
            <div className="grid gap-5 md:grid-cols-2">
              <UiForm.Field>
                <UiForm.Label htmlFor="product-price">قیمت (ریال)</UiForm.Label>
                <Controller
                  name="priceRial"
                  control={control}
                  render={({ field }) => (
                    <UiForm.TextInput
                      id="product-price"
                      ref={field.ref}
                      name={field.name}
                      className="h-14"
                      value={formatPriceInput(field.value)}
                      inputMode="numeric"
                      dir="ltr"
                      disabled={submitting}
                      aria-invalid={errors.priceRial ? 'true' : 'false'}
                      aria-describedby={errors.priceRial ? 'product-price-error' : undefined}
                      onBlur={field.onBlur}
                      onChange={(event) => field.onChange(normalizePriceInput(event.target.value))}
                    />
                  )}
                />
                {errors.priceRial ? (
                  <UiForm.Error id="product-price-error">{errors.priceRial.message}</UiForm.Error>
                ) : null}
              </UiForm.Field>

              <UiForm.Field>
                <UiForm.Label htmlFor="product-size">سایز</UiForm.Label>
                <Controller
                  name="size"
                  control={control}
                  render={({ field }) => (
                    <UiSelect.Root
                      id="product-size"
                      ref={field.ref}
                      value={field.value || null}
                      options={sizeOptions}
                      placeholder="انتخاب سایز"
                      notFoundContent="سایزی یافت نشد."
                      loading={sizes.isFetching}
                      disabled={submitting || sizes.isFetching || sizes.isError}
                      status={errors.size ? 'error' : ''}
                      aria-invalid={errors.size ? 'true' : 'false'}
                      aria-describedby={errors.size ? 'product-size-error' : undefined}
                      onBlur={field.onBlur}
                      onChange={field.onChange}
                    />
                  )}
                />
                {errors.size ? (
                  <UiForm.Error id="product-size-error">{errors.size.message}</UiForm.Error>
                ) : null}
                {sizes.isError ? (
                  <UiForm.Error>
                    دریافت گزینه‌های سایز ناموفق بود. فرم را ببندید و دوباره تلاش کنید.
                  </UiForm.Error>
                ) : null}
              </UiForm.Field>

              <UiForm.Field>
                <UiForm.Label htmlFor="product-color">رنگ</UiForm.Label>
                <Controller
                  name="color"
                  control={control}
                  render={({ field }) => (
                    <UiSelect.Root
                      id="product-color"
                      ref={field.ref}
                      value={field.value || null}
                      options={colorOptions}
                      placeholder="انتخاب رنگ"
                      notFoundContent="رنگی یافت نشد."
                      loading={colors.isFetching}
                      disabled={submitting || colors.isFetching || colors.isError}
                      status={errors.color ? 'error' : ''}
                      aria-invalid={errors.color ? 'true' : 'false'}
                      aria-describedby={errors.color ? 'product-color-error' : undefined}
                      onBlur={field.onBlur}
                      onChange={field.onChange}
                      optionRender={(option) => (
                        <div className="flex min-h-6 items-center gap-3">
                          <span
                            aria-hidden="true"
                            className="size-4 shrink-0 rounded-full border border-border"
                            style={{ backgroundColor: String(option.data.hexCode) }}
                          />
                          <span className="min-w-0 truncate text-sm font-semibold text-inherit">
                            {option.label}
                          </span>
                        </div>
                      )}
                    />
                  )}
                />
                {errors.color ? (
                  <UiForm.Error id="product-color-error">{errors.color.message}</UiForm.Error>
                ) : null}
                {colors.isError ? (
                  <UiForm.Error>
                    دریافت گزینه‌های رنگ ناموفق بود. فرم را ببندید و دوباره تلاش کنید.
                  </UiForm.Error>
                ) : null}
              </UiForm.Field>

              <UiForm.Field>
                <UiForm.Label htmlFor="product-quantity">موجودی اولیه</UiForm.Label>
                <UiForm.TextInput
                  id="product-quantity"
                  type="number"
                  inputMode="numeric"
                  className="h-14"
                  min={1}
                  max={2147483647}
                  step={1}
                  dir="ltr"
                  disabled={submitting}
                  aria-invalid={errors.onHandQuantity ? 'true' : 'false'}
                  aria-describedby={errors.onHandQuantity ? 'product-quantity-error' : undefined}
                  {...register('onHandQuantity')}
                />
                {errors.onHandQuantity ? (
                  <UiForm.Error id="product-quantity-error">
                    {errors.onHandQuantity.message}
                  </UiForm.Error>
                ) : null}
              </UiForm.Field>
            </div>
          </fieldset>

          {createProduct.error ? (
            <UiForm.SubmissionError ref={submissionErrorRef}>
              {createProduct.error.message}
            </UiForm.SubmissionError>
          ) : null}

          <UiForm.Actions>
            <UiButton variant="secondary" disabled={submitting} onClick={close}>
              انصراف
            </UiButton>
            <UiButton
              type="submit"
              disabled={
                submitting ||
                categories.isError ||
                sizes.isPending ||
                sizes.isError ||
                colors.isPending ||
                colors.isError
              }
              loading={submitting}
            >
              {submitting ? 'در حال ایجاد…' : 'ایجاد محصول'}
            </UiButton>
          </UiForm.Actions>
        </UiForm.Root>
      </UiModal.Root>
    </div>
  );
}

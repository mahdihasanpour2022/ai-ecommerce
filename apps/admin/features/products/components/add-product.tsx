'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import { App } from 'antd';
import { useEffect, useRef, useState } from 'react';
import type { DefaultValues } from 'react-hook-form';
import { Controller, useFieldArray, useForm } from 'react-hook-form';
import { UiButton } from '../../../app/components/shared/ui-button';
import { UiForm } from '../../../app/components/shared/ui-form';
import { UiImageInput } from '../../../app/components/shared/ui-image-input';
import { UiModal } from '../../../app/components/shared/ui-modal';
import { UiSelect } from '../../../app/components/shared/ui-select';
import { normalizeHttpFailure } from '../../../app/http/http-client';
import { CATEGORY_OPTIONS_PAGE_SIZE } from '../../categories/constants/pagination';
import { useGetCategories } from '../../categories/hooks/useGetCategories';
import { categoryOptions } from '../../categories/utils/category-options';
import { useCreateProduct } from '../hooks/useCreateProduct';
import { productKeys } from '../hooks/useGetProducts';
import { useGetProductColors } from '@/hooks/shared/useGetProductColors';
import { useGetProductSizes } from '@/hooks/shared/useGetProductSizes';
import { useGetProductTags } from '@/hooks/shared/useGetProductTags';
import { useUploadProductImage } from '../hooks/useUploadProductImage';
import type { RawProductDetail } from '../interfaces/product-contract';
import type { CreateProductFormValues } from '../schemas/create-product-schema';
import { createProductSchema } from '../schemas/create-product-schema';
import { formatPriceInput, normalizePriceInput } from '../../../utils/price-input';

const DEFAULT_VALUES: DefaultValues<CreateProductFormValues> = {
  name: '',
  description: '',
  tag: '',
  categoryId: '',
  originalPriceRial: '',
  discountPercent: '',
  variants: [{ image: undefined as unknown as File, size: '', color: '', onHandQuantity: '' }],
};

export default function AddProduct({ onCreated }: Readonly<{ onCreated?: () => void }>) {
  const queryClient = useQueryClient();
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
  const tags = useGetProductTags(open);
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
  // ردیف‌های واریانت با شناسه پایدار مدیریت می‌شوند تا افزودن و حذف، مقادیر دیگر را جابه‌جا نکند.
  const { fields: variantFields, append: appendVariant, remove: removeVariant } = useFieldArray({
    control,
    name: 'variants',
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
    let createdProduct: RawProductDetail | null = null;
    try {
      const response = await createProduct.mutateAsync({
        name: values.name,
        description: values.description || null,
        tag: values.tag || null,
        originalPriceRial: Number(values.originalPriceRial),
        discountPercent: Number(values.discountPercent),
        categoryId: values.categoryId,
        variants: values.variants.map((variant) => ({
          size: variant.size,
          color: variant.color,
          isActive: true,
          onHandQuantity: Number(variant.onHandQuantity),
        })),
      });
      createdProduct = response.singleResult;
      let imageVersion = createdProduct.imageVersion;
      // تصویر هر واریانت پس از ایجاد محصول به همان ترکیب رنگ و سایز متصل می‌شود.
      for (const variant of values.variants) {
        const createdVariant = createdProduct.variants.find(
          (item) => item.size === variant.size && item.color === variant.color,
        );
        if (!createdVariant) throw new Error('Created product variant is missing.');
        const uploadResponse = await uploadProductImage.mutateAsync({
          productId: createdProduct.id,
          variantId: createdVariant.id,
          imageVersion,
          file: variant.image,
        });
        imageVersion = uploadResponse.singleResult.imageVersion;
      }
      // لیست محصولات تنها پس از ذخیرهٔ کامل تصاویر واریانت‌ها دوباره دریافت می‌شود.
      await queryClient.invalidateQueries({ queryKey: productKeys.lists });
      reset(DEFAULT_VALUES);
      setImageInputKey((current) => current + 1);
      setOpen(false);
      onCreated?.();
      await message.success('محصول و تصاویر واریانت‌های آن با موفقیت ایجاد شدند.');
    } catch (error) {
      const failure = normalizeHttpFailure(error);
      if (createdProduct) {
        await queryClient.invalidateQueries({ queryKey: productKeys.lists });
        reset(DEFAULT_VALUES);
        setImageInputKey((current) => current + 1);
        setOpen(false);
        onCreated?.();
        await message.error({
          key: 'product-image-upload-error',
          content: `محصول ایجاد شد، اما ذخیره تصاویر واریانت‌ها کامل نشد. ${failure.message}`,
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
  const sizeOptions = (sizes.data?.result ?? []).map((size) => ({
    value: size['english-size-name'],
    label: size['english-size-name'],
  }));
  const colorOptions = (colors.data?.result ?? []).map((color) => ({
    value: color['english-color-name'],
    label: color['persian-color-name'],
    hexCode: color['hex-code'],
  }));
  // گزینه‌های تگ فقط از فهرست مدیریت‌شدهٔ سرور ساخته می‌شوند.
  const tagOptions = (tags.data?.result ?? []).map((tag) => ({
    value: tag['english-tag-name'],
    label: tag['english-tag-name'],
  }));

  return (
    <div className="absolute top-0 left-0 flex justify-end">
      <UiButton ref={triggerRef} variant="primary" onClick={() => setOpen(true)}>
        افزودن محصول
      </UiButton>
      <UiModal.Root
        open={open}
        title="ایجاد محصول"
        width={720}
        styles={{
          container: { display: 'flex', height: '50vh', flexDirection: 'column' },
          body: { minHeight: 0, flex: 1, overflowY: 'auto' },
        }}
        closable={!submitting}
        keyboard={!submitting}
        mask={{ closable: !submitting }}
        onCancel={close}
        afterOpenChange={(isOpen) => {
          if (!isOpen) triggerRef.current?.focus();
        }}
      >
        <UiForm.Root onSubmit={(event) => void submit(event)}>
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
            <p id="product-description-help" className="text-muted m-0 text-xs leading-6">
              حداکثر ۲۰۰ کاراکتر.
            </p>
            {errors.description ? (
              <UiForm.Error id="product-description-error">
                {errors.description.message}
              </UiForm.Error>
            ) : null}
          </UiForm.Field>

          <UiForm.Field>
            <UiForm.Label htmlFor="product-tag">تگ (اختیاری)</UiForm.Label>
            <Controller
              name="tag"
              control={control}
              render={({ field }) => (
                <UiSelect.Root
                  id="product-tag"
                  ref={field.ref}
                  value={field.value || null}
                  options={tagOptions}
                  placeholder="انتخاب تگ"
                  allowClear
                  showSearch
                  optionFilterProp="label"
                  loading={tags.isFetching}
                  disabled={submitting || tags.isFetching || tags.isError}
                  status={errors.tag ? 'error' : ''}
                  aria-invalid={errors.tag ? 'true' : 'false'}
                  aria-describedby={errors.tag ? 'product-tag-error' : undefined}
                  onBlur={field.onBlur}
                  onChange={(value) => field.onChange(value ?? '')}
                />
              )}
            />
            {errors.tag ? (
              <UiForm.Error id="product-tag-error">{errors.tag.message}</UiForm.Error>
            ) : null}
            {tags.isError ? (
              <UiForm.Error>دریافت تگ‌ها ناموفق بود. فرم را ببندید و دوباره تلاش کنید.</UiForm.Error>
            ) : null}
          </UiForm.Field>

          <fieldset className="border-border grid gap-5 rounded-xl border p-4">
            <legend className="text-foreground px-2 text-sm font-bold">قیمت و درصد تخفیف</legend>
            <div className="grid gap-5 md:grid-cols-2">
              <UiForm.Field>
                <UiForm.Label htmlFor="product-price">قیمت اصلی (ریال)</UiForm.Label>
                <Controller
                  name="originalPriceRial"
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
                      aria-invalid={errors.originalPriceRial ? 'true' : 'false'}
                      aria-describedby={
                        errors.originalPriceRial ? 'product-price-error' : undefined
                      }
                      onBlur={field.onBlur}
                      onChange={(event) => field.onChange(normalizePriceInput(event.target.value))}
                    />
                  )}
                />
                {errors.originalPriceRial ? (
                  <UiForm.Error id="product-price-error">
                    {errors.originalPriceRial.message}
                  </UiForm.Error>
                ) : null}
              </UiForm.Field>

              <UiForm.Field>
                <UiForm.Label htmlFor="product-discount">درصد تخفیف</UiForm.Label>
                <Controller
                  name="discountPercent"
                  control={control}
                  render={({ field }) => (
                    <UiForm.TextInput
                      id="product-discount"
                      ref={field.ref}
                      name={field.name}
                      className="h-14"
                      value={field.value}
                      inputMode="numeric"
                      dir="ltr"
                      disabled={submitting}
                      aria-invalid={errors.discountPercent ? 'true' : 'false'}
                      aria-describedby={
                        errors.discountPercent ? 'product-discount-error' : undefined
                      }
                      onBlur={field.onBlur}
                      onChange={(event) => field.onChange(normalizePriceInput(event.target.value))}
                    />
                  )}
                />
                {errors.discountPercent ? (
                  <UiForm.Error id="product-discount-error">
                    {errors.discountPercent.message}
                  </UiForm.Error>
                ) : null}
              </UiForm.Field>

              {/* هر ترکیب قابل فروش، موجودی مستقل خود را در همین بخش دریافت می‌کند. */}
              <div className="grid gap-4 md:col-span-2">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-foreground text-sm font-bold">واریانت‌های محصول</h3>
                    <p className="text-muted mt-1 text-xs">
                      برای هر ترکیب رنگ و سایز، تصویر و موجودی مستقل وارد کنید.
                    </p>
                  </div>
                  <UiButton
                    type="button"
                    size="small"
                    variant="secondary"
                    onClick={() =>
                      appendVariant({
                        image: undefined as unknown as File,
                        size: '',
                        color: '',
                        onHandQuantity: '',
                      })
                    }
                    disabled={submitting || variantFields.length >= 9}
                  >
                    افزودن واریانت
                  </UiButton>
                </div>

                <div className="grid gap-4">
                  {variantFields.map((variantField, index) => {
                    const variantErrors = errors.variants?.[index];
                    const sizeErrorId = `product-variant-${index}-size-error`;
                    const colorErrorId = `product-variant-${index}-color-error`;
                    const quantityErrorId = `product-variant-${index}-quantity-error`;

                    return (
                      <section
                        key={variantField.id}
                        aria-label={`واریانت ${index + 1}`}
                        className="border-border grid gap-4 rounded-xl border p-4 sm:grid-cols-2"
                      >
                        <div className="flex items-center justify-between gap-3 sm:col-span-2">
                          <span className="text-foreground text-sm font-bold">
                            واریانت {index + 1}
                          </span>
                          <UiButton
                            type="button"
                            size="small"
                            variant="dangerSubtle"
                            disabled={submitting || variantFields.length === 1}
                            aria-label={`حذف واریانت ${index + 1}`}
                            onClick={() => removeVariant(index)}
                          >
                            حذف
                          </UiButton>
                        </div>

                        <div className="sm:col-span-2">
                          <Controller
                            name={`variants.${index}.image`}
                            control={control}
                            render={({ field }) => (
                              <UiImageInput
                                key={`${imageInputKey}-${variantField.id}`}
                                id={`product-variant-${index}-image`}
                                ref={field.ref}
                                name={field.name}
                                label="تصویر واریانت"
                                help="فرمت‌های مجاز: JPG، JPEG، PNG و WebP — حجم حداکثر ۴۰۰ کیلوبایت است."
                                error={variantErrors?.image?.message}
                                disabled={submitting}
                                toastKey={`product-variant-${index}-image-validation-error`}
                                onBlur={field.onBlur}
                                onChange={(file) => {
                                  field.onChange(file);
                                  if (file) clearErrors(`variants.${index}.image`);
                                }}
                                onValidationError={(errorMessage) =>
                                  setError(`variants.${index}.image`, {
                                    type: 'validate',
                                    message: errorMessage,
                                  })
                                }
                              />
                            )}
                          />
                        </div>

                        <UiForm.Field>
                          <UiForm.Label htmlFor={`product-variant-${index}-size`}>
                            سایز
                          </UiForm.Label>
                          <Controller
                            name={`variants.${index}.size`}
                            control={control}
                            render={({ field }) => (
                              <UiSelect.Root
                                id={`product-variant-${index}-size`}
                                ref={field.ref}
                                value={field.value || null}
                                options={sizeOptions}
                                placeholder="انتخاب سایز"
                                notFoundContent="سایزی یافت نشد."
                                loading={sizes.isFetching}
                                disabled={submitting || sizes.isFetching || sizes.isError}
                                status={variantErrors?.size ? 'error' : ''}
                                aria-invalid={variantErrors?.size ? 'true' : 'false'}
                                aria-describedby={variantErrors?.size ? sizeErrorId : undefined}
                                onBlur={field.onBlur}
                                onChange={field.onChange}
                              />
                            )}
                          />
                          {variantErrors?.size ? (
                            <UiForm.Error id={sizeErrorId}>
                              {variantErrors.size.message}
                            </UiForm.Error>
                          ) : null}
                        </UiForm.Field>

                        <UiForm.Field>
                          <UiForm.Label htmlFor={`product-variant-${index}-color`}>
                            رنگ
                          </UiForm.Label>
                          <Controller
                            name={`variants.${index}.color`}
                            control={control}
                            render={({ field }) => (
                              <UiSelect.Root
                                id={`product-variant-${index}-color`}
                                ref={field.ref}
                                value={field.value || null}
                                options={colorOptions}
                                placeholder="انتخاب رنگ"
                                notFoundContent="رنگی یافت نشد."
                                loading={colors.isFetching}
                                disabled={submitting || colors.isFetching || colors.isError}
                                status={variantErrors?.color ? 'error' : ''}
                                aria-invalid={variantErrors?.color ? 'true' : 'false'}
                                aria-describedby={variantErrors?.color ? colorErrorId : undefined}
                                onBlur={field.onBlur}
                                onChange={field.onChange}
                                optionRender={(option) => (
                                  <div className="flex min-h-6 items-center gap-3">
                                    <span
                                      aria-hidden="true"
                                      className="border-border size-4 shrink-0 rounded-full border"
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
                          {variantErrors?.color ? (
                            <UiForm.Error id={colorErrorId}>
                              {variantErrors.color.message}
                            </UiForm.Error>
                          ) : null}
                        </UiForm.Field>

                        <UiForm.Field className="sm:col-span-2">
                          <UiForm.Label htmlFor={`product-variant-${index}-quantity`}>
                            موجودی اولیه
                          </UiForm.Label>
                          <UiForm.TextInput
                            id={`product-variant-${index}-quantity`}
                            type="number"
                            inputMode="numeric"
                            className="h-14"
                            min={1}
                            max={2147483647}
                            step={1}
                            dir="ltr"
                            disabled={submitting}
                            aria-invalid={variantErrors?.onHandQuantity ? 'true' : 'false'}
                            aria-describedby={
                              variantErrors?.onHandQuantity ? quantityErrorId : undefined
                            }
                            {...register(`variants.${index}.onHandQuantity`)}
                          />
                          {variantErrors?.onHandQuantity ? (
                            <UiForm.Error id={quantityErrorId}>
                              {variantErrors.onHandQuantity.message}
                            </UiForm.Error>
                          ) : null}
                        </UiForm.Field>
                      </section>
                    );
                  })}
                </div>

                {sizes.isError ? (
                  <UiForm.Error>
                    دریافت گزینه‌های سایز ناموفق بود. فرم را ببندید و دوباره تلاش کنید.
                  </UiForm.Error>
                ) : null}
                {colors.isError ? (
                  <UiForm.Error>
                    دریافت گزینه‌های رنگ ناموفق بود. فرم را ببندید و دوباره تلاش کنید.
                  </UiForm.Error>
                ) : null}
              </div>
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

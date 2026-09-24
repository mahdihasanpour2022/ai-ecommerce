'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useId, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { UiButton } from '../../../app/components/shared/ui-button';
import { UiForm } from '../../../app/components/shared/ui-form';
import { formatPriceInput, normalizePriceInput } from '../../../utils/price-input';
import { CATEGORY_OPTIONS_PAGE_SIZE } from '../../categories/constants/pagination';
import { useGetCategories } from '../../categories/hooks/useGetCategories';
import { categoryOptions } from '../../categories/utils/category-options';
import { useGetProductColors, useGetProductSizes, useGetProductStatuses } from '../hooks/useGetProductOptions';
import { productFilterFormValues } from '../hooks/use-product-filters';
import type { ProductFilters } from '../interfaces/product-filter';
import { productFilterCount } from '../interfaces/product-filter';
import type { ProductFilterFormValues } from '../schemas/product-filter-schema';
import { productFilterSchema } from '../schemas/product-filter-schema';
import { PersianDateTimePicker } from './persian-date-time-picker';

interface ProductFilterPanelProps {
  readonly filters: ProductFilters;
  readonly onApply: (values: ProductFilterFormValues) => void;
  readonly onClear: () => void;
}

export function ProductFilterPanel({ filters, onApply, onClear }: ProductFilterPanelProps) {
  const activeCount = productFilterCount(filters);
  const panelId = useId();
  const [open, setOpen] = useState(activeCount > 0);
  const categories = useGetCategories({ page: 1, pageSize: CATEGORY_OPTIONS_PAGE_SIZE, enabled: open });
  const sizes = useGetProductSizes(open);
  const colors = useGetProductColors(open);
  const statuses = useGetProductStatuses(open);
  const { control, register, handleSubmit, reset, formState: { errors } } = useForm<ProductFilterFormValues>({
    resolver: zodResolver(productFilterSchema),
    defaultValues: productFilterFormValues(filters),
    shouldFocusError: true,
  });

  useEffect(() => reset(productFilterFormValues(filters)), [filters, reset]);

  const categoryItems = categories.data ? categoryOptions(categories.data.result) : [];
  const optionLoading = categories.isPending || sizes.isPending || colors.isPending || statuses.isPending;

  function clear() {
    reset(productFilterFormValues({}));
    onClear();
  }

  return (
    <section className="mb-6 overflow-hidden rounded-2xl border border-border bg-surface shadow-panel">
      <button
        type="button"
        className="flex min-h-14 w-full cursor-pointer items-center justify-between gap-4 bg-surface px-4 py-3 text-start transition-colors hover:bg-surface-subtle focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-brand sm:px-5"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}
      >
        <span className="min-w-0">
          <span className="block text-sm font-bold text-foreground">فیلتر محصولات</span>
          <span className="mt-1 block text-xs text-muted">
            {activeCount > 0 ? `${activeCount} فیلتر فعال` : 'جست‌وجو و محدودکردن نتایج جدول'}
          </span>
        </span>
        <span aria-hidden="true" className={`text-xl leading-none text-muted transition-transform ${open ? 'rotate-180' : ''}`}>⌄</span>
      </button>

      {open ? (
        <div id={panelId} className="border-t border-border p-4 sm:p-5">
          <UiForm.Root onSubmit={(event) => void handleSubmit(onApply)(event)}>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              <UiForm.Field>
                <UiForm.Label htmlFor="product-filter-name">نام محصول</UiForm.Label>
                <UiForm.TextInput id="product-filter-name" maxLength={200} autoComplete="off" placeholder="بخشی از نام محصول" aria-invalid={errors.name ? 'true' : 'false'} aria-describedby={errors.name ? 'product-filter-name-error' : undefined} {...register('name')} />
                {errors.name ? <UiForm.Error id="product-filter-name-error">{errors.name.message}</UiForm.Error> : null}
              </UiForm.Field>

              <UiForm.Field>
                <UiForm.Label htmlFor="product-filter-category">دسته‌بندی</UiForm.Label>
                <Controller name="categoryId" control={control} render={({ field }) => (
                  <UiForm.Select id="product-filter-category" disabled={categories.isPending} {...field}>
                    <UiForm.Option value="">{categories.isPending ? 'در حال دریافت دسته‌بندی‌ها…' : 'همه دسته‌بندی‌ها'}</UiForm.Option>
                    {categoryItems.map((option) => <UiForm.Option key={option.id} value={option.id}>{option.label}</UiForm.Option>)}
                  </UiForm.Select>
                )} />
                {categories.isError ? <UiForm.Error>دریافت دسته‌بندی‌ها ناموفق بود.</UiForm.Error> : null}
              </UiForm.Field>

              <UiForm.Field>
                <UiForm.Label htmlFor="product-filter-size">سایز</UiForm.Label>
                <Controller name="size" control={control} render={({ field }) => (
                  <UiForm.Select id="product-filter-size" disabled={sizes.isPending} className='pl-10!' {...field}>
                    <UiForm.Option value="">{sizes.isPending ? 'در حال دریافت سایزها…' : 'همه سایزها'}</UiForm.Option>
                    {sizes.data?.result.map((size) => <UiForm.Option key={size} value={size}>{size}</UiForm.Option>)}
                  </UiForm.Select>
                )} />
                {sizes.isError ? <UiForm.Error>دریافت سایزها ناموفق بود.</UiForm.Error> : null}
              </UiForm.Field>

              <UiForm.Field>
                <UiForm.Label htmlFor="product-filter-color">رنگ</UiForm.Label>
                <Controller name="color" control={control} render={({ field }) => (
                  <UiForm.Select id="product-filter-color" disabled={colors.isPending} {...field}>
                    <UiForm.Option value="">{colors.isPending ? 'در حال دریافت رنگ‌ها…' : 'همه رنگ‌ها'}</UiForm.Option>
                    {colors.data?.result.map((color) => <UiForm.Option key={color['color-name']} value={color['color-name']}>{color['color-name']}</UiForm.Option>)}
                  </UiForm.Select>
                )} />
                {colors.isError ? <UiForm.Error>دریافت رنگ‌ها ناموفق بود.</UiForm.Error> : null}
              </UiForm.Field>

              <UiForm.Field>
                <UiForm.Label htmlFor="product-filter-status">وضعیت محصول</UiForm.Label>
                <Controller name="status" control={control} render={({ field }) => (
                  <UiForm.Select id="product-filter-status" disabled={statuses.isPending} {...field}>
                    <UiForm.Option value="">{statuses.isPending ? 'در حال دریافت وضعیت‌ها…' : 'همه وضعیت‌ها'}</UiForm.Option>
                    {statuses.data?.result.map((status) => <UiForm.Option key={status.status_english_name} value={status.status_english_name}>{status.status_persian_name}</UiForm.Option>)}
                  </UiForm.Select>
                )} />
                {statuses.isError ? <UiForm.Error>دریافت وضعیت‌ها ناموفق بود.</UiForm.Error> : null}
              </UiForm.Field>

              <UiForm.Field>
                <UiForm.Label htmlFor="product-filter-availability">موجودی</UiForm.Label>
                <UiForm.Select id="product-filter-availability" {...register('availability')}>
                  <UiForm.Option value="">همه محصولات</UiForm.Option>
                  <UiForm.Option value="IN_STOCK">موجود</UiForm.Option>
                  <UiForm.Option value="OUT_OF_STOCK">ناموجود</UiForm.Option>
                </UiForm.Select>
              </UiForm.Field>

              <UiForm.Field>
                <UiForm.Label htmlFor="product-filter-created-from">ایجاد از تاریخ</UiForm.Label>
                <Controller name="createdFrom" control={control} render={({ field }) => (
                  <PersianDateTimePicker
                    id="product-filter-created-from"
                    name={field.name}
                    value={field.value}
                    placeholder="انتخاب تاریخ و ساعت شروع"
                    invalid={Boolean(errors.createdFrom)}
                    describedBy={errors.createdFrom ? 'product-filter-created-from-error' : undefined}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                  />
                )} />
                {errors.createdFrom ? <UiForm.Error id="product-filter-created-from-error">{errors.createdFrom.message}</UiForm.Error> : null}
              </UiForm.Field>

              <UiForm.Field>
                <UiForm.Label htmlFor="product-filter-created-to">ایجاد تا تاریخ</UiForm.Label>
                <Controller name="createdTo" control={control} render={({ field }) => (
                  <PersianDateTimePicker
                    id="product-filter-created-to"
                    name={field.name}
                    value={field.value}
                    placeholder="انتخاب تاریخ و ساعت پایان"
                    invalid={Boolean(errors.createdTo)}
                    describedBy={errors.createdTo ? 'product-filter-created-to-error' : undefined}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                  />
                )} />
                {errors.createdTo ? <UiForm.Error id="product-filter-created-to-error">{errors.createdTo.message}</UiForm.Error> : null}
              </UiForm.Field>

              <UiForm.Field>
                <UiForm.Label htmlFor="product-filter-minimum-price">حداقل قیمت (ریال)</UiForm.Label>
                <Controller name="minimumPriceRial" control={control} render={({ field }) => (
                  <UiForm.TextInput
                    id="product-filter-minimum-price"
                    ref={field.ref}
                    name={field.name}
                    type="text"
                    inputMode="numeric"
                    autoComplete="off"
                    value={formatPriceInput(field.value)}
                    aria-invalid={errors.minimumPriceRial ? 'true' : 'false'}
                    aria-describedby={errors.minimumPriceRial ? 'product-filter-minimum-price-error' : undefined}
                    onBlur={field.onBlur}
                    onChange={(event) => field.onChange(normalizePriceInput(event.target.value))}
                  />
                )} />
                {errors.minimumPriceRial ? <UiForm.Error id="product-filter-minimum-price-error">{errors.minimumPriceRial.message}</UiForm.Error> : null}
              </UiForm.Field>

              <UiForm.Field>
                <UiForm.Label htmlFor="product-filter-maximum-price">حداکثر قیمت (ریال)</UiForm.Label>
                <Controller name="maximumPriceRial" control={control} render={({ field }) => (
                  <UiForm.TextInput
                    id="product-filter-maximum-price"
                    ref={field.ref}
                    name={field.name}
                    type="text"
                    inputMode="numeric"
                    autoComplete="off"
                    value={formatPriceInput(field.value)}
                    aria-invalid={errors.maximumPriceRial ? 'true' : 'false'}
                    aria-describedby={errors.maximumPriceRial ? 'product-filter-maximum-price-error' : undefined}
                    onBlur={field.onBlur}
                    onChange={(event) => field.onChange(normalizePriceInput(event.target.value))}
                  />
                )} />
                {errors.maximumPriceRial ? <UiForm.Error id="product-filter-maximum-price-error">{errors.maximumPriceRial.message}</UiForm.Error> : null}
              </UiForm.Field>
            </div>

            <UiForm.Actions className="border-t border-border pt-4">
              <UiButton variant="secondary" onClick={clear}>حذف همه فیلترها</UiButton>
              <UiButton type="submit" disabled={optionLoading}>اعمال فیلترها</UiButton>
            </UiForm.Actions>
          </UiForm.Root>
        </div>
      ) : null}
    </section>
  );
}

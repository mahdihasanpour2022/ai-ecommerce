'use client';

import { Input, Radio, Select } from 'antd';
import { useRouter } from 'next/navigation';
import { Controller, useFieldArray, useForm } from 'react-hook-form';
import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../../auth/auth-provider';
import { createSubmissionGate } from '../../auth/submission-gate';
import { ControlledTextField } from '../../forms/controlled-text-field';
import type { CatalogApi, CreateProductInput } from '../catalog-api';
import { catalogApi } from '../catalog-api';
import type { CategoryDto, PriceDisplayUnit } from '../catalog-contracts';
import { useCatalogCapabilities } from '../catalog-shell';
import { CatalogState } from '../catalog-state';
import { productFailurePresentation } from './product-failures';
import type { ProductFailureField } from './product-failures';
import {
  descriptionError,
  flattenCategories,
  normalizeDescription,
  normalizeSingleLine,
  normalizeSku,
  optionError,
  parseQuantityInput,
  priceInputToRial,
  productNameError,
  skuError,
} from './product-model';

type ProductCreateClient = Pick<CatalogApi, 'categories' | 'priceDisplaySetting' | 'createProduct'>;

type VariantMode = 'default' | 'named';

interface VariantFormValues {
  readonly sku: string;
  readonly size: string;
  readonly color: string;
  readonly price: string;
  readonly quantity: string;
}

interface ProductFormValues {
  readonly name: string;
  readonly description: string;
  readonly categoryId: string;
  readonly mode: VariantMode;
  readonly variants: readonly VariantFormValues[];
}

const EMPTY_VARIANT: VariantFormValues = {
  sku: '',
  size: '',
  color: '',
  price: '',
  quantity: '۰',
};

function TextAreaField({
  control,
  disabled,
}: Readonly<{
  control: ReturnType<typeof useForm<ProductFormValues>>['control'];
  disabled: boolean;
}>) {
  return (
    <Controller
      control={control}
      name="description"
      rules={{ validate: (value) => descriptionError(value) ?? true }}
      render={({ field, fieldState }) => (
        <div className="controlled-field">
          <label htmlFor="product-description">توضیحات (اختیاری)</label>
          <Input.TextArea
            id="product-description"
            value={field.value}
            onChange={field.onChange}
            onBlur={field.onBlur}
            ref={field.ref}
            disabled={disabled}
            rows={5}
            maxLength={5000}
            aria-invalid={fieldState.invalid}
            {...(fieldState.error ? { 'aria-describedby': 'product-description-error' } : {})}
            {...(fieldState.invalid ? { status: 'error' as const } : {})}
          />
          <p className="field-hint">متن ساده، حداکثر ۵۰۰۰ نویسه</p>
          {fieldState.error ? (
            <p id="product-description-error" className="field-error" role="alert">
              {fieldState.error.message}
            </p>
          ) : null}
        </div>
      )}
    />
  );
}

export function ProductCreateView({
  canManage,
  client = catalogApi,
  onCreated,
  onCancel,
  onPermissionDenied = () => undefined,
}: Readonly<{
  canManage: boolean;
  client?: ProductCreateClient;
  onCreated(productId: string): void;
  onCancel(): void;
  onPermissionDenied?: () => void;
}>) {
  const summaryRef = useRef<HTMLParagraphElement>(null);
  const [submissionGate] = useState(() =>
    createSubmissionGate<readonly [ProductFormValues], void>(),
  );
  const [loadState, setLoadState] = useState<'loading' | 'ready' | 'error' | 'forbidden'>(
    'loading',
  );
  const [loadMessage, setLoadMessage] = useState('');
  const [categories, setCategories] = useState<readonly CategoryDto[]>([]);
  const [unit, setUnit] = useState<PriceDisplayUnit>('RIAL');
  const [summary, setSummary] = useState<string | null>(null);
  const {
    control,
    getValues,
    handleSubmit,
    setError,
    setFocus,
    reset,
    watch,
    formState: { isDirty, isSubmitting },
  } = useForm<ProductFormValues>({
    defaultValues: {
      name: '',
      description: '',
      categoryId: '',
      mode: 'default',
      variants: [EMPTY_VARIANT],
    },
    shouldFocusError: true,
  });
  const { fields, append, remove, replace } = useFieldArray({ control, name: 'variants' });
  // React Hook Form intentionally exposes an imperative subscription here.
  // eslint-disable-next-line react-hooks/incompatible-library
  const mode = watch('mode');

  async function load(signal?: AbortSignal) {
    setLoadState('loading');
    setLoadMessage('');
    try {
      const [tree, setting] = await Promise.all([
        client.categories(signal),
        client.priceDisplaySetting(signal),
      ]);
      setCategories(tree);
      setUnit(setting.unit);
      setLoadState('ready');
    } catch (error) {
      const failure = productFailurePresentation(error);
      if (failure.code === 'REQUEST_CANCELED') return;
      if (failure.code === 'INSUFFICIENT_PERMISSION') {
        setLoadState('forbidden');
        onPermissionDenied();
      } else {
        setLoadState('error');
      }
      setLoadMessage(failure.message);
    }
  }

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
    // The injected client is stable for the lifetime of this route view.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client]);

  useEffect(() => {
    const preventUnload = (event: BeforeUnloadEvent) => {
      if (!isDirty) return;
      event.preventDefault();
      event.returnValue = '';
    };
    const guardLinks = (event: MouseEvent) => {
      if (!isDirty || event.defaultPrevented || event.button !== 0) return;
      const target = event.target instanceof Element ? event.target.closest('a[href]') : null;
      if (!target || !window.confirm('تغییرات ذخیره‌نشده کنار گذاشته شود؟')) {
        if (target) event.preventDefault();
      }
    };
    window.addEventListener('beforeunload', preventUnload);
    document.addEventListener('click', guardLinks, true);
    return () => {
      window.removeEventListener('beforeunload', preventUnload);
      document.removeEventListener('click', guardLinks, true);
    };
  }, [isDirty]);

  function changeMode(nextMode: VariantMode) {
    if (nextMode === 'default') {
      const first = getValues('variants.0') ?? EMPTY_VARIANT;
      replace([{ ...first, size: '', color: '' }]);
    }
  }

  function focusSummary(message: string) {
    setSummary(message);
    globalThis.setTimeout(() => summaryRef.current?.focus(), 0);
  }

  function setServerFieldError(field: ProductFailureField, message: string) {
    const names: Record<
      ProductFailureField,
      | 'name'
      | 'description'
      | 'categoryId'
      | 'variants.0.sku'
      | 'variants.0.size'
      | 'variants.0.color'
      | 'variants.0.price'
      | 'variants.0.quantity'
    > = {
      name: 'name',
      description: 'description',
      categoryId: 'categoryId',
      sku: 'variants.0.sku',
      size: 'variants.0.size',
      color: 'variants.0.color',
      price: 'variants.0.price',
      quantity: 'variants.0.quantity',
    };
    const name = names[field];
    setError(name, { type: 'server', message });
    globalThis.setTimeout(() => setFocus(name), 0);
  }

  async function create(values: ProductFormValues) {
    setSummary(null);
    const normalizedVariants = values.variants.map((variant) => ({
      sku: normalizeSku(variant.sku),
      size: normalizeSingleLine(variant.size) || null,
      color: normalizeSingleLine(variant.color) || null,
      priceRial: priceInputToRial(variant.price, unit),
      onHandQuantity: parseQuantityInput(variant.quantity),
    }));
    if (
      (values.mode === 'default' &&
        (normalizedVariants.length !== 1 ||
          normalizedVariants[0]?.size !== null ||
          normalizedVariants[0]?.color !== null)) ||
      (values.mode === 'named' &&
        normalizedVariants.some((variant) => variant.size === null && variant.color === null))
    ) {
      focusSummary('تنوع‌ها با حالت انتخاب‌شده سازگار نیستند.');
      return;
    }
    const skus = normalizedVariants.map((variant) => variant.sku);
    if (new Set(skus).size !== skus.length) {
      setServerFieldError('sku', 'کد کالا بین تنوع‌ها باید یکتا باشد.');
      focusSummary('کد کالای تکراری را اصلاح کنید.');
      return;
    }
    const combinations = normalizedVariants.map(
      (variant) =>
        `${variant.size?.toLocaleLowerCase('fa-IR') ?? ''}\u0000${variant.color?.toLocaleLowerCase('fa-IR') ?? ''}`,
    );
    if (new Set(combinations).size !== combinations.length) {
      focusSummary('ترکیب اندازه و رنگ بین تنوع‌ها باید یکتا باشد.');
      return;
    }
    if (
      normalizedVariants.some(
        (variant) => variant.priceRial === null || variant.onHandQuantity === null,
      )
    ) {
      focusSummary('قیمت یا موجودی یکی از تنوع‌ها معتبر نیست.');
      return;
    }

    const input: CreateProductInput = {
      name: normalizeSingleLine(values.name),
      description: normalizeDescription(values.description),
      categoryId: values.categoryId,
      variants: normalizedVariants.map((variant) => ({
        sku: variant.sku,
        size: variant.size,
        color: variant.color,
        priceRial: variant.priceRial as number,
        isActive: true,
        onHandQuantity: variant.onHandQuantity as number,
      })),
    };
    try {
      const product = await client.createProduct(input);
      reset(values);
      onCreated(product.id);
    } catch (error) {
      const failure = productFailurePresentation(error);
      setSummary(failure.message);
      if (failure.field) setServerFieldError(failure.field, failure.message);
      else globalThis.setTimeout(() => summaryRef.current?.focus(), 0);
      if (failure.code === 'INSUFFICIENT_PERMISSION') onPermissionDenied();
    }
  }

  if (!canManage || loadState === 'forbidden') {
    return (
      <CatalogState
        kind="forbidden"
        title="ایجاد محصول مجاز نیست"
        message="این حساب مجوز لازم برای ایجاد محصول را ندارد. دسترسی سمت سرور نیز مستقل بررسی می‌شود."
        returnHref="/catalog/products"
        returnLabel="بازگشت به محصولات"
      />
    );
  }
  if (loadState === 'loading') {
    return (
      <CatalogState
        kind="loading"
        title="در حال آماده‌سازی فرم"
        message="دسته‌بندی‌ها و واحد قیمت در حال دریافت هستند."
      />
    );
  }
  if (loadState === 'error') {
    return (
      <CatalogState
        kind="error"
        title="آماده‌سازی فرم ممکن نشد"
        message={loadMessage}
        onRetry={() => void load()}
      />
    );
  }

  const categoryOptions = flattenCategories(categories);
  if (categoryOptions.length === 0) {
    return (
      <CatalogState
        kind="empty"
        title="ابتدا دسته‌بندی ایجاد کنید"
        message="برای ایجاد محصول، دست‌کم یک دسته‌بندی لازم است."
        returnHref="/catalog/categories"
        returnLabel="رفتن به دسته‌بندی‌ها"
      />
    );
  }

  const submit = handleSubmit((values) => submissionGate.run(create, values));
  const discard = () => {
    if (isDirty && !window.confirm('تغییرات ذخیره‌نشده کنار گذاشته شود؟')) return;
    onCancel();
  };

  return (
    <section className="product-create" aria-labelledby="product-create-heading">
      <h1 id="product-create-heading">ایجاد محصول پیش‌نویس</h1>
      <p>
        وضعیت محصول هنگام ایجاد «پیش‌نویس» است. واحد این فرم تا زمان خروج{' '}
        <strong>{unit === 'TOMAN' ? 'تومان' : 'ریال'}</strong> باقی می‌ماند.
      </p>
      <form className="product-create-form" noValidate onSubmit={(event) => void submit(event)}>
        {summary ? (
          <p ref={summaryRef} className="form-error" role="alert" tabIndex={-1}>
            {summary}
          </p>
        ) : null}
        <ControlledTextField
          control={control}
          name="name"
          label="نام محصول (الزامی)"
          disabled={isSubmitting}
          autoComplete="off"
          rules={{ validate: (value) => productNameError(value) ?? true }}
        />
        <TextAreaField control={control} disabled={isSubmitting} />
        <Controller
          control={control}
          name="categoryId"
          rules={{ required: 'انتخاب دسته‌بندی الزامی است.' }}
          render={({ field, fieldState }) => (
            <div className="controlled-field">
              <label htmlFor="product-category">دسته‌بندی (الزامی)</label>
              <Select
                id="product-category"
                value={field.value || undefined}
                placeholder="یک دسته‌بندی انتخاب کنید"
                onChange={field.onChange}
                onBlur={field.onBlur}
                ref={field.ref}
                disabled={isSubmitting}
                {...(fieldState.invalid ? { status: 'error' as const } : {})}
                aria-invalid={fieldState.invalid}
                options={categoryOptions.map((category) => ({
                  value: category.id,
                  label: `${'— '.repeat(Math.max(0, category.level - 1))}${category.name}`,
                }))}
                getPopupContainer={(trigger) => trigger.parentElement ?? trigger}
              />
              {fieldState.error ? (
                <p className="field-error" role="alert">
                  {fieldState.error.message}
                </p>
              ) : null}
            </div>
          )}
        />
        <fieldset className="variant-mode" disabled={isSubmitting}>
          <legend>حالت تنوع (الزامی)</legend>
          <Controller
            control={control}
            name="mode"
            render={({ field }) => (
              <Radio.Group
                name={field.name}
                value={field.value}
                onChange={(event) => {
                  field.onChange(event.target.value);
                  changeMode(event.target.value as VariantMode);
                }}
              >
                <Radio value="default">بدون گزینه؛ دقیقاً یک تنوع</Radio>
                <Radio value="named">دارای اندازه یا رنگ</Radio>
              </Radio.Group>
            )}
          />
          <p className="field-hint">این حالت پس از ایجاد در Sprint 3 قابل تبدیل نیست.</p>
        </fieldset>

        <div className="variant-list">
          {fields.map((field, index) => (
            <fieldset className="variant-card" key={field.id} disabled={isSubmitting}>
              <legend>تنوع {index + 1}</legend>
              <ControlledTextField
                control={control}
                name={`variants.${index}.sku`}
                label="کد کالا (الزامی)"
                autoComplete="off"
                rules={{ validate: (value) => skuError(value) ?? true }}
              />
              {mode === 'named' ? (
                <div className="variant-options">
                  <ControlledTextField
                    control={control}
                    name={`variants.${index}.size`}
                    label="اندازه (اختیاری)"
                    autoComplete="off"
                    rules={{ validate: (value) => optionError(value) ?? true }}
                  />
                  <ControlledTextField
                    control={control}
                    name={`variants.${index}.color`}
                    label="رنگ (اختیاری)"
                    autoComplete="off"
                    rules={{ validate: (value) => optionError(value) ?? true }}
                  />
                </div>
              ) : null}
              <div className="variant-options">
                <ControlledTextField
                  control={control}
                  name={`variants.${index}.price`}
                  label={`قیمت (${unit === 'TOMAN' ? 'تومان' : 'ریال'}) (الزامی)`}
                  autoComplete="off"
                  rules={{
                    validate: (value) =>
                      priceInputToRial(value, unit) !== null ||
                      (unit === 'RIAL'
                        ? 'قیمت ریالی باید عدد صحیح مثبت و مضرب ۱۰ باشد.'
                        : 'قیمت تومانی باید عدد صحیح مثبت و در محدوده مجاز باشد.'),
                  }}
                />
                <ControlledTextField
                  control={control}
                  name={`variants.${index}.quantity`}
                  label="موجودی اولیه"
                  autoComplete="off"
                  rules={{
                    validate: (value) =>
                      parseQuantityInput(value) !== null ||
                      'موجودی باید عدد صحیح بین ۰ و ۲٬۱۴۷٬۴۸۳٬۶۴۷ باشد.',
                  }}
                />
              </div>
              {mode === 'named' && fields.length > 1 ? (
                <button className="secondary-button" type="button" onClick={() => remove(index)}>
                  حذف این تنوع
                </button>
              ) : null}
            </fieldset>
          ))}
        </div>
        {mode === 'named' ? (
          <button
            className="secondary-button"
            type="button"
            disabled={isSubmitting}
            onClick={() => append(EMPTY_VARIANT, { focusName: `variants.${fields.length}.sku` })}
          >
            افزودن تنوع
          </button>
        ) : null}
        <div className="product-form-actions">
          <button
            className="secondary-button"
            type="button"
            disabled={isSubmitting}
            onClick={discard}
          >
            انصراف
          </button>
          <button
            className="primary-button"
            type="submit"
            disabled={isSubmitting}
            aria-busy={isSubmitting}
          >
            {isSubmitting ? 'در حال ایجاد…' : 'ایجاد محصول پیش‌نویس'}
          </button>
        </div>
      </form>
    </section>
  );
}

export function ProductCreate() {
  const capabilities = useCatalogCapabilities();
  const { retryBootstrap } = useAuth();
  const router = useRouter();
  return (
    <ProductCreateView
      canManage={capabilities.manage}
      onCreated={(productId) => router.push(`/catalog/products/${productId}`)}
      onCancel={() => router.push('/catalog/products')}
      onPermissionDenied={retryBootstrap}
    />
  );
}

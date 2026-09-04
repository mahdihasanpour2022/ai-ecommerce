'use client';

import { Input, Select } from 'antd';
import Link from 'next/link';
import { Controller, useForm } from 'react-hook-form';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '../../auth/auth-provider';
import { createSubmissionGate } from '../../auth/submission-gate';
import { ControlledTextField } from '../../forms/controlled-text-field';
import type { CatalogApi, CreateVariantInput } from '../catalog-api';
import { catalogApi } from '../catalog-api';
import type {
  CategoryDto,
  PriceDisplayUnit,
  ProductDetailDto,
  ProductStatus,
  ProductVariantDto,
} from '../catalog-contracts';
import { classifyCatalogFailure } from '../catalog-errors';
import { useCatalogCapabilities } from '../catalog-shell';
import { CatalogState } from '../catalog-state';
import { productFailurePresentation } from './product-failures';
import {
  changedProductFields,
  changedVariantFields,
  descriptionError,
  flattenCategories,
  formatPrice,
  normalizeSingleLine,
  normalizeSku,
  optionError,
  priceInputToRial,
  priceRialToInput,
  productNameError,
  productVariantMode,
  skuError,
} from './product-model';
import type { ProductCoreValues, VariantEditValues } from './product-model';

export type ProductWorkspaceSection = 'overview' | 'variants' | 'inventory' | 'images';
type WorkspaceClient = Pick<
  CatalogApi,
  | 'product'
  | 'categories'
  | 'priceDisplaySetting'
  | 'updateProduct'
  | 'createVariant'
  | 'updateVariant'
>;

const ignorePermissionDenied = () => undefined;

const STATUS_LABELS: Readonly<Record<ProductStatus, string>> = {
  DRAFT: 'پیش‌نویس',
  ACTIVE: 'فعال',
  ARCHIVED: 'بایگانی‌شده',
};

function useDirtyGuard(dirty: boolean) {
  useEffect(() => {
    const preventUnload = (event: BeforeUnloadEvent) => {
      if (!dirty) return;
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', preventUnload);
    return () => window.removeEventListener('beforeunload', preventUnload);
  }, [dirty]);
}

function Summary({
  message,
  reference,
}: Readonly<{ message: string | null; reference: React.RefObject<HTMLParagraphElement | null> }>) {
  return message ? (
    <p ref={reference} className="form-error" role="alert" tabIndex={-1}>
      {message}
    </p>
  ) : null;
}

function DescriptionField({
  control,
  disabled,
}: Readonly<{
  control: ReturnType<typeof useForm<ProductCoreValues>>['control'];
  disabled: boolean;
}>) {
  return (
    <Controller
      control={control}
      name="description"
      rules={{ validate: (value) => descriptionError(value) ?? true }}
      render={({ field, fieldState }) => (
        <div className="controlled-field">
          <label htmlFor="workspace-product-description">توضیحات (اختیاری)</label>
          <Input.TextArea
            id="workspace-product-description"
            value={field.value}
            onChange={field.onChange}
            onBlur={field.onBlur}
            ref={field.ref}
            disabled={disabled}
            rows={5}
            maxLength={5000}
            aria-invalid={fieldState.invalid}
            {...(fieldState.invalid ? { status: 'error' as const } : {})}
          />
          {fieldState.error ? (
            <p className="field-error" role="alert">
              {fieldState.error.message}
            </p>
          ) : null}
        </div>
      )}
    />
  );
}

function ProductOverviewForm({
  product,
  categories,
  client,
  editable,
  onSaved,
  onStale,
  onPermissionDenied,
}: Readonly<{
  product: ProductDetailDto;
  categories: readonly CategoryDto[];
  client: WorkspaceClient;
  editable: boolean;
  onSaved(product: ProductDetailDto): void;
  onStale(message: string): void;
  onPermissionDenied(): void;
}>) {
  const summaryRef = useRef<HTMLParagraphElement>(null);
  const [summary, setSummary] = useState<string | null>(null);
  const [gate] = useState(() => createSubmissionGate<readonly [ProductCoreValues], void>());
  const {
    control,
    handleSubmit,
    reset,
    setError,
    setFocus,
    formState: { isDirty, isSubmitting },
  } = useForm<ProductCoreValues>({
    defaultValues: {
      name: product.name,
      description: product.description ?? '',
      categoryId: product.category.id,
    },
    shouldFocusError: true,
  });
  useDirtyGuard(isDirty);

  async function save(values: ProductCoreValues) {
    setSummary(null);
    const input = changedProductFields(product, values);
    if (Object.keys(input).length === 0) {
      setSummary('برای ذخیره، دست‌کم یک فیلد را تغییر دهید.');
      globalThis.setTimeout(() => summaryRef.current?.focus(), 0);
      return;
    }
    try {
      const updated = await client.updateProduct(product.id, input);
      reset({
        name: updated.name,
        description: updated.description ?? '',
        categoryId: updated.category.id,
      });
      onSaved(updated);
    } catch (error) {
      const failure = productFailurePresentation(error);
      setSummary(failure.message);
      if (
        failure.field === 'name' ||
        failure.field === 'description' ||
        failure.field === 'categoryId'
      ) {
        setError(failure.field, { type: 'server', message: failure.message });
        globalThis.setTimeout(() => setFocus(failure.field as keyof ProductCoreValues), 0);
      } else globalThis.setTimeout(() => summaryRef.current?.focus(), 0);
      if (failure.refreshProduct) onStale(failure.message);
      if (failure.code === 'INSUFFICIENT_PERMISSION') onPermissionDenied();
    }
  }

  if (!editable) {
    return (
      <dl className="workspace-facts">
        <div>
          <dt>نام</dt>
          <dd>{product.name}</dd>
        </div>
        <div>
          <dt>دسته‌بندی</dt>
          <dd>{product.category.name}</dd>
        </div>
        <div>
          <dt>توضیحات</dt>
          <dd>{product.description ?? 'بدون توضیحات'}</dd>
        </div>
      </dl>
    );
  }

  const options = flattenCategories(categories);
  // The submission gate is stable route-local state; this callback does not read a React ref.
  // eslint-disable-next-line react-hooks/refs
  const submit = handleSubmit((values) => gate.run(save, values));
  return (
    <form className="workspace-form" noValidate onSubmit={(event) => void submit(event)}>
      <Summary message={summary} reference={summaryRef} />
      <ControlledTextField
        control={control}
        name="name"
        label="نام محصول (الزامی)"
        disabled={isSubmitting}
        rules={{ validate: (value) => productNameError(value) ?? true }}
      />
      <DescriptionField control={control} disabled={isSubmitting} />
      <Controller
        control={control}
        name="categoryId"
        rules={{ required: 'انتخاب دسته‌بندی الزامی است.' }}
        render={({ field, fieldState }) => (
          <div className="controlled-field">
            <label htmlFor="workspace-product-category">دسته‌بندی (الزامی)</label>
            <Select
              id="workspace-product-category"
              value={field.value}
              onChange={field.onChange}
              onBlur={field.onBlur}
              ref={field.ref}
              disabled={isSubmitting}
              aria-invalid={fieldState.invalid}
              {...(fieldState.invalid ? { status: 'error' as const } : {})}
              options={options.map((category) => ({
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
      <button
        className="primary-button"
        type="submit"
        disabled={isSubmitting}
        aria-busy={isSubmitting}
      >
        {isSubmitting ? 'در حال ذخیره…' : 'ذخیره مشخصات محصول'}
      </button>
    </form>
  );
}

function VariantEditor({
  variant,
  unit,
  client,
  editable,
  onSaved,
  onStale,
  onPermissionDenied,
}: Readonly<{
  variant: ProductVariantDto;
  unit: PriceDisplayUnit;
  client: WorkspaceClient;
  editable: boolean;
  onSaved(variant: ProductVariantDto): void;
  onStale(message: string): void;
  onPermissionDenied(): void;
}>) {
  const summaryRef = useRef<HTMLParagraphElement>(null);
  const cancelDeactivateRef = useRef<HTMLButtonElement>(null);
  const deactivateDialogRef = useRef<HTMLDivElement>(null);
  const [summary, setSummary] = useState<string | null>(null);
  const [confirmDeactivate, setConfirmDeactivate] = useState(false);
  const [busy, setBusy] = useState(false);
  const [gate] = useState(() => createSubmissionGate<readonly [() => Promise<void>], void>());

  useEffect(() => {
    if (confirmDeactivate) cancelDeactivateRef.current?.focus();
  }, [confirmDeactivate]);

  function handleDeactivateDialogKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Escape' && !busy) {
      event.preventDefault();
      setConfirmDeactivate(false);
      return;
    }
    if (event.key !== 'Tab') return;
    const focusable = Array.from(
      deactivateDialogRef.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)') ??
        [],
    );
    const first = focusable[0];
    const last = focusable.at(-1);
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last?.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first?.focus();
    }
  }
  const {
    control,
    handleSubmit,
    reset,
    setError,
    setFocus,
    formState: { isDirty },
  } = useForm<VariantEditValues>({
    defaultValues: {
      sku: variant.sku,
      size: variant.size ?? '',
      color: variant.color ?? '',
      price: priceRialToInput(variant.priceRial, unit),
    },
    shouldFocusError: true,
  });
  useDirtyGuard(isDirty);

  async function run(operation: () => Promise<void>) {
    setBusy(true);
    try {
      await operation();
    } finally {
      setBusy(false);
    }
  }

  function handleFailure(error: unknown) {
    const failure = productFailurePresentation(error);
    setSummary(failure.message);
    const field = failure.field;
    if (field === 'sku' || field === 'size' || field === 'color' || field === 'price') {
      setError(field, { type: 'server', message: failure.message });
      globalThis.setTimeout(() => setFocus(field), 0);
    } else globalThis.setTimeout(() => summaryRef.current?.focus(), 0);
    if (failure.refreshProduct) onStale(failure.message);
    if (failure.code === 'INSUFFICIENT_PERMISSION') onPermissionDenied();
  }

  async function save(values: VariantEditValues) {
    setSummary(null);
    const input = changedVariantFields(variant, values, unit);
    if (input === null) return;
    if (Object.keys(input).length === 0) {
      setSummary('برای ذخیره، دست‌کم یک فیلد را تغییر دهید.');
      globalThis.setTimeout(() => summaryRef.current?.focus(), 0);
      return;
    }
    try {
      const updated = await client.updateVariant(variant.id, input);
      reset({
        sku: updated.sku,
        size: updated.size ?? '',
        color: updated.color ?? '',
        price: priceRialToInput(updated.priceRial, unit),
      });
      onSaved(updated);
    } catch (error) {
      handleFailure(error);
    }
  }

  async function setActive(isActive: boolean) {
    setSummary(null);
    try {
      const updated = await client.updateVariant(variant.id, { isActive });
      setConfirmDeactivate(false);
      onSaved(updated);
    } catch (error) {
      handleFailure(error);
    }
  }

  // The submission gate is stable route-local state; this callback does not read a React ref.
  // eslint-disable-next-line react-hooks/refs
  const submit = handleSubmit((values) => gate.run(run, () => save(values)));
  return (
    <article className="workspace-variant" aria-labelledby={`variant-${variant.id}`}>
      <div className="variant-heading">
        <h3 id={`variant-${variant.id}`}>
          <bdi>{variant.sku}</bdi>
        </h3>
        <span>{variant.isActive ? 'فعال' : 'غیرفعال'}</span>
      </div>
      <p>موجودی دقیق: {variant.inventory.onHandQuantity.toLocaleString('fa-IR')}</p>
      {!editable ? (
        <dl className="workspace-facts">
          <div>
            <dt>اندازه</dt>
            <dd>{variant.size ?? '—'}</dd>
          </div>
          <div>
            <dt>رنگ</dt>
            <dd>{variant.color ?? '—'}</dd>
          </div>
          <div>
            <dt>قیمت</dt>
            <dd>{formatPrice(variant.priceRial, unit)}</dd>
          </div>
        </dl>
      ) : (
        <form className="workspace-form" noValidate onSubmit={(event) => void submit(event)}>
          <Summary message={summary} reference={summaryRef} />
          <ControlledTextField
            control={control}
            name="sku"
            idPrefix={`variant-${variant.id}`}
            label="کد کالا"
            disabled={busy}
            rules={{ validate: (value) => skuError(value) ?? true }}
          />
          <div className="variant-options">
            <ControlledTextField
              control={control}
              name="size"
              idPrefix={`variant-${variant.id}`}
              label="اندازه (اختیاری)"
              disabled={busy}
              rules={{ validate: (value) => optionError(value) ?? true }}
            />
            <ControlledTextField
              control={control}
              name="color"
              idPrefix={`variant-${variant.id}`}
              label="رنگ (اختیاری)"
              disabled={busy}
              rules={{ validate: (value) => optionError(value) ?? true }}
            />
          </div>
          <ControlledTextField
            control={control}
            name="price"
            idPrefix={`variant-${variant.id}`}
            label={`قیمت (${unit === 'TOMAN' ? 'تومان' : 'ریال'})`}
            disabled={busy}
            rules={{
              validate: (value) => priceInputToRial(value, unit) !== null || 'قیمت معتبر نیست.',
            }}
          />
          <div className="variant-maintenance-actions">
            <button className="primary-button" type="submit" disabled={busy} aria-busy={busy}>
              ذخیره تنوع
            </button>
            {variant.isActive ? (
              <button
                className="secondary-button"
                type="button"
                disabled={busy}
                onClick={() => setConfirmDeactivate(true)}
              >
                غیرفعال‌کردن
              </button>
            ) : (
              <button
                className="secondary-button"
                type="button"
                disabled={busy}
                onClick={() => void gate.run(run, () => setActive(true))}
              >
                فعال‌کردن دوباره
              </button>
            )}
          </div>
        </form>
      )}
      {confirmDeactivate ? (
        <div className="category-dialog-backdrop">
          <div
            ref={deactivateDialogRef}
            className="category-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby={`deactivate-${variant.id}`}
            aria-busy={busy}
            onKeyDown={handleDeactivateDialogKeyDown}
          >
            <h2 id={`deactivate-${variant.id}`}>غیرفعال‌کردن {variant.sku}</h2>
            <p>
              تنوع «{variant.sku}» حفظ می‌شود اما دیگر فعال نخواهد بود. آخرین تنوع فعال را نمی‌توان
              غیرفعال کرد.
            </p>
            <div className="category-dialog-actions">
              <button
                ref={cancelDeactivateRef}
                type="button"
                disabled={busy}
                onClick={() => setConfirmDeactivate(false)}
              >
                انصراف
              </button>
              <button
                type="button"
                className="danger-button"
                disabled={busy}
                onClick={() => void gate.run(run, () => setActive(false))}
              >
                {busy ? 'در حال غیرفعال‌کردن…' : 'غیرفعال‌کردن تنوع'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </article>
  );
}

function AddVariantForm({
  productId,
  unit,
  client,
  onSaved,
  onStale,
  onPermissionDenied,
}: Readonly<{
  productId: string;
  unit: PriceDisplayUnit;
  client: WorkspaceClient;
  onSaved(variant: ProductVariantDto): void;
  onStale(message: string): void;
  onPermissionDenied(): void;
}>) {
  const [open, setOpen] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const summaryRef = useRef<HTMLParagraphElement>(null);
  const [gate] = useState(() => createSubmissionGate<readonly [VariantEditValues], void>());
  const {
    control,
    handleSubmit,
    reset,
    setError,
    setFocus,
    formState: { isSubmitting, isDirty },
  } = useForm<VariantEditValues>({
    defaultValues: { sku: '', size: '', color: '', price: '' },
    shouldFocusError: true,
  });
  useDirtyGuard(isDirty);

  async function create(values: VariantEditValues) {
    setSummary(null);
    const size = normalizeSingleLine(values.size) || null;
    const color = normalizeSingleLine(values.color) || null;
    const priceRial = priceInputToRial(values.price, unit);
    if (size === null && color === null) {
      setSummary('در حالت نام‌دار، اندازه یا رنگ الزامی است.');
      globalThis.setTimeout(() => summaryRef.current?.focus(), 0);
      return;
    }
    if (priceRial === null) return;
    const input: CreateVariantInput = {
      sku: normalizeSku(values.sku),
      size,
      color,
      priceRial,
      isActive: true,
      onHandQuantity: 0,
    };
    try {
      const created = await client.createVariant(productId, input);
      reset({ sku: '', size: '', color: '', price: '' });
      setOpen(false);
      onSaved(created);
    } catch (error) {
      const failure = productFailurePresentation(error);
      setSummary(failure.message);
      if (
        failure.field === 'sku' ||
        failure.field === 'size' ||
        failure.field === 'color' ||
        failure.field === 'price'
      ) {
        setError(failure.field, { type: 'server', message: failure.message });
        globalThis.setTimeout(() => setFocus(failure.field as keyof VariantEditValues), 0);
      } else globalThis.setTimeout(() => summaryRef.current?.focus(), 0);
      if (failure.refreshProduct) onStale(failure.message);
      if (failure.code === 'INSUFFICIENT_PERMISSION') onPermissionDenied();
    }
  }

  if (!open)
    return (
      <button className="primary-button" type="button" onClick={() => setOpen(true)}>
        افزودن تنوع
      </button>
    );
  // The submission gate is stable route-local state; this callback does not read a React ref.
  // eslint-disable-next-line react-hooks/refs
  const submit = handleSubmit((values) => gate.run(create, values));
  return (
    <form
      className="workspace-form add-variant-form"
      noValidate
      onSubmit={(event) => void submit(event)}
    >
      <h3>تنوع جدید</h3>
      <Summary message={summary} reference={summaryRef} />
      <ControlledTextField
        control={control}
        name="sku"
        idPrefix="new-variant"
        label="کد کالا"
        disabled={isSubmitting}
        rules={{ validate: (value) => skuError(value) ?? true }}
      />
      <div className="variant-options">
        <ControlledTextField
          control={control}
          name="size"
          idPrefix="new-variant"
          label="اندازه (اختیاری)"
          disabled={isSubmitting}
          rules={{ validate: (value) => optionError(value) ?? true }}
        />
        <ControlledTextField
          control={control}
          name="color"
          idPrefix="new-variant"
          label="رنگ (اختیاری)"
          disabled={isSubmitting}
          rules={{ validate: (value) => optionError(value) ?? true }}
        />
      </div>
      <ControlledTextField
        control={control}
        name="price"
        idPrefix="new-variant"
        label={`قیمت (${unit === 'TOMAN' ? 'تومان' : 'ریال'})`}
        disabled={isSubmitting}
        rules={{
          validate: (value) => priceInputToRial(value, unit) !== null || 'قیمت معتبر نیست.',
        }}
      />
      <p className="field-hint">موجودی اولیه این تنوع صفر است و در بخش موجودی تغییر می‌کند.</p>
      <div className="variant-maintenance-actions">
        <button
          className="secondary-button"
          type="button"
          disabled={isSubmitting}
          onClick={() => {
            if (!isDirty || window.confirm('تغییرات تنوع جدید کنار گذاشته شود؟')) {
              reset();
              setOpen(false);
            }
          }}
        >
          انصراف
        </button>
        <button
          className="primary-button"
          type="submit"
          disabled={isSubmitting}
          aria-busy={isSubmitting}
        >
          {isSubmitting ? 'در حال افزودن…' : 'ثبت تنوع'}
        </button>
      </div>
    </form>
  );
}

export function ProductWorkspaceView({
  productId,
  section,
  canManage,
  client = catalogApi,
  onPermissionDenied = ignorePermissionDenied,
}: Readonly<{
  productId: string;
  section: ProductWorkspaceSection;
  canManage: boolean;
  client?: WorkspaceClient;
  onPermissionDenied?: () => void;
}>) {
  const requestVersion = useRef(0);
  const heading = useRef<HTMLHeadingElement>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'error' | 'forbidden' | 'not-found'>(
    'loading',
  );
  const [message, setMessage] = useState('');
  const [product, setProduct] = useState<ProductDetailDto | null>(null);
  const [categories, setCategories] = useState<readonly CategoryDto[]>([]);
  const [unit, setUnit] = useState<PriceDisplayUnit>('RIAL');
  const [announcement, setAnnouncement] = useState('');

  const load = useCallback(
    async (signal?: AbortSignal) => {
      const version = ++requestVersion.current;
      try {
        const [nextProduct, nextCategories, setting] = await Promise.all([
          client.product(productId, signal),
          client.categories(signal),
          client.priceDisplaySetting(signal),
        ]);
        if (version !== requestVersion.current) return;
        setProduct(nextProduct);
        setCategories(nextCategories);
        setUnit(setting.unit);
        setState('ready');
        setMessage('');
      } catch (error) {
        if (version !== requestVersion.current) return;
        const failure = classifyCatalogFailure(error);
        if (failure.kind === 'canceled') return;
        if (failure.kind === 'forbidden') {
          setState('forbidden');
          onPermissionDenied();
        } else if (failure.kind === 'not-found') setState('not-found');
        else setState('error');
        setMessage(failure.message);
      }
    },
    [client, onPermissionDenied, productId],
  );

  useEffect(() => {
    const controller = new AbortController();
    const task = globalThis.setTimeout(() => void load(controller.signal), 0);
    return () => {
      globalThis.clearTimeout(task);
      controller.abort();
    };
  }, [load]);

  if (state === 'loading')
    return (
      <CatalogState
        kind="loading"
        title="در حال دریافت محصول"
        message="جزئیات محصول در حال دریافت است."
      />
    );
  if (state !== 'ready' || product === null)
    return (
      <CatalogState
        kind={state === 'not-found' ? 'not-found' : state === 'forbidden' ? 'forbidden' : 'error'}
        title={
          state === 'not-found'
            ? 'محصول یافت نشد'
            : state === 'forbidden'
              ? 'دسترسی مجاز نیست'
              : 'دریافت محصول ممکن نشد'
        }
        message={message}
        {...(state === 'error'
          ? {
              onRetry: () => {
                setState('loading');
                void load();
              },
            }
          : { returnHref: '/catalog/products', returnLabel: 'بازگشت به محصولات' })}
      />
    );

  const editable = canManage && product.status !== 'ARCHIVED';
  const mode = productVariantMode(product);
  const saveProduct = (updated: ProductDetailDto) => {
    setProduct(updated);
    setAnnouncement('مشخصات محصول ذخیره شد.');
    heading.current?.focus();
  };
  const saveVariant = (updated: ProductVariantDto) => {
    setProduct((current) =>
      current
        ? {
            ...current,
            variants: current.variants.map((item) => (item.id === updated.id ? updated : item)),
          }
        : current,
    );
    setAnnouncement(`تنوع «${updated.sku}» ذخیره شد.`);
  };
  const addVariant = (created: ProductVariantDto) => {
    setProduct((current) =>
      current ? { ...current, variants: [...current.variants, created] } : current,
    );
    setAnnouncement(`تنوع «${created.sku}» افزوده شد.`);
  };
  const stale = (notice: string) => {
    setAnnouncement(notice);
    void load();
  };

  return (
    <section className="product-workspace" aria-labelledby="workspace-heading">
      <div className="workspace-heading">
        <div>
          <h1 id="workspace-heading" ref={heading} tabIndex={-1}>
            {product.name}
          </h1>
          <p>
            وضعیت: {STATUS_LABELS[product.status]} · واحد قیمت:{' '}
            {unit === 'TOMAN' ? 'تومان' : 'ریال'}
          </p>
        </div>
      </div>
      {!canManage ? (
        <p className="permission-note" role="note">
          این محصول برای حساب شما فقط خواندنی است.
        </p>
      ) : null}
      {product.status === 'ARCHIVED' ? (
        <p className="permission-note" role="note">
          محصول بایگانی‌شده تا بازگشت به پیش‌نویس فقط خواندنی است.
        </p>
      ) : null}
      <p aria-live="polite">{announcement}</p>
      <nav className="workspace-tabs" aria-label="بخش‌های محصول">
        <Link
          href={`/catalog/products/${product.id}?section=overview`}
          aria-current={section === 'overview' ? 'page' : undefined}
        >
          مشخصات
        </Link>
        <Link
          href={`/catalog/products/${product.id}?section=variants`}
          aria-current={section === 'variants' ? 'page' : undefined}
        >
          تنوع‌ها
        </Link>
        <Link
          href={`/catalog/products/${product.id}?section=inventory`}
          aria-current={section === 'inventory' ? 'page' : undefined}
        >
          موجودی
        </Link>
        <Link
          href={`/catalog/products/${product.id}?section=images`}
          aria-current={section === 'images' ? 'page' : undefined}
        >
          تصاویر
        </Link>
      </nav>
      {section === 'overview' ? (
        <ProductOverviewForm
          key={`${product.updatedAt}-${product.category.id}`}
          product={product}
          categories={categories}
          client={client}
          editable={editable}
          onSaved={saveProduct}
          onStale={stale}
          onPermissionDenied={onPermissionDenied}
        />
      ) : section === 'variants' ? (
        <div className="workspace-variants">
          <div className="variant-section-heading">
            <h2>تنوع‌های نگه‌داری‌شده</h2>
            <p>حالت محصول: {mode === 'default' ? 'بدون گزینه' : 'دارای اندازه یا رنگ'}</p>
          </div>
          {product.variants.map((variant) => (
            <VariantEditor
              key={`${variant.id}-${variant.updatedAt}-${variant.isActive}`}
              variant={variant}
              unit={unit}
              client={client}
              editable={editable}
              onSaved={saveVariant}
              onStale={stale}
              onPermissionDenied={onPermissionDenied}
            />
          ))}
          {editable && mode === 'named' ? (
            <AddVariantForm
              productId={product.id}
              unit={unit}
              client={client}
              onSaved={addVariant}
              onStale={stale}
              onPermissionDenied={onPermissionDenied}
            />
          ) : null}
        </div>
      ) : (
        <CatalogState
          kind="empty"
          title={section === 'inventory' ? 'مدیریت موجودی' : 'مدیریت تصاویر'}
          message={
            section === 'inventory'
              ? 'مقادیر موجودی در تنوع‌ها خواندنی هستند؛ ویرایش موجودی در وظیفه بعدی تکمیل می‌شود.'
              : 'مدیریت تصاویر در وظیفه اختصاصی بعدی تکمیل می‌شود.'
          }
        />
      )}
    </section>
  );
}

export function ProductWorkspace({
  productId,
  section,
}: Readonly<{ productId: string; section: ProductWorkspaceSection }>) {
  const capabilities = useCatalogCapabilities();
  const { retryBootstrap } = useAuth();
  return (
    <ProductWorkspaceView
      productId={productId}
      section={section}
      canManage={capabilities.manage}
      onPermissionDenied={retryBootstrap}
    />
  );
}

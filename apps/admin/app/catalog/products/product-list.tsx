'use client';

/* eslint-disable @next/next/no-img-element */
import { Pagination, Select } from 'antd';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '../../auth/auth-provider';
import { UiBadge } from '../../components/shared/ui-badge';
import { UiButton } from '../../components/shared/ui-button';
import { UiPanel } from '../../components/shared/ui-panel';
import { getApiBaseUrl } from '../../http/http-client';
import type { CatalogApi } from '../catalog-api';
import { catalogApi } from '../catalog-api';
import { useCatalogRQClient } from '../../../hooks/catalog/useCatalogRQClient';
import type {
  CategoryDto,
  PriceDisplayUnit,
  ProductListDto,
  ProductStatus,
} from '../catalog-contracts';
import { classifyCatalogFailure } from '../catalog-errors';
import { useCatalogCapabilities } from '../catalog-shell';
import { CatalogState } from '../catalog-state';
import {
  flattenCategories,
  formatPrice,
  productListHref,
  withProductListQuery,
} from './product-model';
import type { ProductListLocation } from './product-model';

type ProductListClient = Pick<CatalogApi, 'products' | 'categories' | 'priceDisplaySetting'>;

const STATUS_LABELS: Readonly<Record<ProductStatus, string>> = {
  DRAFT: 'پیش‌نویس',
  ACTIVE: 'فعال',
  ARCHIVED: 'بایگانی‌شده',
};

const STATUS_TONES: Readonly<Record<ProductStatus, 'neutral' | 'accent' | 'success'>> = {
  DRAFT: 'neutral',
  ACTIVE: 'success',
  ARCHIVED: 'accent',
};

interface LoadedProductList {
  readonly products: ProductListDto;
  readonly categories: readonly CategoryDto[];
  readonly unit: PriceDisplayUnit;
}

function imageContentUrl(imageId: string): string {
  return `${getApiBaseUrl()}/admin/catalog/product-images/${imageId}/content`;
}

export function ProductListView({
  location,
  canManage,
  client: baseClient = catalogApi,
  onNavigate,
  onCreate,
  onPermissionDenied = () => undefined,
}: Readonly<{
  location: ProductListLocation;
  canManage: boolean;
  client?: ProductListClient;
  onNavigate(href: string, replace?: boolean): void;
  onCreate(): void;
  onPermissionDenied?: () => void;
}>) {
  const client = useCatalogRQClient(baseClient as CatalogApi);
  const requestVersion = useRef(0);
  const [state, setState] = useState<'loading' | 'ready' | 'error' | 'forbidden'>('loading');
  const [message, setMessage] = useState('');
  const [loaded, setLoaded] = useState<LoadedProductList | null>(null);

  const load = useCallback(
    async (signal?: AbortSignal) => {
      const version = ++requestVersion.current;
      try {
        const [products, categories, setting] = await Promise.all([
          client.products(location.query, signal),
          client.categories(signal),
          client.priceDisplaySetting(signal),
        ]);
        if (version !== requestVersion.current) return;
        const lastPage = Math.max(1, products.totalPages);
        if (products.page > lastPage) {
          onNavigate(productListHref({ ...location.query, page: lastPage }), true);
          return;
        }
        setLoaded({ products, categories, unit: setting.unit });
        setMessage('');
        setState('ready');
      } catch (error) {
        if (version !== requestVersion.current) return;
        const failure = classifyCatalogFailure(error);
        if (failure.kind === 'canceled') return;
        if (failure.kind === 'forbidden') {
          setState('forbidden');
          setMessage('مجوز مشاهده محصولات برای این حساب موجود نیست.');
          onPermissionDenied();
          return;
        }
        setState('error');
        setMessage(failure.message);
      }
    },
    [client, location.query, onNavigate, onPermissionDenied],
  );

  useEffect(() => {
    if (!location.canonical) onNavigate(location.canonicalHref, true);
  }, [location.canonical, location.canonicalHref, onNavigate]);

  useEffect(() => {
    const controller = new AbortController();
    const task = globalThis.setTimeout(() => void load(controller.signal), 0);
    return () => {
      globalThis.clearTimeout(task);
      controller.abort();
    };
  }, [load]);

  if (state === 'loading') {
    return (
      <CatalogState
        kind="loading"
        title="در حال دریافت محصولات"
        message="فهرست محصولات و فیلترهای معتبر در حال دریافت است."
      />
    );
  }
  if (state !== 'ready' || loaded === null) {
    return (
      <CatalogState
        kind={state === 'forbidden' ? 'forbidden' : 'error'}
        title={state === 'forbidden' ? 'دسترسی مجاز نیست' : 'دریافت محصولات ممکن نشد'}
        message={message}
        {...(state === 'error'
          ? {
              onRetry: () => {
                setState('loading');
                setLoaded(null);
                void load();
              },
            }
          : { returnHref: '/', returnLabel: 'بازگشت به خانه مدیریت' })}
      />
    );
  }

  const { products, categories, unit } = loaded;
  const categoryOptions = flattenCategories(categories);
  const filtered = location.query.categoryId !== undefined || location.query.status !== undefined;

  return (
    <section className="grid gap-5" aria-labelledby="products-heading">
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <p className="m-0 text-xs font-bold text-accent-foreground">مدیریت کاتالوگ</p>
          <h1
            id="products-heading"
            className="m-0 mt-1 text-2xl font-black tracking-tight text-foreground sm:text-3xl"
          >
            محصولات
          </h1>
          <p className="m-0 mt-2 text-sm leading-7 text-muted">
            محصولات فروشگاه را مرور کنید و جزئیات، قیمت و موجودی آن‌ها را مدیریت کنید.
          </p>
        </div>
        {canManage ? <UiButton onClick={onCreate}>ایجاد محصول پیش‌نویس</UiButton> : null}
      </div>

      <dl className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <UiPanel className="flex items-center justify-between">
          <div>
            <dt className="text-xs text-muted">کل محصولات</dt>
            <dd className="m-0 mt-2 text-2xl font-black text-foreground">
              {products.totalItems.toLocaleString('fa-IR')}
            </dd>
          </div>
          <span
            className="grid size-11 place-items-center rounded-2xl bg-brand-soft/20 text-xl text-accent-foreground"
            aria-hidden="true"
          >
            ◫
          </span>
        </UiPanel>
        <UiPanel className="flex items-center justify-between">
          <div>
            <dt className="text-xs text-muted">نمایش در این صفحه</dt>
            <dd className="m-0 mt-2 text-2xl font-black text-foreground">
              {products.items.length.toLocaleString('fa-IR')}
            </dd>
          </div>
          <span
            className="grid size-11 place-items-center rounded-2xl bg-surface-muted text-lg text-muted"
            aria-hidden="true"
          >
            ≡
          </span>
        </UiPanel>
        <UiPanel className="flex items-center justify-between">
          <div>
            <dt className="text-xs text-muted">واحد نمایش قیمت</dt>
            <dd className="m-0 mt-2 text-lg font-black text-foreground">
              {unit === 'TOMAN' ? 'تومان' : 'ریال'}
            </dd>
          </div>
          <span
            className="grid size-11 place-items-center rounded-2xl bg-brand text-sm font-black text-brand-ink"
            aria-hidden="true"
          >
            ﷼
          </span>
        </UiPanel>
      </dl>

      {!canManage ? (
        <p
          className="m-0 rounded-xl border border-brand-soft/30 bg-brand-soft/10 px-4 py-3 text-sm text-accent-foreground"
          role="note"
        >
          محصولات برای حساب شما فقط خواندنی هستند.
        </p>
      ) : null}
      <UiPanel className="grid gap-4 sm:grid-cols-2" aria-label="فیلترهای محصولات">
        <div className="grid gap-2">
          <label htmlFor="product-category-filter" className="text-xs font-bold text-foreground">
            دسته‌بندی
          </label>
          <Select
            className="min-h-10 w-full"
            id="product-category-filter"
            value={location.query.categoryId ?? '__all__'}
            onChange={(value: string) =>
              onNavigate(
                withProductListQuery(
                  location.query,
                  { categoryId: value === '__all__' ? undefined : value },
                  true,
                ),
              )
            }
            options={[
              { value: '__all__', label: 'همه دسته‌بندی‌ها' },
              ...categoryOptions.map((category) => ({
                value: category.id,
                label: `${'— '.repeat(Math.max(0, category.level - 1))}${category.name}`,
              })),
            ]}
            getPopupContainer={(trigger) => trigger.parentElement ?? trigger}
          />
        </div>
        <div className="grid gap-2">
          <label htmlFor="product-status-filter" className="text-xs font-bold text-foreground">
            وضعیت
          </label>
          <Select
            className="min-h-10 w-full"
            id="product-status-filter"
            value={location.query.status ?? '__all__'}
            onChange={(value: string) =>
              onNavigate(
                withProductListQuery(
                  location.query,
                  {
                    status: value === '__all__' ? undefined : (value as ProductStatus),
                  },
                  true,
                ),
              )
            }
            options={[
              { value: '__all__', label: 'همه وضعیت‌ها' },
              ...Object.entries(STATUS_LABELS).map(([value, label]) => ({ value, label })),
            ]}
            getPopupContainer={(trigger) => trigger.parentElement ?? trigger}
          />
        </div>
      </UiPanel>

      {products.items.length === 0 ? (
        <UiPanel className="py-12 text-center" role="status">
          <span
            className="mx-auto grid size-14 place-items-center rounded-2xl bg-brand-soft/20 text-2xl text-accent-foreground"
            aria-hidden="true"
          >
            ◫
          </span>
          <h2 className="mt-4 text-lg font-black text-foreground">
            {filtered ? 'محصولی با این فیلترها پیدا نشد' : 'هنوز محصولی ثبت نشده است'}
          </h2>
          <p className="mx-auto mb-0 mt-2 max-w-xl text-sm leading-7 text-muted">
            {filtered
              ? 'فیلترها را تغییر دهید تا محصولات دیگری نمایش داده شوند.'
              : canManage
                ? 'برای آغاز کاتالوگ، نخستین محصول پیش‌نویس را ایجاد کنید.'
                : 'پس از ثبت محصول، فهرست در این صفحه نمایش داده می‌شود.'}
          </p>
        </UiPanel>
      ) : (
        <UiPanel padded={false} className="overflow-hidden">
          <div className="hidden gap-4 border-b border-border bg-surface-muted px-5 py-3 text-xs font-bold text-muted xl:grid xl:grid-cols-product-list">
            <span>محصول</span>
            <span>وضعیت</span>
            <span>قیمت</span>
            <span>موجودی</span>
            <span>تنوع‌ها</span>
          </div>
          <ul className="m-0 list-none divide-y divide-border p-0" aria-label="فهرست محصولات">
            {products.items.map((product) => (
              <li
                key={product.id}
                className="grid gap-4 px-4 py-4 transition-colors hover:bg-brand-soft/5 sm:px-5 xl:grid-cols-product-list xl:items-center"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div className="grid size-16 shrink-0 place-items-center overflow-hidden rounded-2xl border border-border bg-surface-muted text-center text-2xs text-muted">
                    {product.mainImage ? (
                      <img
                        className="size-full object-cover"
                        src={imageContentUrl(product.mainImage.id)}
                        alt={`تصویر اصلی ${product.name}`}
                        width={96}
                        height={96}
                      />
                    ) : (
                      <span>بدون تصویر</span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <h2 className="m-0 truncate text-sm font-black">
                      <Link
                        className="text-foreground no-underline hover:text-accent-foreground"
                        href={`/catalog/products/${product.id}`}
                      >
                        {product.name}
                      </Link>
                    </h2>
                    <p className="m-0 mt-1 truncate text-xs text-muted">{product.category.name}</p>
                    <p className="m-0 mt-2 text-2xs text-muted xl:hidden">
                      آخرین تغییر: {new Date(product.updatedAt).toLocaleString('fa-IR')}
                    </p>
                  </div>
                </div>
                <dl className="contents">
                  <div className="flex items-center justify-between gap-3 xl:block">
                    <dt className="text-xs text-muted xl:sr-only">وضعیت</dt>
                    <dd className="m-0">
                      <UiBadge tone={STATUS_TONES[product.status]}>
                        {STATUS_LABELS[product.status]}
                      </UiBadge>
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-3 xl:block">
                    <dt className="text-xs text-muted xl:sr-only">قیمت</dt>
                    <dd className="m-0 text-sm font-bold text-foreground">
                      {product.minimumPriceRial === product.maximumPriceRial
                        ? formatPrice(product.minimumPriceRial, unit)
                        : `${formatPrice(product.minimumPriceRial, unit)} تا ${formatPrice(product.maximumPriceRial, unit)}`}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-3 xl:block">
                    <dt className="text-xs text-muted xl:sr-only">موجودی کل</dt>
                    <dd className="m-0 text-sm font-bold text-foreground">
                      {product.totalOnHandQuantity.toLocaleString('fa-IR')}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-3 xl:block">
                    <dt className="text-xs text-muted xl:sr-only">تنوع‌ها</dt>
                    <dd className="m-0 text-sm text-foreground">
                      {product.activeVariantCount.toLocaleString('fa-IR')} فعال از{' '}
                      {product.variantCount.toLocaleString('fa-IR')}
                    </dd>
                  </div>
                </dl>
              </li>
            ))}
          </ul>
        </UiPanel>
      )}

      <div className="flex justify-center rounded-2xl border border-border bg-surface px-4 py-3">
        <Pagination
          current={products.page}
          pageSize={products.pageSize}
          total={products.totalItems}
          pageSizeOptions={[25, 50, 100]}
          showSizeChanger
          responsive
          showTotal={(total) => `${total.toLocaleString('fa-IR')} محصول`}
          onChange={(page, pageSize) =>
            onNavigate(
              withProductListQuery(location.query, {
                page: pageSize === products.pageSize ? page : 1,
                pageSize: pageSize as 25 | 50 | 100,
              }),
            )
          }
        />
      </div>
    </section>
  );
}

export function ProductList({ location }: Readonly<{ location: ProductListLocation }>) {
  const capabilities = useCatalogCapabilities();
  const { retryBootstrap } = useAuth();
  const router = useRouter();
  return (
    <ProductListView
      key={location.canonicalHref}
      location={location}
      canManage={capabilities.manage}
      onNavigate={(href, replace) =>
        replace ? router.replace(href, { scroll: false }) : router.push(href, { scroll: false })
      }
      onCreate={() => router.push('/catalog/products/new')}
      onPermissionDenied={retryBootstrap}
    />
  );
}

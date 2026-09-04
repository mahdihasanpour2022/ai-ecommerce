'use client';

/* eslint-disable @next/next/no-img-element */
import { Pagination, Select } from 'antd';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '../../auth/auth-provider';
import { getApiBaseUrl } from '../../http/http-client';
import type { CatalogApi } from '../catalog-api';
import { catalogApi } from '../catalog-api';
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
  client = catalogApi,
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
    <section className="product-list" aria-labelledby="products-heading">
      <div className="product-page-heading">
        <div>
          <h1 id="products-heading">محصولات</h1>
          <p>ترتیب فهرست بر اساس آخرین به‌روزرسانی است.</p>
        </div>
        {canManage ? (
          <button className="primary-button" type="button" onClick={onCreate}>
            ایجاد محصول پیش‌نویس
          </button>
        ) : null}
      </div>
      {!canManage ? (
        <p className="permission-note" role="note">
          محصولات برای حساب شما فقط خواندنی هستند.
        </p>
      ) : null}
      <div className="product-filters" aria-label="فیلترهای محصولات">
        <div className="controlled-field">
          <label htmlFor="product-category-filter">دسته‌بندی</label>
          <Select
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
        <div className="controlled-field">
          <label htmlFor="product-status-filter">وضعیت</label>
          <Select
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
      </div>

      {products.items.length === 0 ? (
        <div className="product-empty" role="status">
          <h2>{filtered ? 'محصولی با این فیلترها پیدا نشد' : 'هنوز محصولی ثبت نشده است'}</h2>
          <p>
            {filtered
              ? 'فیلترها را تغییر دهید تا محصولات دیگری نمایش داده شوند.'
              : canManage
                ? 'برای آغاز کاتالوگ، نخستین محصول پیش‌نویس را ایجاد کنید.'
                : 'پس از ثبت محصول، فهرست در این صفحه نمایش داده می‌شود.'}
          </p>
        </div>
      ) : (
        <ul className="product-records" aria-label="فهرست محصولات">
          {products.items.map((product) => (
            <li key={product.id} className="product-record">
              <div className="product-thumbnail">
                {product.mainImage ? (
                  <img
                    src={imageContentUrl(product.mainImage.id)}
                    alt={`تصویر اصلی ${product.name}`}
                    width={96}
                    height={96}
                  />
                ) : (
                  <span>بدون تصویر</span>
                )}
              </div>
              <div className="product-record-main">
                <h2>
                  <Link href={`/catalog/products/${product.id}`}>{product.name}</Link>
                </h2>
                <p>{product.category.name}</p>
                <dl className="product-facts">
                  <div>
                    <dt>وضعیت</dt>
                    <dd>{STATUS_LABELS[product.status]}</dd>
                  </div>
                  <div>
                    <dt>تنوع‌ها</dt>
                    <dd>
                      {product.activeVariantCount.toLocaleString('fa-IR')} فعال از{' '}
                      {product.variantCount.toLocaleString('fa-IR')}
                    </dd>
                  </div>
                  <div>
                    <dt>قیمت</dt>
                    <dd>
                      {product.minimumPriceRial === product.maximumPriceRial
                        ? formatPrice(product.minimumPriceRial, unit)
                        : `${formatPrice(product.minimumPriceRial, unit)} تا ${formatPrice(product.maximumPriceRial, unit)}`}
                    </dd>
                  </div>
                  <div>
                    <dt>موجودی کل</dt>
                    <dd>{product.totalOnHandQuantity.toLocaleString('fa-IR')}</dd>
                  </div>
                  <div>
                    <dt>به‌روزرسانی</dt>
                    <dd>{new Date(product.updatedAt).toLocaleString('fa-IR')}</dd>
                  </div>
                </dl>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Pagination
        className="product-pagination"
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

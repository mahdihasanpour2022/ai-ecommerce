'use client';

import { UiButton } from '../../../app/components/shared/ui-button';
import { UiForm } from '../../../app/components/shared/ui-form';
import { UiModal } from '../../../app/components/shared/ui-modal';
import { useGetProductDetail } from '../hooks/useGetProductDetail';
import type { Product } from '../interfaces/product-contract';
import { ProductMainSpecsCell } from './product-main-specs-cell';

interface ProductSpecificationsModalProps {
  readonly product: Product | null;
  readonly onCancel: () => void;
}

export function ProductSpecificationsModal({ product, onCancel }: ProductSpecificationsModalProps) {
  const detail = useGetProductDetail(product?.id ?? null);
  const productDetail = detail.data?.singleResult;
  const mainSpecifications = productDetail?.mainSpecs ?? [];
  const specifications = productDetail?.specifications ?? [];
  const mainKeys = new Set(mainSpecifications.map(({ title }) => title.toLocaleLowerCase('en-US')));
  const secondarySpecifications = specifications.filter(
    ({ title }) => !mainKeys.has(title.toLocaleLowerCase('en-US')),
  );

  return (
    <UiModal.Root
      open={product !== null}
      title={product ? `ویژگی‌های ${product.name}` : 'ویژگی‌های محصول'}
      width={{ xs: 'calc(100vw - 2rem)', sm: 560 }}
      styles={{
        container: { display: 'flex', maxHeight: '50dvh', flexDirection: 'column' },
        body: { minHeight: 0, flex: 1, overflowY: 'auto' },
      }}
      onCancel={onCancel}
    >
      {detail.isFetching ? <p className="text-muted m-0 text-sm">در حال دریافت ویژگی‌ها…</p> : null}
      {detail.isError ? <UiForm.Error>دریافت ویژگی‌های محصول ناموفق بود.</UiForm.Error> : null}
      {productDetail ? (
        <div className="grid gap-4">
          <section
            className="border-border grid gap-3 rounded-xl border p-4"
            aria-labelledby="product-main-specifications-title"
          >
            <h3
              id="product-main-specifications-title"
              className="text-foreground m-0 text-sm font-bold"
            >
              ویژگی‌های اصلی
            </h3>
            <ProductMainSpecsCell mainSpecs={productDetail.mainSpecs} />
          </section>
          <section
            className="border-border grid gap-3 rounded-xl border p-4"
            aria-labelledby="product-secondary-specifications-title"
          >
            <h3
              id="product-secondary-specifications-title"
              className="text-foreground m-0 text-sm font-bold"
            >
              ویژگی‌های فرعی
            </h3>
            <ProductMainSpecsCell
              mainSpecs={secondarySpecifications}
              ariaLabel="ویژگی‌های فرعی محصول"
              emptyLabel="بدون ویژگی فرعی"
            />
          </section>
        </div>
      ) : null}
      <div className="mt-5 flex justify-end">
        <UiButton type="button" variant="secondary" onClick={onCancel}>
          بستن
        </UiButton>
      </div>
    </UiModal.Root>
  );
}

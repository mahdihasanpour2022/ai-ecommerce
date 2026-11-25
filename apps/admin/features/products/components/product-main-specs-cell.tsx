import type { ProductSpecifications } from '../interfaces/product-contract';

export function ProductMainSpecsCell({
  mainSpecs,
  ariaLabel = 'ویژگی‌های اصلی محصول',
  emptyLabel = 'بدون ویژگی اصلی',
}: Readonly<{
  mainSpecs: ProductSpecifications;
  ariaLabel?: string;
  emptyLabel?: string;
}>) {
  if (mainSpecs.length === 0) {
    return <span className="text-foreground-muted whitespace-nowrap">{emptyLabel}</span>;
  }

  return (
    <div className="max-w-64 min-w-48 overflow-hidden rounded-lg">
      <table className="text-foreground w-full border-collapse text-sm" aria-label={ariaLabel}>
        <thead className="bg-surface-muted">
          <tr className="border-border border-b">
            <th
              scope="col"
              className="border-border w-2/5 border-e px-2 py-1.5 text-start font-bold"
            >
              عنوان
            </th>
            <th scope="col" className="px-2 py-1.5 text-start font-bold">
              توضیحات
            </th>
          </tr>
        </thead>
        <tbody>
          {mainSpecs.map(({ title, description }) => (
            <tr key={title} className="border-border border-b last:border-b-0">
              <th
                scope="row"
                className="bg-surface-muted border-border w-2/5 border-e border-t px-2 py-1.5 text-start font-bold wrap-break-word"
              >
                {title}
              </th>
              <td
                className="border-border truncate border-t px-2 py-1.5 wrap-break-word"
                title={description}
              >
                {description}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

import type { ReactNode } from 'react';
import Link from 'next/link';

interface BreadcrumbItem {
  readonly label: string;
  readonly href?: string;
}

export function CatalogPage({
  breadcrumbs,
  children,
}: Readonly<{ breadcrumbs: readonly BreadcrumbItem[]; children: ReactNode }>) {
  return (
    <div className="catalog-page">
      <nav className="catalog-breadcrumbs" aria-label="مسیر صفحه">
        <ol>
          {breadcrumbs.map((item) => (
            <li key={`${item.href ?? 'current'}-${item.label}`}>
              {item.href ? <Link href={item.href}>{item.label}</Link> : <span>{item.label}</span>}
            </li>
          ))}
        </ol>
      </nav>
      {children}
    </div>
  );
}

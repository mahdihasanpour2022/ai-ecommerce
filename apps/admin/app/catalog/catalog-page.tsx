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
    <div className="grid gap-4">
      <nav aria-label="مسیر صفحه">
        <ol className="m-0 flex list-none flex-wrap items-center gap-2 p-0 text-xs text-muted">
          {breadcrumbs.map((item) => (
            <li className="flex items-center gap-2" key={`${item.href ?? 'current'}-${item.label}`}>
              {item.href ? (
                <Link
                  className="text-muted no-underline hover:text-accent-foreground"
                  href={item.href}
                >
                  {item.label}
                </Link>
              ) : (
                <span className="font-bold text-foreground">{item.label}</span>
              )}
              {item.href ? <span aria-hidden="true">/</span> : null}
            </li>
          ))}
        </ol>
      </nav>
      {children}
    </div>
  );
}

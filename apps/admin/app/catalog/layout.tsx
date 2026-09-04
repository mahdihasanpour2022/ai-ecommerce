import type { ReactNode } from 'react';
import { CatalogRouteBoundary } from './catalog-shell';

export default function CatalogLayout({ children }: Readonly<{ children: ReactNode }>) {
  return <CatalogRouteBoundary>{children}</CatalogRouteBoundary>;
}

'use client';

import { useCatalogCapabilities } from './catalog-shell';
import type { CatalogCapability } from './catalog-permissions';

export function CatalogAccessNote({
  capability,
  allowedMessage,
  readOnlyMessage,
}: Readonly<{
  capability: Exclude<CatalogCapability, 'read'>;
  allowedMessage: string;
  readOnlyMessage: string;
}>) {
  const capabilities = useCatalogCapabilities();
  return (
    <p className="mt-6 rounded-xl bg-surface-subtle p-4 leading-8 text-muted" role="note">
      {capabilities[capability] ? allowedMessage : readOnlyMessage}
    </p>
  );
}

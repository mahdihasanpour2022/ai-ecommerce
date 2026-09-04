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
    <p className="permission-note" role="note">
      {capabilities[capability] ? allowedMessage : readOnlyMessage}
    </p>
  );
}

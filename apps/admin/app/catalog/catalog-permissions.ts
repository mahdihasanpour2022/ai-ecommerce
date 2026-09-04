export const CATALOG_PERMISSIONS = {
  read: 'catalog.read',
  manage: 'catalog.manage',
  inventory: 'inventory.update',
  media: 'product.media.manage',
  priceSetting: 'settings.price.display.unit.update',
} as const;

export interface CatalogCapabilities {
  readonly read: boolean;
  readonly manage: boolean;
  readonly inventory: boolean;
  readonly media: boolean;
  readonly priceSetting: boolean;
}

export type CatalogCapability = keyof CatalogCapabilities;

export function catalogCapabilities(permissions: readonly string[]): CatalogCapabilities {
  const effective = new Set(permissions);
  const read = effective.has(CATALOG_PERMISSIONS.read);
  return {
    read,
    manage: read && effective.has(CATALOG_PERMISSIONS.manage),
    inventory: read && effective.has(CATALOG_PERMISSIONS.inventory),
    media: read && effective.has(CATALOG_PERMISSIONS.media),
    priceSetting: read && effective.has(CATALOG_PERMISSIONS.priceSetting),
  };
}

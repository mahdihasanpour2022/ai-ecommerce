export const PROTECTED_HOME = '/';

const FORBIDDEN_CHARACTERS = /[\\\u0000-\u001f\u007f]/;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u;
const STATIC_CATALOG_PATHS = new Set([
  '/catalog/categories',
  '/catalog/products/new',
  '/catalog/settings/price-display-unit',
]);
const PRODUCT_STATUSES = new Set(['DRAFT', 'ACTIVE', 'ARCHIVED']);
const PRODUCT_SECTIONS = new Set(['overview', 'variants', 'inventory', 'images']);

function hasUniqueAllowedParameters(
  params: URLSearchParams,
  validators: Readonly<Record<string, (value: string) => boolean>>,
): boolean {
  const seen = new Set<string>();
  for (const [key, value] of params) {
    if (seen.has(key) || !(key in validators) || !validators[key]?.(value)) return false;
    seen.add(key);
  }
  return true;
}

function isAllowedCatalogDestination(url: URL): boolean {
  if (STATIC_CATALOG_PATHS.has(url.pathname)) return url.search === '';
  if (url.pathname === '/catalog/products') {
    return hasUniqueAllowedParameters(url.searchParams, {
      page: (value) => /^[1-9][0-9]*$/u.test(value) && Number.isSafeInteger(Number(value)),
      pageSize: (value) => value === '25' || value === '50' || value === '100',
      categoryId: (value) => UUID_PATTERN.test(value),
      status: (value) => PRODUCT_STATUSES.has(value),
    });
  }
  const detail = /^\/catalog\/products\/([^/]+)$/u.exec(url.pathname);
  return (
    detail !== null &&
    UUID_PATTERN.test(detail[1] ?? '') &&
    hasUniqueAllowedParameters(url.searchParams, {
      section: (value) => PRODUCT_SECTIONS.has(value),
    })
  );
}

export function safeReturnDestination(value: string | null | undefined): string {
  if (
    !value ||
    !value.startsWith('/') ||
    value.startsWith('//') ||
    FORBIDDEN_CHARACTERS.test(value)
  ) {
    return PROTECTED_HOME;
  }
  let url: URL;
  try {
    url = new URL(value, 'https://admin.invalid');
  } catch {
    return PROTECTED_HOME;
  }
  if (url.origin !== 'https://admin.invalid' || url.hash !== '') return PROTECTED_HOME;
  if (url.pathname === PROTECTED_HOME && url.search === '') return PROTECTED_HOME;
  return isAllowedCatalogDestination(url) ? `${url.pathname}${url.search}` : PROTECTED_HOME;
}

export function loginDestination(returnTo: string): string {
  const safe = safeReturnDestination(returnTo);
  return `/login?returnTo=${encodeURIComponent(safe)}`;
}

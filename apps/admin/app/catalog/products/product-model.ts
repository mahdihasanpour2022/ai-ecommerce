import type {
  CategoryDto,
  PriceDisplayUnit,
  ProductDetailDto,
  ProductStatus,
  ProductVariantDto,
} from '../catalog-contracts';
import type { ProductListQuery, UpdateProductInput, UpdateVariantInput } from '../catalog-api';

export type RawSearchParams = Record<string, string | readonly string[] | undefined>;

export interface ProductListLocation {
  readonly query: ProductListQuery;
  readonly canonicalHref: string;
  readonly canonical: boolean;
}

const PAGE_SIZES = new Set([25, 50, 100]);
const STATUSES = new Set<ProductStatus>(['DRAFT', 'ACTIVE', 'ARCHIVED']);
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u;
const SKU_PATTERN = /^[A-Z0-9][A-Z0-9_-]{0,63}$/u;
const MAX_QUANTITY = 2_147_483_647;
const DIGIT_MAP: Record<string, string> = {
  '۰': '0',
  '۱': '1',
  '۲': '2',
  '۳': '3',
  '۴': '4',
  '۵': '5',
  '۶': '6',
  '۷': '7',
  '۸': '8',
  '۹': '9',
  '٠': '0',
  '١': '1',
  '٢': '2',
  '٣': '3',
  '٤': '4',
  '٥': '5',
  '٦': '6',
  '٧': '7',
  '٨': '8',
  '٩': '9',
};

function scalar(value: string | readonly string[] | undefined): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

function positiveInteger(value: string | undefined): number | undefined {
  if (!value || !/^[1-9][0-9]*$/u.test(value)) return undefined;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) ? parsed : undefined;
}

export function productListHref(query: ProductListQuery): string {
  const params = new URLSearchParams();
  if (query.page !== undefined && query.page !== 1) params.set('page', String(query.page));
  if (query.pageSize !== undefined && query.pageSize !== 25) {
    params.set('pageSize', String(query.pageSize));
  }
  if (query.categoryId !== undefined) params.set('categoryId', query.categoryId);
  if (query.status !== undefined) params.set('status', query.status);
  const encoded = params.toString();
  return `/catalog/products${encoded ? `?${encoded}` : ''}`;
}

export function parseProductListLocation(raw: RawSearchParams): ProductListLocation {
  const pageValue = positiveInteger(scalar(raw.page));
  const pageSizeValue = positiveInteger(scalar(raw.pageSize));
  const categoryId = scalar(raw.categoryId);
  const status = scalar(raw.status);
  const query: ProductListQuery = {
    page: pageValue ?? 1,
    pageSize: PAGE_SIZES.has(pageSizeValue ?? 0) ? (pageSizeValue as 25 | 50 | 100) : 25,
    ...(categoryId && UUID_PATTERN.test(categoryId) ? { categoryId } : {}),
    ...(status && STATUSES.has(status as ProductStatus) ? { status: status as ProductStatus } : {}),
  };
  const canonicalHref = productListHref(query);
  const supplied = new URLSearchParams();
  for (const [key, value] of Object.entries(raw)) {
    if (typeof value === 'string') supplied.append(key, value);
    else if (Array.isArray(value)) value.forEach((item) => supplied.append(key, item));
  }
  const suppliedHref = `/catalog/products${supplied.size ? `?${supplied.toString()}` : ''}`;
  return { query, canonicalHref, canonical: suppliedHref === canonicalHref };
}

export function withProductListQuery(
  current: ProductListQuery,
  change: {
    readonly page?: number | undefined;
    readonly pageSize?: 25 | 50 | 100 | undefined;
    readonly categoryId?: string | undefined;
    readonly status?: ProductStatus | undefined;
  },
  resetPage = false,
): string {
  const categoryId = 'categoryId' in change ? change.categoryId : current.categoryId;
  const status = 'status' in change ? change.status : current.status;
  return productListHref({
    page: resetPage ? 1 : (change.page ?? current.page ?? 1),
    pageSize: change.pageSize ?? current.pageSize ?? 25,
    ...(categoryId === undefined ? {} : { categoryId }),
    ...(status === undefined ? {} : { status }),
  });
}

export interface FlatCategory {
  readonly id: string;
  readonly name: string;
  readonly level: number;
}

export function flattenCategories(tree: readonly CategoryDto[]): readonly FlatCategory[] {
  const result: FlatCategory[] = [];
  const visit = (nodes: readonly CategoryDto[]) => {
    for (const node of nodes) {
      result.push({ id: node.id, name: node.name, level: node.level });
      visit(node.children);
    }
  };
  visit(tree);
  return result;
}

export function normalizeSingleLine(value: string): string {
  return value.normalize('NFKC').trim().replace(/\s+/gu, ' ');
}

export function normalizeDescription(value: string): string | null {
  const normalized = value.normalize('NFKC').replace(/\r\n?/gu, '\n').trim();
  return normalized === '' ? null : normalized;
}

export function normalizeSku(value: string): string {
  return value.normalize('NFKC').trim().toUpperCase();
}

export function normalizeNumericInput(value: string): string | null {
  const normalized = Array.from(value.normalize('NFKC'))
    .map((character) => DIGIT_MAP[character] ?? character)
    .join('')
    .replace(/[\s,٬]/gu, '');
  return /^[0-9]+$/u.test(normalized) ? normalized : null;
}

export function parseQuantityInput(value: string): number | null {
  const normalized = normalizeNumericInput(value);
  if (normalized === null) return null;
  const quantity = Number(normalized);
  return Number.isInteger(quantity) && quantity >= 0 && quantity <= MAX_QUANTITY ? quantity : null;
}

export function priceInputToRial(value: string, unit: PriceDisplayUnit): number | null {
  const normalized = normalizeNumericInput(value);
  if (normalized === null || /^0+$/u.test(normalized)) return null;
  const amount = Number(normalized);
  if (!Number.isSafeInteger(amount)) return null;
  if (unit === 'RIAL') return amount >= 10 && amount % 10 === 0 ? amount : null;
  const rial = amount * 10;
  return Number.isSafeInteger(rial) ? rial : null;
}

export function formatPrice(priceRial: number, unit: PriceDisplayUnit): string {
  const amount = unit === 'TOMAN' ? priceRial / 10 : priceRial;
  return `${amount.toLocaleString('fa-IR')} ${unit === 'TOMAN' ? 'تومان' : 'ریال'}`;
}

export function priceRialToInput(priceRial: number, unit: PriceDisplayUnit): string {
  return String(unit === 'TOMAN' ? priceRial / 10 : priceRial);
}

export type ProductVariantMode = 'default' | 'named';

export function productVariantMode(product: ProductDetailDto): ProductVariantMode {
  const active = product.variants.filter((variant) => variant.isActive);
  return active.length === 1 && active[0]?.size === null && active[0]?.color === null
    ? 'default'
    : 'named';
}

export interface ProductCoreValues {
  readonly name: string;
  readonly description: string;
  readonly categoryId: string;
}

export function changedProductFields(
  product: ProductDetailDto,
  values: ProductCoreValues,
): UpdateProductInput {
  const name = normalizeSingleLine(values.name);
  const description = normalizeDescription(values.description);
  return {
    ...(name === product.name ? {} : { name }),
    ...(description === product.description ? {} : { description }),
    ...(values.categoryId === product.category.id ? {} : { categoryId: values.categoryId }),
  };
}

export interface VariantEditValues {
  readonly sku: string;
  readonly size: string;
  readonly color: string;
  readonly price: string;
}

export function changedVariantFields(
  variant: ProductVariantDto,
  values: VariantEditValues,
  unit: PriceDisplayUnit,
): UpdateVariantInput | null {
  const sku = normalizeSku(values.sku);
  const size = normalizeSingleLine(values.size) || null;
  const color = normalizeSingleLine(values.color) || null;
  const priceRial = priceInputToRial(values.price, unit);
  if (priceRial === null) return null;
  return {
    ...(sku === variant.sku ? {} : { sku }),
    ...(size === variant.size ? {} : { size }),
    ...(color === variant.color ? {} : { color }),
    ...(priceRial === variant.priceRial ? {} : { priceRial }),
  };
}

export function productNameError(value: string): string | undefined {
  const length = Array.from(normalizeSingleLine(value)).length;
  if (length === 0) return 'نام محصول الزامی است.';
  if (length > 200) return 'نام محصول باید حداکثر ۲۰۰ نویسه باشد.';
  return undefined;
}

export function descriptionError(value: string): string | undefined {
  const normalized = normalizeDescription(value);
  if (normalized === null) return undefined;
  if (Array.from(normalized).length > 5000 || /[<>]/u.test(normalized)) {
    return 'توضیحات باید متن ساده و حداکثر ۵۰۰۰ نویسه باشد.';
  }
  return undefined;
}

export function skuError(value: string): string | undefined {
  return SKU_PATTERN.test(normalizeSku(value))
    ? undefined
    : 'کد کالا باید ۱ تا ۶۴ نویسه و شامل حروف بزرگ لاتین، عدد، خط تیره یا زیرخط باشد.';
}

export function optionError(value: string): string | undefined {
  const normalized = normalizeSingleLine(value);
  return normalized === '' || Array.from(normalized).length <= 80
    ? undefined
    : 'اندازه یا رنگ باید حداکثر ۸۰ نویسه باشد.';
}

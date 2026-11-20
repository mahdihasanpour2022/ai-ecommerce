import type { ProductSpecifications } from './product.dto.js';

// داده JSONB را پیش از ورود به قرارداد پاسخ به object متنی مورد انتظار محدود می‌کند.
export function persistedSpecifications(value: unknown): ProductSpecifications {
  if (value === null || Array.isArray(value) || typeof value !== 'object') {
    throw new Error('Persisted Product specifications are malformed.');
  }
  const entries = Object.entries(value);
  if (entries.some(([, item]) => typeof item !== 'string')) {
    throw new Error('Persisted Product specifications are malformed.');
  }
  return Object.fromEntries(entries);
}

// ترتیب کلیدهای اصلی را حفظ و مقدار هر مورد را فقط از specifications استخراج می‌کند.
export function mainSpecificationsFromKeys(
  specifications: ProductSpecifications,
  keys: readonly string[],
): ProductSpecifications {
  const mainSpecs: Record<string, string> = {};
  for (const key of keys) {
    const value = specifications[key];
    if (value === undefined) throw new Error('Persisted main Product specification is missing.');
    mainSpecs[key] = value;
  }
  return mainSpecs;
}

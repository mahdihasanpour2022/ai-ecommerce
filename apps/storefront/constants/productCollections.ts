export interface ProductCollectionConfig {
  readonly href: `/products?tags=${string}`;
  readonly title: string;
  readonly description: string;
  readonly tags: string[];
}

export const PRODUCT_COLLECTIONS = {
  discounted: {
    href: '/products?tags=discounted',
    title: 'محصولات پر تخفیف',
    description: 'محصولاتی با بیشترین تخفیف را یک‌جا ببینید و انتخاب کنید.',
    tags: ['discounted'],
  },
  cap: {
    href: '/products?tags=cap',
    title: 'کلاه',
    description: 'انواع کلاه های زمستانی با قیمت مناسب.',
    tags: ['cap'],
  },
  ourSuggest: {
    href: '/products?tags=our_suggest',
    title: 'پیشنهاد ما',
    description: 'پیشنهاد ما برای خرید مناسب.',
    tags: ['our_suggest'],
  },
  amazing: {
    href: '/products?tags=amazing',
    title: 'شگفت انگیز',
    description: 'خریدی شگفت انگیز و مناسب.',
    tags: ['amazing'],
  },
} satisfies Record<string, ProductCollectionConfig>;

export const getProductCollectionByTags = (tags: readonly string[]) => {
  return Object.values(PRODUCT_COLLECTIONS).find(
    (collection) =>
      collection.tags.length === tags.length && collection.tags.every((tag) => tags.includes(tag)),
  );
};

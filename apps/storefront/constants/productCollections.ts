export interface ProductCollectionConfig {
  readonly slug: string;
  readonly href: `/products/${string}`;
  readonly title: string;
  readonly description: string;
  readonly tags: string[];
}

export const PRODUCT_COLLECTIONS = {
  discounted: {
    slug: 'discounted',
    href: '/products/discounted',
    title: 'محصولات پر تخفیف',
    description: 'محصولاتی با بیشترین تخفیف را یک‌جا ببینید و انتخاب کنید.',
    tags: ['discounted'],
  },
  cap: {
    slug: 'cap',
    href: '/products/cap',
    title: 'کلاه',
    description: 'انواع کلاه های زمستانی با قیمت مناسب.',
    tags: ['cap'],
  },
  ourSuggest: {
    slug: 'our-suggest',
    href: '/products/our-suggest',
    title: 'پیشنهاد ما',
    description: 'پیشنهاد ما برای خرید مناسب.',
    tags: ['our_suggest'],
  },
  amazing: {
    slug: 'amazing',
    href: '/products/amazing',
    title: 'شگفت انگیز',
    description: 'خریدی شگفت انگیز و مناسب.',
    tags: ['amazing'],
  },
} satisfies Record<string, ProductCollectionConfig>;

export const getProductCollectionBySlug = (slug: string) => {
  return Object.values(PRODUCT_COLLECTIONS).find((collection) => collection.slug === slug);
};

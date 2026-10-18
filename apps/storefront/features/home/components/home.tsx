'use client';

import {
  AmazingProducts,
  CapProducts,
  Categories,
  DiscountedProduct,
  OurSuggestion,
  TopSliders,
} from './sections';

const HomeCmp = () => {
  return (
    <main className="flex w-full flex-1 flex-col items-center gap-0">
      <TopSliders />
      <Categories />
      <AmazingProducts />
      <OurSuggestion />
      <DiscountedProduct />
      <CapProducts />
    </main>
  );
};

export default HomeCmp;

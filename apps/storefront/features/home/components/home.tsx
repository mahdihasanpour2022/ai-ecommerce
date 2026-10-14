'use client';

import {
  AmazingProducts,
  CapProducts,
  Categories,
  DiscountedProduct,
  Header,
  NavBar,
  OurSuggestion,
  TopSliders,
} from './sections';

// https://theme56.mywebzi.ir/
const HomeCmp = () => {
  return (
    <main className="flex w-full flex-1 flex-col items-center gap-0">
      <Header />
      <NavBar />
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

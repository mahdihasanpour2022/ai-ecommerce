'use client';

import { Footer } from '@/features/components/shared';
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
      <Footer />
    </main>
  );
};

export default HomeCmp;

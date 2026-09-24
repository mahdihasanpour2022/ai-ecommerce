'use client';

import { Categories, Header, NavBar, TopSliders } from './sections';

// https://theme56.mywebzi.ir/
const HomeCmp = () => {
  return (
    <main className="flex w-full flex-1 flex-col items-center gap-0">
      <Header />
      <NavBar />
      <TopSliders />
      <Categories />
    </main>
  );
};

export default HomeCmp;

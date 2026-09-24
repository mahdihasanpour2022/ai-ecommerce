'use client';

// https://theme56.mywebzi.ir/

import Header from './header';
import NavBar from './navBar';
import TopSliders from './topSliders';

const HomeCmp = () => {
  return (
    <main className="flex w-full flex-1 flex-col items-center gap-0">
      <Header />
      <NavBar />
      <TopSliders />
    </main>
  );
};

export default HomeCmp;

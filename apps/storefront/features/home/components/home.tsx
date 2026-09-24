'use client';

// https://theme56.mywebzi.ir/

import Header from './header';
import NavBar from './navBar';

const HomeCmp = () => {
  return (
    <main className="flex w-full flex-1 flex-col items-center gap-2">
      <Header />
      <NavBar />
    </main>
  );
};

export default HomeCmp;

'use client';

import LoginSignup from './subsets/loginSignup';
import SearchProduct from './subsets/searchProduct';
import ShoppingCart from './subsets/shoppingCart';
import StoreName from './subsets/storeName';

const Header = () => {
  return (
    <header className="flex w-full flex-col items-stretch gap-4 px-6 pt-8 pb-4 sm:flex-row sm:items-center sm:justify-between sm:px-12 lg:px-24 2xl:px-36">
      <div className="flex w-full items-center justify-start gap-16">
        <StoreName />
        <SearchProduct />
      </div>
      <div className="flex w-fit items-center justify-center gap-1">
        <LoginSignup />
        <ShoppingCart />
      </div>
    </header>
  );
};

export default Header;

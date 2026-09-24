'use client';

import LoginSignup from './subsets/loginSignup';
import SearchProduct from './subsets/searchProduct';
import ShoppingCart from './subsets/shoppingCart';
import StoreName from './subsets/storeName';

const Header = () => {
  return (
    <header className="flex w-full flex-col items-stretch gap-4 px-6 pt-16 pb-5 sm:flex-row! sm:items-center sm:justify-between sm:px-12 sm:pt-8 lg:px-24 2xl:px-36">
      <div className="flex w-full flex-col items-center justify-start gap-6 sm:flex-row sm:gap-16">
        <StoreName />
        <SearchProduct />
      </div>

      <div className="absolute top-4 left-4 w-fit sm:relative sm:top-0 sm:left-0">
        <div className="flex items-center justify-center gap-0 sm:gap-1">
          <LoginSignup />
          <ShoppingCart />
        </div>
      </div>
    </header>
  );
};

export default Header;

import SearchProduct from './searchProduct';
import StoreName from './storeName';

const Header = () => {
  return (
    <header className="flex w-full flex-col items-stretch gap-4 px-6 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-12 lg:px-24 2xl:px-36">
      <StoreName />
      <SearchProduct />
    </header>
  );
};

export default Header;

import { Footer, Header, NavBar } from '@/features/components/shared';

const ShopLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <>
      <Header />
      <NavBar />
      {children}
      <Footer />
    </>
  );
};

export default ShopLayout;

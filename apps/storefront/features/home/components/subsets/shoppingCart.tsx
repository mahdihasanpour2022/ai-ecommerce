import { UiButton, UiImage } from '@/components/shared/ui';
import Cart from '@/public/assets/header/cart.webp';

const ShoppingCart = () => {
  return (
    <UiButton className="h-12! w-12! px-0!">
      <UiImage
        alt="آیکان-سبد-خرید"
        src={Cart}
        width={350}
        height={350}
        className="h-12! w-12! rounded-xl"
      />
    </UiButton>
  );
};

export default ShoppingCart;

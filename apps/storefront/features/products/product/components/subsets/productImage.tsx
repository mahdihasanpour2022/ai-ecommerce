import { UiButton } from '@/components/shared/ui';
import { useCustomerAuth } from '@/features/customer-auth/auth-provider';
import { showGuestFavoriteModal } from '@/features/favorite/storefront-modal-container';
import { useAddFavorite, useRemoveFavorite } from '@/features/favorite/use-favorite';
import emptyHeartIcon from '@/public/assets/product/empty-heart-icon.webp';
import heartIcon from '@/public/assets/product/heart-icon.webp';
import Image from 'next/image';
import { useRef } from 'react';
import { toast } from 'sonner';
import { ProductByID, Variants } from '../../interfaces/productById';

interface Props {
  productId: string;
  selectedVariant: Variants | undefined;
  currentProduct: ProductByID | undefined;
}

export const ProductImage = ({ productId, selectedVariant, currentProduct }: Props) => {
  const { status: authStatus } = useCustomerAuth();
  const addFavorite = useAddFavorite(productId);
  const removeFavorite = useRemoveFavorite(productId);

  const favoriteActionPendingRef = useRef(false);
  const isFavoriteMutationPending = addFavorite.isPending || removeFavorite.isPending;

  // مهمان را به ورود هدایت می‌کند و تغییر علاقه‌مندی کاربر معتبر را با بازخورد دقیق انجام می‌دهد.
  const handleFavoriteClick = async () => {
    if (authStatus === 'anonymous') {
      showGuestFavoriteModal();
      return;
    }
    if (
      authStatus !== 'authenticated' ||
      !currentProduct ||
      isFavoriteMutationPending ||
      favoriteActionPendingRef.current
    )
      return;

    favoriteActionPendingRef.current = true;
    try {
      if (currentProduct.isFavorite) {
        await removeFavorite.mutateFavorite();
        toast.success(`محصول «${currentProduct.name}» از لیست علاقه‌مندی‌های شما حذف شد.`);
        return;
      }
      await addFavorite.mutateFavorite();
    } catch {
      if (currentProduct.isFavorite) {
        toast.error(`حذف محصول «${currentProduct.name}» از لیست علاقه‌مندی‌های شما ناموفق بود.`);
      } else {
        toast.error('افزودن این محصول به لیست علاقه‌مندی‌های شما ناموفق بود.');
      }
    } finally {
      favoriteActionPendingRef.current = false;
    }
  };

  return (
    <div className="flex w-1/2! items-start justify-start gap-2">
      <div className="flex h-full w-1/12! flex-col items-center justify-start gap-1 py-2">
        <UiButton
          type="button"
          variant="style_9"
          size="small"
          disabled={
            isFavoriteMutationPending ||
            (authStatus !== 'authenticated' && authStatus !== 'anonymous')
          }
          aria-label={
            currentProduct?.isFavorite
              ? 'حذف از لیست علاقه‌مندی‌ها'
              : 'افزودن به لیست علاقه‌مندی‌ها'
          }
          aria-pressed={currentProduct?.isFavorite}
          onClick={handleFavoriteClick}
        >
          <Image
            className="h-auto w-full rounded-xl object-contain"
            src={currentProduct?.isFavorite ? heartIcon : emptyHeartIcon}
            alt="like-icon"
            width={350}
            height={350}
            unoptimized={false}
          />
        </UiButton>
      </div>
      <Image
        className="h-auto w-11/12! rounded-xl object-contain"
        src={selectedVariant?.image?.url ?? currentProduct?.image ?? ''}
        alt={currentProduct?.alt ?? ''}
        width={350}
        height={350}
        unoptimized={true}
      />
    </div>
  );
};

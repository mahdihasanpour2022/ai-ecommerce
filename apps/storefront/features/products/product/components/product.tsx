'use client';

import { Seperator } from '@/components/shared';
import { UiButton, UiP, UiSpan } from '@/components/shared/ui';
import { useCustomerAuth } from '@/features/customer-auth/auth-provider';
import { showGuestFavoriteModal } from '@/features/favorite/storefront-modal-container';
import { useAddFavorite, useRemoveFavorite } from '@/features/favorite/use-favorite';
import emptyHeartIcon from '@/public/assets/product/empty-heart-icon.webp';
import greenTick from '@/public/assets/product/green-tick-icon.webp';
import heartIcon from '@/public/assets/product/heart-icon.webp';
import yellowStar from '@/public/assets/product/star-yellow.webp';
import whiteTick from '@/public/assets/product/white-tick-icon.webp';
import clsx from 'clsx';
import Image from 'next/image';
import { useRef } from 'react';
import { toast } from 'sonner';
import { useGetProductById } from '../hooks/useGetProductById';
interface ProductProps {
  readonly productId: string;
}

export const Product = ({ productId }: ProductProps) => {
  const { data } = useGetProductById({ productId });
  const { status: authStatus } = useCustomerAuth();
  const addFavorite = useAddFavorite(productId);
  const removeFavorite = useRemoveFavorite(productId);
  const favoriteActionPendingRef = useRef(false);

  const currentProduct = data?.singleResult ?? undefined;
  const selectedVariant = currentProduct?.variants[0];

  const colors = [
    ...new Set(
      currentProduct?.variants.flatMap(({ color }) => (color === null ? [] : [color])) ?? [],
    ),
  ];

  const sizes = [
    ...new Set(currentProduct?.variants.flatMap(({ size }) => (size === null ? [] : [size])) ?? []),
  ];

  console.log('currentProduct :', currentProduct);
  console.log('selectedVariant :', selectedVariant);
  console.log('sizes :', sizes);

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

  function toEnglishDigits(value: string): string {
    return value
      .replace(/[۰-۹]/g, (digit) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(digit)))
      .replace(/[٠-٩]/g, (digit) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit)));
  }

  return (
    <>
      {currentProduct && (
        <section className="border-foreground flex h-fit w-full items-stretch justify-between gap-3 px-6 pt-16 pb-5 sm:px-12 sm:pt-8 lg:px-24 2xl:px-36">
          <div className="flex w-4/5 items-stretch justify-between gap-4">
            {/* product-image and quick action sidebar */}
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
                    currentProduct.isFavorite
                      ? 'حذف از لیست علاقه‌مندی‌ها'
                      : 'افزودن به لیست علاقه‌مندی‌ها'
                  }
                  aria-pressed={currentProduct.isFavorite}
                  onClick={handleFavoriteClick}
                >
                  <Image
                    className="h-auto w-full rounded-xl object-contain"
                    src={currentProduct.isFavorite ? heartIcon : emptyHeartIcon}
                    alt="like-icon"
                    width={350}
                    height={350}
                    unoptimized={false}
                  />
                </UiButton>
              </div>
              <Image
                className="h-auto w-11/12! rounded-xl object-contain"
                src={selectedVariant?.image?.url ?? currentProduct.image}
                alt={currentProduct.alt ?? ''}
                width={350}
                height={350}
                unoptimized={true}
              />
            </div>
            {/* description */}
            <div className="border-foreground/10 w-1/2 rounded-xl border px-4">
              <UiP variant="style_6" className="pt-2 pb-2!">
                {currentProduct.name}
              </UiP>
              <Seperator className="my-0!" />
              <div className="flex items-center justify-start gap-2 py-1">
                {/* star  */}
                <div className="flex items-center justify-start gap-1">
                  <Image
                    src={yellowStar}
                    alt="yellow-star-icon"
                    width={150}
                    height={150}
                    className="h-4 w-4"
                    unoptimized={true}
                  />
                  {/* rate  */}
                  <UiSpan variant="style_8" className="">
                    3.9
                  </UiSpan>
                  <UiSpan variant="style_6" className="whitespace-nowrap">
                    {`(امتیاز 14 خریدار)`}
                  </UiSpan>
                  {/* comment count */}
                  <UiButton className="mr-2" variant="style_8" size="x-small">
                    {`6 دیدگاه >`}
                  </UiButton>
                </div>
              </div>
              {/* summary - color */}
              <UiP className="flex items-center justify-start gap-2 pt-3" variant="style_7">
                <UiSpan className="" variant="style_10">
                  رنگ :
                </UiSpan>
                <UiSpan className="" variant="style_10">
                  {selectedVariant?.color?.persianColorName}
                </UiSpan>
                <UiSpan
                  style={{ background: selectedVariant?.color?.englishColorName }}
                  className="h-3 w-3"
                  variant="style_11"
                />
              </UiP>
              {/* color bullets  */}
              <div className="flex items-center justify-start gap-3 py-4">
                {colors?.map((color, index) => (
                  <UiSpan
                    key={`${color}-${index}`}
                    style={{ background: color.englishColorName }}
                    variant="style_11"
                    className={`flex h-6 w-6 items-center justify-center text-white ${selectedVariant?.color === color ? 'outline-foreground/20 outline-4! outline-double' : ''}`}
                  >
                    {selectedVariant?.color === color && (
                      <Image
                        src={whiteTick}
                        alt="white-tick-icon"
                        width={300}
                        height={300}
                        className="h-3 w-3"
                      />
                    )}
                  </UiSpan>
                ))}
              </div>
              {/* summary - size */}
              <UiP className="flex items-center justify-start gap-2 pt-2" variant="style_7">
                <UiSpan className="" variant="style_10">
                  سایز :
                </UiSpan>
                <UiSpan variant="style_10" className="font-mono font-normal!">
                  {selectedVariant?.size ? toEnglishDigits(selectedVariant.size) : null}
                </UiSpan>
              </UiP>
              {/* sizes */}
              <div className="flex items-center justify-start gap-1 py-4">
                {sizes?.map((size) => (
                  <div
                    className="border-foreground/20 flex items-start justify-between gap-0 rounded-xl border p-1"
                    key={size}
                  >
                    <Image
                      src={greenTick}
                      alt="green-tick-icon"
                      width={300}
                      height={300}
                      className={clsx(
                        'h-3 w-4 opacity-75',
                        selectedVariant?.size !== size ? 'hidden!' : 'flex-initial!',
                      )}
                    />
                    <UiSpan
                      key={size}
                      variant="style_12"
                      className="outline-foreground/20 flex w-fit items-center justify-center font-mono"
                    >
                      {size}
                    </UiSpan>
                  </div>
                ))}
              </div>
            </div>
          </div>
          {/* sellers */}
          <div className="w-1/5 border"></div>
        </section>
      )}
    </>
  );
};

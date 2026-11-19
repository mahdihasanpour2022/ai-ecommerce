'use client';

import { Seperator } from '@/components/shared';
import { UiButton, UiP, UiSpan } from '@/components/shared/ui';
import { useCustomerAuth } from '@/features/customer-auth/auth-provider';
import { showGuestFavoriteModal } from '@/features/favorite/storefront-modal-container';
import emptyHeartIcon from '@/public/assets/product/empty-heart-icon.webp';
import heartIcon from '@/public/assets/product/heart-icon.webp';
import yellowStar from '@/public/assets/product/star-yellow.webp';
import { nanoid } from 'nanoid';
import Image from 'next/image';
import { useGetProductById } from '../hooks/useGetProductById';
interface ProductProps {
  readonly productId: string;
}

export const Product = ({ productId }: ProductProps) => {
  const { data } = useGetProductById({ productId });
  const { status: authStatus } = useCustomerAuth();

  const currentProduct = data?.singleResult ?? undefined;
  const selectedVariant = currentProduct?.variants[0];

  console.log('currentProduct :', currentProduct);

  const colors =
    currentProduct?.variants.flatMap(({ color }) => (color === null ? [] : [color])) ?? [];

  // مهمان را پیش از هر تغییر علاقه‌مندی به جریان ورود هدایت می‌کند.
  const handleFavoriteClick = () => {
    if (authStatus === 'anonymous') showGuestFavoriteModal();
  };

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
                  onClick={handleFavoriteClick}
                >
                  <Image
                    className="h-auto w-full rounded-xl object-contain"
                    src={heartIcon}
                    alt="heart-icon"
                    width={350}
                    height={350}
                    unoptimized={false}
                  />
                </UiButton>
                <UiButton
                  type="button"
                  variant="style_9"
                  size="small"
                  onClick={handleFavoriteClick}
                >
                  <Image
                    className="h-auto w-full rounded-xl object-contain"
                    src={emptyHeartIcon}
                    alt="heart-icon"
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
              <UiP className="flex items-center justify-start gap-2" variant="style_7">
                <UiSpan className="" variant="style_10">
                  رنگ :
                </UiSpan>
                <UiSpan className="" variant="style_10">
                  {currentProduct.variants[0]?.color?.persianColorName}
                </UiSpan>
                <UiSpan
                  style={{ background: currentProduct.variants[0]?.color?.englishColorName }}
                  className="h-3 w-3"
                  variant="style_11"
                />
              </UiP>
              {/* color bullets  */}
              <div className="flex items-center justify-start gap-3">
                {colors?.map((color) => (
                  <UiSpan
                    key={nanoid()}
                    style={{ background: color.englishColorName }}
                    variant="style_11"
                    className="h-6 w-6"
                  />
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

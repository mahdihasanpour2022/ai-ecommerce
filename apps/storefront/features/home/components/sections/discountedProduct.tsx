import { UiImage } from '@/components/shared/ui';
import discounted_1 from '@/public/assets/discounted/discounted_1.webp';
import discounted_2 from '@/public/assets/discounted/discounted_2.webp';
import discounted_3 from '@/public/assets/discounted/discounted_3.webp';
import discounted_4 from '@/public/assets/discounted/discounted_4.webp';
import { nanoid } from 'nanoid';
import { StaticImageData } from 'next/image';

interface DiscounteddProduct {
  image: StaticImageData;
  alt: string;
}

const discounted_Products_banners: DiscounteddProduct[] = [
  { image: discounted_1, alt: 'محصول تخفیف دار اول' },
  { image: discounted_2, alt: 'محصول تخفیف دار دوم' },
  { image: discounted_3, alt: 'محصول تخفیف دار سوم' },
  { image: discounted_4, alt: 'محصول تخفیف دار چهارم' },
];

export const DiscountedProduct = () => {
  return (
    <div className="grid h-auto w-full grid-cols-2 gap-4 px-6 py-4 sm:grid-cols-2 sm:px-12 sm:py-4 lg:grid-cols-4 lg:px-24 2xl:px-36">
      {discounted_Products_banners.map((product) => (
        <UiImage
          key={nanoid()}
          src={product.image}
          width={350}
          height={350}
          className="h-full w-full rounded-2xl bg-cover!"
          alt={product.alt}
        />
      ))}
    </div>
  );
};

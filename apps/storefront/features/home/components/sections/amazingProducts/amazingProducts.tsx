import { UiButton, UiCarousel, UiP } from '@/components/shared/ui';

import { Product } from '@/features/home/interfaces/product';
import cap1 from '@/public/assets/product/cap/cap_1.webp';
import cap10 from '@/public/assets/product/cap/cap_10.webp';
import cap2 from '@/public/assets/product/cap/cap_2.webp';
import cap3 from '@/public/assets/product/cap/cap_3.webp';
import cap4 from '@/public/assets/product/cap/cap_4.webp';
import cap5 from '@/public/assets/product/cap/cap_5.webp';
import cap6 from '@/public/assets/product/cap/cap_6.webp';
import cap7 from '@/public/assets/product/cap/cap_7.webp';
import cap8 from '@/public/assets/product/cap/cap_8.webp';
import cap9 from '@/public/assets/product/cap/cap_9.webp';
import ProductCard from './subsets/productCard';

const products: Product[] = [
  {
    id: 1,
    name: 'کلاه کتان سنگ شور مدل سنگشور',
    description:
      'کلاه سرپوش زنانه و مردانه ساده از جنس پارچه و تور با طراحی سبک و تنفس‌پذیر مناسب استفاده روزمره',
    image: cap1,
    alt: 'کلاه کتان سنگ شور',
    final_price: 6900000,
    original_price: 6900000,
    discount: 0,
    currency: 'IRR',
  },
  {
    id: 2,
    name: 'کلاه کپ مدل پشت تور دو گلدوزی کد 13503',
    description:
      'کلاه سرپوش زنانه و مردانه ساده از جنس پارچه و تور با طراحی سبک و تنفس‌پذیر مناسب استفاده روزمره',
    image: cap2,
    alt: 'کلاه کپ مدل پشت تور',
    final_price: 3270000,
    original_price: 3850000,
    discount: 15,
    currency: 'IRR',
  },
  {
    id: 3,
    name: 'کلاه کپ مدل 8701A07',
    description:
      'کلاه سرپوش زنانه و مردانه ساده از جنس پارچه و تور با طراحی سبک و تنفس‌پذیر مناسب استفاده روزمره',
    image: cap3,
    alt: 'کلاه کپ',
    final_price: 8000000,
    original_price: 8000000,
    discount: 0,
    currency: 'IRR',
  },
  {
    id: 4,
    name: 'کلاه لئونی مدل VOL کد 1597',
    description:
      'کلاه سرپوش زنانه و مردانه ساده از جنس پارچه و تور با طراحی سبک و تنفس‌پذیر مناسب استفاده روزمره',
    image: cap4,
    alt: 'کلاه لئونی',
    final_price: 3000000,
    original_price: 3000000,
    discount: 0,
    currency: 'IRR',
  },
  {
    id: 5,
    name: 'کلاه باکت مدل پینک فلویید کد k-28',
    description:
      'کلاه سرپوش زنانه و مردانه ساده از جنس پارچه و تور با طراحی سبک و تنفس‌پذیر مناسب استفاده روزمره',
    image: cap5,
    alt: 'کلاه باکت مدل پینک',
    final_price: 7500000,
    original_price: 7500000,
    discount: 0,
    currency: 'IRR',
  },
  {
    id: 6,
    name: 'کلاه کپ مدل کتان طرح سنگشور',
    description:
      'کلاه سرپوش زنانه و مردانه ساده از جنس پارچه و تور با طراحی سبک و تنفس‌پذیر مناسب استفاده روزمره',
    image: cap6,
    alt: 'کلاه کپ مدل کتان',
    final_price: 9350000,
    original_price: 9350000,
    discount: 0,
    currency: 'IRR',
  },
  {
    id: 7,
    name: 'کلاه کپ تدی',
    description:
      'کلاه سرپوش زنانه و مردانه ساده از جنس پارچه و تور با طراحی سبک و تنفس‌پذیر مناسب استفاده روزمره',
    image: cap7,
    alt: 'کلاه کپ تدی',
    final_price: 3680000,
    original_price: 3000000,
    discount: 18,
    currency: 'IRR',
  },
  {
    id: 8,
    name: 'کلاه ساده اکریلیک و نخ مدل صدف کلاه لئونی',
    description:
      'کلاه سرپوش زنانه و مردانه ساده از جنس پارچه و تور با طراحی سبک و تنفس‌پذیر مناسب استفاده روزمره',
    image: cap8,
    alt: 'کلاه ساده اکریلیک',
    final_price: 7500000,
    original_price: 7500000,
    discount: 0,
    currency: 'IRR',
  },
  {
    id: 9,
    name: 'کلاه سرپوش',
    description:
      'کلاه سرپوش زنانه و مردانه ساده از جنس پارچه و تور با طراحی سبک و تنفس‌پذیر مناسب استفاده روزمره',
    image: cap9,
    alt: 'کلاه سرپوش',
    final_price: 5900000,
    original_price: 5900000,
    discount: 0,
    currency: 'IRR',
  },
  {
    id: 10,
    name: 'کلاه بافتنی شال یقه دار مدل 625',
    description:
      'جنس نخ اکریلیک، گرم‌کننده گوش، قابل شستشو، مناسب پاییز و زمستان، استفاده اسپرت و روزمره و مهمانی، طراحی سرهمی با سگک فلزی',
    image: cap10,
    alt: 'کلاه بافتنی شال یقه دار مدل 625',
    final_price: 6300000,
    original_price: 6300000,
    discount: 0,
    currency: 'IRR',
  },
];

export const AmazingProducts = () => {
  return (
    <div className="h-80 w-full px-0 py-2 sm:px-12 sm:pt-4 lg:px-24 2xl:px-36">
      <div className="bg-nice-red flex h-full w-full flex-col items-center justify-start gap-2 overflow-hidden! py-4 pr-2 sm:flex-row sm:rounded-xl sm:pl-0.5">
        <div className="flex h-fit w-full flex-col items-center justify-between gap-4 pt-1 pb-0 sm:h-full sm:w-48 sm:pt-10! sm:pr-2 sm:pb-4">
          <UiP variant="style_2" className="mx-auto">
            شگفت انگیز
          </UiP>
          <UiButton className="" variant="style_3" size="small">{`مشاهده همه >`}</UiButton>
        </div>
        <div className="bg-nice-red h-auto w-full min-w-0 flex-1 overflow-hidden!">
          <UiCarousel
            className="h-full w-full"
            options={{ loop: true, direction: 'rtl', slidesToScroll: 1 }}
            autoplay={{ delay: 3000 }}
            controls="none"
            labels={{ carousel: 'محصولات' }}
            containerClassName="h-full"
            slideClassName="h-64 basis-32 px-1 sm:basis-44"
          >
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </UiCarousel>
        </div>
      </div>
    </div>
  );
};

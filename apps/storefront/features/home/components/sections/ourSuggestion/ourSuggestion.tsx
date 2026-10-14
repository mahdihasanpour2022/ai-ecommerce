import suggestedProduct_1 from '@/public/assets/suggest/suggested_product_1.webp';
import suggestedProduct_10 from '@/public/assets/suggest/suggested_product_10.webp';
import suggestedProduct_2 from '@/public/assets/suggest/suggested_product_2.webp';
import suggestedProduct_3 from '@/public/assets/suggest/suggested_product_3.webp';
import suggestedProduct_4 from '@/public/assets/suggest/suggested_product_4.webp';
import suggestedProduct_5 from '@/public/assets/suggest/suggested_product_5.webp';
import suggestedProduct_6 from '@/public/assets/suggest/suggested_product_6.webp';
import suggestedProduct_8 from '@/public/assets/suggest/suggested_product_8.webp';
import suggestedProduct_9 from '@/public/assets/suggest/suggested_product_9.webp';
import { SuggestedProductCard } from './subsets/suggestedProductCard';

import { UiP } from '@/components/shared/ui';
import { Product } from '@/interfaces/product';
import { nanoid } from 'nanoid';

const suggestedProductList: Product[] = [
  {
    id: 1,
    name: 'لپ تاپ 15.6 اینچی دل',
    description: 'مدل DC15250-15-Core 3 100U-8GB DDR4 3200MHz-512GB SSD-IPS 120Hz-Ubuntu',
    image: suggestedProduct_1,
    alt: 'لپ تاپ 15.6 اینچی دل',
    final_price: 1173000000,
    original_price: 1173000000,
    discount: 10,
    currency: 'IRR',
    quantity: 4,
    isAvailable: true,
  },
  {
    id: 2,
    name: 'اسپری ضدتعریق زنانه',
    description: 'ایموشن مدل Invisible Fresh حجم 150 میلی‌لیتر',
    image: suggestedProduct_2,
    alt: 'اسپری ضدتعریق زنانه',
    final_price: 5500000,
    original_price: 5500000,
    discount: 10,
    currency: 'IRR',
    quantity: 2,
    isAvailable: true,
  },
  {
    id: 3,
    name: 'اسپری بدن زنانه رودیر',
    description: 'مدل LEXUS WHITE حجم 200 میلی لیتر',
    image: suggestedProduct_3,
    alt: 'اسپری بدن زنانه رودیر',
    final_price: 5200000,
    original_price: 5200000,
    discount: 10,
    currency: 'IRR',
    quantity: 10,
    isAvailable: true,
  },
  {
    id: 4,
    name: 'اسپری بدن زنانه مدیا',
    description: 'مدل euphoria با رایحه معتدل حجم 200 میلی‌لیتر',
    image: suggestedProduct_4,
    alt: 'اسپری بدن زنانه مدیا',
    final_price: 2350000,
    original_price: 2350000,
    discount: 10,
    currency: 'IRR',
    quantity: 1,
    isAvailable: true,
  },
  {
    id: 5,
    name: 'اسپری بدن زنانه بارونس',
    description: 'مدل SHAKIRA حجم 200 میلی لیتر',
    image: suggestedProduct_5,
    alt: 'اسپری بدن زنانه بارونس',
    final_price: 3950000,
    original_price: 3950000,
    discount: 10,
    currency: 'IRR',
    quantity: 6,
    isAvailable: true,
  },
  {
    id: 6,
    name: 'هودی دخترانه',
    description: 'طرح پاندا کد F540',
    image: suggestedProduct_6,
    alt: 'هودی دخترانه',
    final_price: 8900000,
    original_price: 8900000,
    discount: 10,
    currency: 'IRR',
    quantity: 1,
    isAvailable: true,
  },
  {
    id: 7,
    name: 'شامپو بدن بیول مدل شیر و انبه',
    description: 'حجم 400 میلی‌لیتر، مرطوب‌کننده و تغذیه‌کننده پوست خشک',
    image: suggestedProduct_3,
    alt: 'شامپو بدن بیول مدل شیر و انبه',
    final_price: 3200000,
    original_price: 3200000,
    discount: 10,
    currency: 'IRR',
    quantity: 5,
    isAvailable: true,
  },
  {
    id: 8,
    name: 'اسپری ضد تعریق زنانه نیوآ',
    description: 'مدل FTE12 حجم 150 میلی لیتر',
    image: suggestedProduct_8,
    alt: 'اسپری ضد تعریق زنانه نیوآ',
    final_price: 8890000,
    original_price: 8890000,
    discount: 10,
    currency: 'IRR',
    quantity: 2,
    isAvailable: true,
  },
  {
    id: 9,
    name: 'کلاه کپ مردانه پارچه‌ای ساده',
    description: '',
    image: suggestedProduct_9,
    alt: 'کلاه کپ مردانه پارچه‌ای ساده',
    final_price: 2390000,
    original_price: 2390000,
    discount: 0,
    currency: 'IRR',
    quantity: 1,
    isAvailable: true,
  },
  {
    id: 10,
    name: 'اسپری بدن زنانه نیوآ',
    description: 'مدل powder touch حجم 150 میلی لیتر',
    image: suggestedProduct_10,
    alt: 'اسپری بدن زنانه نیوآ',
    final_price: 6900000,
    original_price: 6900000,
    discount: 10,
    currency: 'IRR',
    quantity: 3,
    isAvailable: true,
  },
];

export const OurSuggestion = () => {
  return (
    <section className="grid h-fit w-full px-6 sm:px-12 sm:py-8 lg:px-24 2xl:px-36">
      <UiP variant="style_4">
        پیشنهاد ما
      </UiP>
      <div className="grid h-fit w-full grid-cols-5 gap-0">
        {suggestedProductList.map((product) => (
          <SuggestedProductCard key={nanoid()} product={product} />
        ))}
      </div>
    </section>
  );
};

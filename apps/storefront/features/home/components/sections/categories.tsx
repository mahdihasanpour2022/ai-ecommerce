import { UiButton, UiImage, UiSpan } from '@/components/shared/ui';
import { nanoid } from 'nanoid';
import { StaticImageData } from 'next/image';

import babyDress_1 from '@/public/assets/category/baby_dress_1.webp';
import babyDress_2 from '@/public/assets/category/baby_dress_2.webp';
import babyDress_3 from '@/public/assets/category/baby_dress_3.webp';
import mensClothes from '@/public/assets/category/mens_clothes.webp';
import womenBags from '@/public/assets/category/women_bags.webp';
import womenDress from '@/public/assets/category/women_dress.webp';
import womenShoes from '@/public/assets/category/women_shoes.webp';

interface Category {
  en_name: string;
  fa_name: string;
  src: string | StaticImageData;
  alt: string;
}

const categoryList: Category[] = [
  { en_name: 'women_shoes', fa_name: 'کفش زنانه', src: womenShoes, alt: 'کفش زنانه' },
  { en_name: 'women_dress', fa_name: 'پیراهن زنانه', src: womenDress, alt: 'پیراهن زنانه' },
  { en_name: 'women_bags', fa_name: 'کیف زنانه', src: womenBags, alt: 'کیف زنانه' },
  { en_name: 'mens_clothes', fa_name: 'پیراهن مردانه', src: mensClothes, alt: ' مردانه' },
  { en_name: 'babyDress', fa_name: 'پسرانه', src: babyDress_1, alt: 'پسرانه' },
  { en_name: 'babyDress', fa_name: 'دخترانه', src: babyDress_2, alt: 'دخترانه' },
  { en_name: 'babyDress', fa_name: 'نوزاد', src: babyDress_3, alt: 'نوزاد' },
];

export const Categories = () => {
  return (
    <div className="flex w-full flex-wrap items-center justify-center gap-0! px-6 sm:gap-3 sm:px-12 sm:pt-2 lg:px-24 2xl:px-36">
      {categoryList.map((category: Category) => (
        <UiButton
          key={nanoid()}
          className="flex h-fit w-fit! flex-col items-center justify-center gap-0 sm:gap-1 px-2! sm:px-4!"
        >
          <UiImage
            alt={category.alt}
            src={category.src}
            className="h-16! w-16! bg-contain bg-center sm:h-24! sm:w-24!"
            width={350}
            height={350}
          />
          <UiSpan variant="style_2" className="">
            {category.fa_name}
          </UiSpan>
        </UiButton>
      ))}
    </div>
  );
};

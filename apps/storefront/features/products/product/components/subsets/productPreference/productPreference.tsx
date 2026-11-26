import { UiImage, UiSpan } from '@/components/shared/ui';
import cashOnDelivery from '@/public/assets/product/preferences/cash-on-delivery.webp';
import daysReturn from '@/public/assets/product/preferences/days-return.webp';
import delivery from '@/public/assets/product/preferences/delivery.webp';
import originalProducts from '@/public/assets/product/preferences/original-products.webp';

const PreferencesList = [
  { src: delivery, alt: 'delivery', text: 'امکان ارسال سریع' },
  { src: cashOnDelivery, alt: 'cash-on-delivery', text: 'امکان پرداخت سریع' },
  { src: daysReturn, alt: 'days-return', text: 'ضمانت بازگشت کالا' },
  { src: originalProducts, alt: 'original-products', text: 'ضمانت اصل بودن کالا' },
];

export const ProductPreference = () => {
  return (
    <ul
      aria-label="مزایای خرید"
      className="border-foreground/5 grid h-fit w-full grid-cols-1 gap-4 border-t border-b-4 px-4 pt-6 pb-8 sm:grid-cols-2 lg:grid-cols-4"
    >
      {PreferencesList.map((Preference) => (
        <li key={Preference.alt} className="flex items-center justify-start gap-2">
          <UiImage
            alt=""
            src={Preference.src}
            width={32}
            height={32}
            className="h-8! w-8!"
            variant="style_2"
          />
          <UiSpan className="font-bold!" variant="style_6">
            {Preference.text}
          </UiSpan>
        </li>
      ))}
    </ul>
  );
};

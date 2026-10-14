import { Seperator } from '@/components/shared';
import { UiImage, UiSpan } from '@/components/shared/ui';
import cashOnDelivery from '@/public/assets/footer-7-24/cash-on-delivery.webp';
import daysReturn from '@/public/assets/footer-7-24/days-return.webp';
import expressDelivery from '@/public/assets/footer-7-24/express-delivery.webp';
import originalProducts from '@/public/assets/footer-7-24/original-products.webp';
import support from '@/public/assets/footer-7-24/support.webp';
import siteLogo from '@/public/assets/header/site_logo.webp';
import instagram from '@/public/assets/socials/instagram.webp';
import telegram from '@/public/assets/socials/telegram.webp';
import { nanoid } from 'nanoid';

import e_namad from '@/public/assets/e-namad/e-namad-logo.png';
import rezi from '@/public/assets/e-namad/rezi.webp';

const images = [
  { src: cashOnDelivery, text: 'ضمانت اصل بودن کالا' },
  { src: daysReturn, text: 'هفت روز ضمانت بازگشت کالا' },
  { src: expressDelivery, text: '7 روز هفته ، 24 ساعته' },
  { src: originalProducts, text: 'امکان پرداخت در محل' },
  { src: support, text: 'امکان تحویل اگسپرس' },
];

export const Footer = () => {
  return (
    <div className="w-full pb-16">
      <Seperator className="my-0!" />
      <div className="h-fit w-full bg-gray-50 px-6 sm:px-12 sm:pt-6 lg:px-24 2xl:px-36">
        <UiImage
          alt="siteLogo"
          src={siteLogo}
          width={300}
          height={300}
          className="size-14 shrink-0 rounded-full"
          variant="style_2"
        />
        {/* phone */}
        <div className="flex w-full items-center justify-start gap-2 py-2">
          <UiSpan variant="style_7">تلفن پشتیبانی :</UiSpan>
          <UiSpan variant="style_7">09014648258</UiSpan>
        </div>
        {/* images  */}
        <div className="xs:grid-cols-3 grid w-full grid-cols-2 flex-wrap items-center justify-center gap-2 pt-4 pb-4 sm:justify-between sm:pt-6 sm:pb-10 md:grid-cols-5">
          {images.map((image) => (
            <div
              className="flex flex-col items-center justify-center gap-1 overflow-hidden border border-gray-300 whitespace-normal"
              key={nanoid()}
            >
              <UiImage
                alt={image.text}
                src={image.src}
                width={300}
                height={300}
                className="size-10 shrink-0 rounded-full border sm:size-14"
                variant="style_2"
              />
              <UiSpan variant="style_7">{image.text}</UiSpan>
            </div>
          ))}
        </div>
        {/* footer links  */}
        <div className="grid grid-cols-2 items-stretch justify-between gap-4 sm:grid-cols-4 sm:gap-0">
          {/* social links  */}
          <div className="flex h-full flex-col items-start justify-start">
            <UiSpan variant="style_5" className="pb-4">
              همراه ما باشید!
            </UiSpan>
            <ul className="flex items-center justify-between gap-4">
              <li className="">
                <UiImage
                  alt="instagram"
                  src={instagram}
                  width={100}
                  height={100}
                  className="h-12! w-12! object-cover"
                  variant="style_2"
                />
              </li>
              <li className="">
                <UiImage
                  alt="telegram"
                  src={telegram}
                  width={100}
                  height={100}
                  className="h-10! w-10! object-cover"
                  variant="style_2"
                />
              </li>
            </ul>
          </div>
          {/* sell guidlines  */}
          <div className="flex flex-col items-stretch justify-start">
            <UiSpan variant="style_5" className="pb-4">
              راهنمای خرید
            </UiSpan>
            <div className="flex flex-col items-start justify-center gap-2">
              <UiSpan variant="style_7">پرسش های متداول</UiSpan>
              <UiSpan variant="style_7">شرایط بازگشت کالا</UiSpan>
              <UiSpan variant="style_7">نحوه خرید</UiSpan>
            </div>
          </div>
          {/* customer servicess  */}
          <div className="flex flex-col items-stretch justify-start">
            <UiSpan variant="style_5" className="pb-4">
              خدمت مشتریان
            </UiSpan>
            <div className="flex flex-col items-start justify-center gap-2">
              <UiSpan variant="style_7">پرسش های متداول</UiSpan>
              <UiSpan variant="style_7">شرایط بازگشت کالا</UiSpan>
              <UiSpan variant="style_7">نحوه خرید</UiSpan>
            </div>
          </div>
          {/* e-namad */}
          <div className="justify-censtartter flex flex-col items-stretch">
            <UiSpan variant="style_5" className="pb-4">
              مورد اعتماد شما
            </UiSpan>
            <div className="3xs:flex-row flex flex-col items-center justify-start gap-4">
              <div className="h-16! w-16! rounded-2xl border border-gray-300 md:h-24! md:w-24!">
                <UiImage
                  alt="e_namad"
                  src={e_namad}
                  width={300}
                  height={300}
                  className="h-full w-full shrink-0 object-contain! p-2"
                  variant="style_2"
                />
              </div>
              <div className="h-16! w-16! rounded-2xl border border-gray-300 md:h-24! md:w-24!">
                <UiImage
                  alt="rezi"
                  src={rezi}
                  width={300}
                  height={300}
                  className="h-full w-full shrink-0 object-contain! p-2"
                  variant="style_2"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

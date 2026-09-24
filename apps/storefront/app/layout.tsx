import type { Metadata } from 'next';
import localFont from 'next/font/local';
import '../styles/globals.css';

const iranSans = localFont({
  src: [
    {
      path: '../../../assets/fonts/iransans/IRANSansXFaNum-Regular.ttf',
      weight: '400',
      style: 'normal',
    },
    {
      path: '../../../assets/fonts/iransans/IRANSansXFaNum-Medium.ttf',
      weight: '500',
      style: 'normal',
    },
    {
      path: '../../../assets/fonts/iransans/IRANSansXFaNum-Bold.ttf',
      weight: '700',
      style: 'normal',
    },
  ],
  display: 'swap',
  variable: '--font-iran-sans',
});

export const metadata: Metadata = {
  title: 'وبسایت فروشگاهی',
  description: 'فروش انواع محصولات',
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="fa-IR" dir="rtl" className={`${iranSans.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}

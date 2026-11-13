import { StorefrontConnectivityGuard } from '@/components/shared';
import type { Metadata } from 'next';
import localFont from 'next/font/local';
import NextTopLoader from 'nextjs-toploader';
import { Toaster } from 'sonner';
import { ReactQueryProvider } from '../providers/react-query-provider';
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
      <body className="flex min-h-full flex-col" cz-shortcut-listen="true">
        <NextTopLoader
          color="var(--nice-red)"
          height={3}
          showSpinner={false}
          shadow="0 0 10px var(--nice-red), 0 0 5px var(--nice-red)"
          zIndex={2000}
        />
        <ReactQueryProvider>
          <StorefrontConnectivityGuard>
            <Toaster position="top-center" richColors dir="rtl" />
            {children}
          </StorefrontConnectivityGuard>
        </ReactQueryProvider>
      </body>
    </html>
  );
}

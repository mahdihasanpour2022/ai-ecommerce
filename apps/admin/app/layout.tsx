import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { AntdRegistry } from '@ant-design/nextjs-registry';
import localFont from 'next/font/local';
import { AdminUiProvider } from './admin-ui-provider';
import { AuthProvider } from './auth/auth-provider';
import { DocumentShell } from './document-shell';
import 'antd/dist/reset.css';
import './globals.css';

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
  title: 'پنل مدیریت فروشگاه قطعات خودرو',
  description: 'ورود امن و مدیریت فروشگاه قطعات خودرو',
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <DocumentShell bodyClassName={iranSans.variable}>
      <AntdRegistry>
        <AdminUiProvider>
          <AuthProvider>{children}</AuthProvider>
        </AdminUiProvider>
      </AntdRegistry>
    </DocumentShell>
  );
}

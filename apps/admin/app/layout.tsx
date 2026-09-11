import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { AntdRegistry } from '@ant-design/nextjs-registry';
import localFont from 'next/font/local';
import { cookies, headers } from 'next/headers';
import { AdminUiProvider } from './admin-ui-provider';
import { ADMIN_THEME_COOKIE, parseAdminTheme } from './admin-theme';
import { AuthProvider } from './auth/auth-provider';
import { DocumentShell } from './document-shell';
import 'antd/dist/reset.css';
import '../styles/globals.css';
import { AUTH_STATE_HEADER, decodeAuthenticationHeader } from './auth/server-auth-header';

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
  title: 'پنل مدیریت فروشگاه پوشاک',
  description: 'ورود امن و مدیریت فروشگاه پوشاک',
};

export default async function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  const [requestHeaders, cookieStore] = await Promise.all([headers(), cookies()]);
  const initialCurrent = decodeAuthenticationHeader(requestHeaders.get(AUTH_STATE_HEADER));
  const initialTheme = parseAdminTheme(cookieStore.get(ADMIN_THEME_COOKIE)?.value);
  return (
    <DocumentShell bodyClassName={iranSans.variable} theme={initialTheme}>
      <AntdRegistry>
        <AdminUiProvider initialTheme={initialTheme}>
          <AuthProvider initialCurrent={initialCurrent}>{children}</AuthProvider>
        </AdminUiProvider>
      </AntdRegistry>
    </DocumentShell>
  );
}

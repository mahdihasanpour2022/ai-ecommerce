import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { AntdRegistry } from '@ant-design/nextjs-registry';
import { AdminUiProvider } from './admin-ui-provider';
import { AuthProvider } from './auth/auth-provider';
import { DocumentShell } from './document-shell';
import 'antd/dist/reset.css';
import './globals.css';

export const metadata: Metadata = {
  title: 'پنل مدیریت فروشگاه قطعات خودرو',
  description: 'ورود امن و مدیریت فروشگاه قطعات خودرو',
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <DocumentShell>
      <AntdRegistry>
        <AdminUiProvider>
          <AuthProvider>{children}</AuthProvider>
        </AdminUiProvider>
      </AntdRegistry>
    </DocumentShell>
  );
}

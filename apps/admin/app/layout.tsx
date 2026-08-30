import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { AuthProvider } from './auth/auth-provider';
import { DocumentShell } from './document-shell';
import './globals.css';

export const metadata: Metadata = {
  title: 'پنل مدیریت فروشگاه قطعات خودرو',
  description: 'ورود امن و مدیریت فروشگاه قطعات خودرو',
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <DocumentShell>
      <AuthProvider>{children}</AuthProvider>
    </DocumentShell>
  );
}

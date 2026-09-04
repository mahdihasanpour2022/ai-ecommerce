'use client';

import type { ReactNode } from 'react';
import { ConfigProvider } from 'antd';
import faIR from 'antd/locale/fa_IR';

export function AdminUiProvider({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <ConfigProvider direction="rtl" locale={faIR}>
      {children}
    </ConfigProvider>
  );
}

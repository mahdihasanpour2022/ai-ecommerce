'use client';

import type { ReactNode } from 'react';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { ConfigProvider, theme as antTheme } from 'antd';
import faIR from 'antd/locale/fa_IR';
import { ADMIN_THEME_COOKIE } from './admin-theme';
import type { AdminTheme } from './admin-theme';
import { ReactQueryProvider } from './react-query-provider';

interface AdminThemeContextValue {
  readonly theme: AdminTheme;
  readonly setTheme: (theme: AdminTheme) => void;
}

const AdminThemeContext = createContext<AdminThemeContextValue | null>(null);

function persistTheme(theme: AdminTheme): void {
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
  document.cookie = `${ADMIN_THEME_COOKIE}=${theme}; Path=/; Max-Age=31536000; SameSite=Lax`;
}

export function AdminUiProvider({
  children,
  initialTheme = 'light',
}: Readonly<{ children: ReactNode; initialTheme?: AdminTheme }>) {
  const [theme, setThemeState] = useState<AdminTheme>(initialTheme);
  const setTheme = useCallback((nextTheme: AdminTheme) => {
    setThemeState(nextTheme);
    persistTheme(nextTheme);
  }, []);
  const contextValue = useMemo(() => ({ theme, setTheme }), [setTheme, theme]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
  }, [theme]);

  return (
    <AdminThemeContext.Provider value={contextValue}>
      <ConfigProvider
        direction="rtl"
        locale={faIR}
        theme={{
          algorithm: theme === 'dark' ? antTheme.darkAlgorithm : antTheme.defaultAlgorithm,
          token: {
            colorPrimary: '#ed980e',
            colorInfo: '#ed980e',
            colorTextLightSolid: '#2d2112',
            borderRadius: 12,
            controlHeight: 44,
            fontFamily: 'var(--font-iran-sans), Tahoma, Arial, sans-serif',
          },
          components: {
            Button: { primaryShadow: '0 8px 20px rgb(237 152 14 / 20%)' },
            Select: {
              optionActiveBg: 'rgb(242 178 73 / 14%)',
              optionSelectedBg: 'rgb(242 178 73 / 22%)',
              optionSelectedColor: theme === 'dark' ? '#f7c66f' : '#704000',
            },
          },
        }}
      >
        <ReactQueryProvider>{children}</ReactQueryProvider>
      </ConfigProvider>
    </AdminThemeContext.Provider>
  );
}

export function useAdminTheme(): AdminThemeContextValue {
  const value = useContext(AdminThemeContext);
  if (!value) throw new Error('useAdminTheme must be used within AdminUiProvider.');
  return value;
}

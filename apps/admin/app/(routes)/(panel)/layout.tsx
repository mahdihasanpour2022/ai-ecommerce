import type { ReactNode } from 'react';
import { ProtectedAdminShell } from './admin-shell';

export default function AdminPanelLayout({ children }: Readonly<{ children: ReactNode }>) {
  return <ProtectedAdminShell>{children}</ProtectedAdminShell>;
}

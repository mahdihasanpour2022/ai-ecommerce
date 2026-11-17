import { AuthFlowGuard } from '@/features/customer-auth/auth-flow-guard';
import { Suspense, type ReactNode } from 'react';

export default function AuthLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <Suspense fallback={null}>
      <AuthFlowGuard>{children}</AuthFlowGuard>
    </Suspense>
  );
}

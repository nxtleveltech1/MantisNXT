'use client';

import type { ReactNode } from 'react';
import { AuthProvider } from '@/lib/auth/auth-context';
import { QueryProvider } from '@/lib/query-provider';
import AsyncBoundary from '@/components/ui/AsyncBoundary';
import { ThemeProvider } from '@/components/theme-provider';
import { ActivityTrackingInitializer } from '@/lib/activity-tracker';
import { AutoLogoutHandler } from '@/components/auth/AutoLogoutHandler';
import { Toaster } from 'sonner';

interface ProvidersProps {
  children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return (
    <ThemeProvider defaultTheme="system" storageKey="theme">
      <QueryProvider>
        <AuthProvider>
          <AsyncBoundary>
            {children}
            <ActivityTrackingInitializer />
            <AutoLogoutHandler />
          </AsyncBoundary>
          <Toaster richColors position="top-right" />
        </AuthProvider>
      </QueryProvider>
    </ThemeProvider>
  );
}

'use client';

import type { ReactNode } from 'react';
import { AuthProvider } from '@/lib/auth/auth-context';
import { QueryProvider } from '@/lib/query-provider';
import AsyncBoundary from '@/components/ui/AsyncBoundary';
import { ThemeProvider } from '@/components/theme-provider';
import { ProcessingIndicator } from '@/components/ui/indicators/ProcessingIndicator';
import { ActivityTrackingInitializer } from '@/lib/activity-tracker';

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
            <ProcessingIndicator size="md" showLabel />
          </AsyncBoundary>
        </AuthProvider>
      </QueryProvider>
    </ThemeProvider>
  );
}

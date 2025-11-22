'use client'

import type { ReactNode } from 'react'
import { AuthProvider } from '@/lib/auth/auth-context'
import { QueryProvider } from '@/lib/query-provider'
import AsyncBoundary from '@/components/ui/AsyncBoundary'
import { ThemeProvider } from '@/components/theme-provider'

interface ProvidersProps {
  children: ReactNode
}

export function Providers({ children }: ProvidersProps) {
  return (
    <ThemeProvider defaultTheme="system" storageKey="theme">
      <QueryProvider>
        <AuthProvider>
          <AsyncBoundary>{children}</AsyncBoundary>
        </AuthProvider>
      </QueryProvider>
    </ThemeProvider>
  )
}

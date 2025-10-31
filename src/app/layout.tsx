import type { Metadata } from 'next'
import './globals.css'
import { AuthProvider } from '@/lib/auth/auth-context'
import { QueryProvider } from '@/lib/query-provider'
import AsyncBoundary from '@/components/ui/AsyncBoundary'

export const metadata: Metadata = {
  title: 'MantisNXT - Procurement Management System',
  description: 'Complete supplier management and procurement platform for South African businesses',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en-ZA">
      <body className="font-inter antialiased">
        <QueryProvider>
          <AuthProvider>
            <AsyncBoundary>
              {children}
            </AsyncBoundary>
          </AuthProvider>
        </QueryProvider>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // Initialize authentication state
              if (typeof window !== 'undefined') {
                window.__AUTH_INITIALIZED__ = true;
              }
            `
          }}
        />
      </body>
    </html>
  )
}

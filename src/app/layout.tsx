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
      <head>
        <style dangerouslySetInnerHTML={{
          __html: `
            @font-face {
              font-family: 'Inter';
              font-style: normal;
              font-weight: 100 900;
              font-display: swap;
              src: local('Inter'), local('Inter-Regular'), 
                   local('system-ui'), local('-apple-system'), local('BlinkMacSystemFont'), 
                   local('Segoe UI'), local('Roboto'), local('Helvetica Neue'), local('Arial'), 
                   local('sans-serif');
            }
            
            /* Fallback font loading with error handling */
            .font-inter {
              font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            }
            
            /* Ensure proper font loading */
            body {
              font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            }
          `
        }} />
      </head>
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

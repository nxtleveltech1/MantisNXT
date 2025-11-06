import type { Metadata } from 'next'
import './globals.css'
import { AuthProvider } from '@/lib/auth/auth-context'
import { QueryProvider } from '@/lib/query-provider'
import AsyncBoundary from '@/components/ui/AsyncBoundary'
import { ThemeProvider } from '@/components/theme-provider'

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
    <html lang="en-ZA" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // Prevent flash of unstyled content (FOUC)
              (function() {
                const theme = localStorage.getItem('theme') || 'system';
                const root = document.documentElement;

                if (theme === 'system') {
                  const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                  root.classList.add(isDark ? 'dark' : 'light');
                } else {
                  root.classList.add(theme);
                }
              })();
            `
          }}
        />
      </head>
      <body className="font-inter antialiased theme-transition">
        <ThemeProvider defaultTheme="system" storageKey="theme">
          <QueryProvider>
            <AuthProvider>
              <AsyncBoundary>
                {children}
              </AsyncBoundary>
            </AuthProvider>
          </QueryProvider>
        </ThemeProvider>
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

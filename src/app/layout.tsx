import type { Metadata } from 'next'
import './globals.css'
import { AuthProvider } from '@/lib/auth/auth-context'
import { QueryProvider } from '@/lib/query-provider'

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
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@100;200;300;400;500;600;700;800;900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-inter antialiased">
        <QueryProvider>
          <AuthProvider>
            {children}
          </AuthProvider>
        </QueryProvider>
      </body>
    </html>
  )
}
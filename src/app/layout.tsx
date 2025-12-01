import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';
import '@/lib/fetch-interceptor';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
  weight: ['100', '200', '300', '400', '500', '600', '700', '800', '900'],
});

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-ZA" suppressHydrationWarning className={inter.variable}>
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
            `,
          }}
        />
      </head>
      <body className="font-inter theme-transition antialiased">
        <Providers>{children}</Providers>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // Initialize authentication state
              if (typeof window !== 'undefined') {
                window.__AUTH_INITIALIZED__ = true;
              }
            `,
          }}
        />
      </body>
    </html>
  );
}

import type { Metadata } from 'next';
import { ClerkProvider } from '@clerk/nextjs';
import './globals.css';
import { Providers } from './providers';
import '@/lib/fetch-interceptor';

export const metadata: Metadata = {
  title: 'MantisNXT Dashboard',
  description: 'Procurement and inventory management system',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // Clerk publishable key is REQUIRED for the application to function
  // This must be set in Vercel environment variables:
  // Settings → Environment Variables → Add NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
  // Get your key from: https://dashboard.clerk.com/last-active?path=api-keys
  const clerkPublishableKey =
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ||
    // Fallback placeholder for build-time static generation
    // This allows the build to complete, but Clerk will fail at runtime if the real key isn't set
    // Format matches Clerk's test key pattern to pass format validation
    'pk_test_BUILD_PLACEHOLDER_REPLACE_WITH_REAL_KEY_IN_VERCEL_ENV_VARS';

  // Redirect URLs are configured via environment variables to avoid deprecation warnings.
  // Set these in your .env.local or Vercel environment variables:
  // - CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=/ (defaults to / if not set)
  // - CLERK_SIGN_UP_FALLBACK_REDIRECT_URL=/ (defaults to / if not set)
  // See: https://clerk.com/docs/guides/development/customize-redirect-urls
  return (
    <ClerkProvider publishableKey={clerkPublishableKey}>
      <html lang="en-ZA" suppressHydrationWarning>
        <head />
        <body
          className="theme-transition antialiased"
          style={{
            fontFamily:
              'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif',
          }}
        >
          <Providers>{children}</Providers>
        </body>
      </html>
    </ClerkProvider>
  );
}

'use client';

/**
 * Global Error Boundary
 * Catches errors that bubble up to the root of the application
 */

import { useEffect } from 'react';

interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    console.error('🔥 Global Error:', error);
  }, [error]);

  return (
    <html lang="en-ZA">
      <body className="bg-gray-50 font-sans">
        <div className="flex min-h-screen items-center justify-center p-4">
          <div className="w-full max-w-md rounded-lg border-2 border-red-200 bg-white p-8 shadow-xl">
            <div className="text-center">
              <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
                <svg
                  className="h-8 w-8 text-red-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>

              <h1 className="mb-2 text-2xl font-bold text-gray-900">Application Error</h1>

              <p className="mb-6 text-gray-600">
                A critical error occurred. Please try refreshing the page.
              </p>

              {error.digest && (
                <div className="mb-6 rounded bg-gray-100 p-3 font-mono text-xs break-all text-gray-700">
                  Error ID: {error.digest}
                </div>
              )}

              <div className="space-y-3">
                <button
                  onClick={reset}
                  className="w-full rounded-lg bg-blue-600 px-4 py-2 font-medium text-white transition-colors hover:bg-blue-700"
                >
                  Try Again
                </button>

                <button
                  onClick={() => (window.location.href = '/')}
                  className="w-full rounded-lg bg-gray-200 px-4 py-2 font-medium text-gray-800 transition-colors hover:bg-gray-300"
                >
                  Return Home
                </button>
              </div>

              {process.env.NODE_ENV === 'development' && (
                <details className="mt-6 text-left">
                  <summary className="cursor-pointer text-sm font-medium text-gray-700">
                    Error Details
                  </summary>
                  <pre className="mt-2 overflow-x-auto rounded bg-gray-100 p-3 text-xs">
                    {error.message}
                    {'\n\n'}
                    {error.stack}
                  </pre>
                </details>
              )}
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}

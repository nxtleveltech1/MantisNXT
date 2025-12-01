'use client';

/**
 * Root-Level Error Boundary
 * Catches unhandled errors in the application and provides user-friendly recovery options
 */

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, RefreshCw, Home, ArrowLeft } from 'lucide-react';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function RootError({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Log error to console in development
    console.error('🚨 Root Error Boundary:', error);

    // Log to error tracking service in production
    if (process.env.NODE_ENV === 'production' && typeof window !== 'undefined') {
      // Send to error tracking service (e.g., Sentry, LogRocket)
      try {
        // Example: window.errorTracker?.captureException(error);
        fetch('/api/errors/log', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: error.message,
            digest: error.digest,
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
            url: window.location.href,
          }),
        }).catch(() => {
          // Silently fail if logging fails
        });
      } catch (loggingError) {
        // Silently fail if error logging fails
      }
    }
  }, [error]);

  const handleGoHome = () => {
    window.location.href = '/';
  };

  const handleGoBack = () => {
    window.history.back();
  };

  return (
    <div className="font-inter flex min-h-screen items-center justify-center bg-gray-50 p-4 antialiased">
      <Card className="w-full max-w-2xl border-red-200 shadow-lg">
        <CardHeader className="space-y-4">
          <div className="flex items-center space-x-3">
            <div className="rounded-full bg-red-100 p-3">
              <AlertTriangle className="h-8 w-8 text-red-600" />
            </div>
            <div>
              <CardTitle className="text-2xl text-red-900">Something went wrong</CardTitle>
              <CardDescription className="mt-1 text-base">
                We encountered an unexpected error
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          <Alert variant="destructive" className="border-red-200 bg-red-50">
            <AlertDescription>
              <p className="mb-2 text-sm text-red-800">
                An error occurred while loading this page. This could be due to:
              </p>
              <ul className="ml-2 list-inside list-disc space-y-1 text-sm text-red-700">
                <li>A temporary server issue</li>
                <li>Network connectivity problems</li>
                <li>An issue with the page data</li>
              </ul>
            </AlertDescription>
          </Alert>

          {error.digest && (
            <div className="rounded-lg border border-gray-200 bg-gray-100 p-3">
              <p className="mb-1 text-xs font-medium text-gray-600">Error Reference</p>
              <code className="font-mono text-xs break-all text-gray-800">{error.digest}</code>
            </div>
          )}

          {process.env.NODE_ENV === 'development' && (
            <details className="rounded-lg border border-gray-200 bg-gray-50 p-4">
              <summary className="cursor-pointer text-sm font-medium text-gray-700 hover:text-gray-900">
                Developer Information
              </summary>
              <div className="mt-3 space-y-2">
                <div>
                  <p className="mb-1 text-xs font-medium text-gray-600">Error Message:</p>
                  <pre className="overflow-x-auto rounded border border-gray-200 bg-white p-2 text-xs">
                    {error.message}
                  </pre>
                </div>
                {error.stack && (
                  <div>
                    <p className="mb-1 text-xs font-medium text-gray-600">Stack Trace:</p>
                    <pre className="max-h-48 overflow-x-auto rounded border border-gray-200 bg-white p-2 text-xs">
                      {error.stack}
                    </pre>
                  </div>
                )}
              </div>
            </details>
          )}

          <div className="grid grid-cols-1 gap-3 pt-2 md:grid-cols-3">
            <Button onClick={reset} className="w-full bg-blue-600 hover:bg-blue-700">
              <RefreshCw className="mr-2 h-4 w-4" />
              Try Again
            </Button>
            <Button onClick={handleGoBack} variant="outline" className="w-full">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Go Back
            </Button>
            <Button onClick={handleGoHome} variant="outline" className="w-full">
              <Home className="mr-2 h-4 w-4" />
              Go Home
            </Button>
          </div>

          <div className="border-t border-gray-200 pt-4 text-center">
            <p className="text-sm text-gray-600">
              If this problem persists, please contact support with the error reference above.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

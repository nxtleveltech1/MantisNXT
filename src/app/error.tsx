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
            url: window.location.href
          })
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
    <div className="min-h-screen flex items-center justify-center p-4 font-inter antialiased bg-gray-50">
      <Card className="max-w-2xl w-full border-red-200 shadow-lg">
        <CardHeader className="space-y-4">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-red-100 rounded-full">
              <AlertTriangle className="w-8 h-8 text-red-600" />
            </div>
            <div>
              <CardTitle className="text-2xl text-red-900">
                Something went wrong
              </CardTitle>
              <CardDescription className="text-base mt-1">
                We encountered an unexpected error
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          <Alert variant="destructive" className="bg-red-50 border-red-200">
            <AlertDescription>
              <p className="text-sm text-red-800 mb-2">
                An error occurred while loading this page. This could be due to:
              </p>
              <ul className="list-disc list-inside text-sm text-red-700 space-y-1 ml-2">
                <li>A temporary server issue</li>
                <li>Network connectivity problems</li>
                <li>An issue with the page data</li>
              </ul>
            </AlertDescription>
          </Alert>

          {error.digest && (
            <div className="bg-gray-100 p-3 rounded-lg border border-gray-200">
              <p className="text-xs text-gray-600 mb-1 font-medium">Error Reference</p>
              <code className="text-xs font-mono text-gray-800 break-all">
                {error.digest}
              </code>
            </div>
          )}

          {process.env.NODE_ENV === 'development' && (
            <details className="border border-gray-200 rounded-lg p-4 bg-gray-50">
              <summary className="cursor-pointer text-sm font-medium text-gray-700 hover:text-gray-900">
                Developer Information
              </summary>
              <div className="mt-3 space-y-2">
                <div>
                  <p className="text-xs font-medium text-gray-600 mb-1">Error Message:</p>
                  <pre className="text-xs bg-white p-2 rounded border border-gray-200 overflow-x-auto">
                    {error.message}
                  </pre>
                </div>
                {error.stack && (
                  <div>
                    <p className="text-xs font-medium text-gray-600 mb-1">Stack Trace:</p>
                    <pre className="text-xs bg-white p-2 rounded border border-gray-200 overflow-x-auto max-h-48">
                      {error.stack}
                    </pre>
                  </div>
                )}
              </div>
            </details>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
            <Button
              onClick={reset}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Try Again
            </Button>
            <Button
              onClick={handleGoBack}
              variant="outline"
              className="w-full"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Go Back
            </Button>
            <Button
              onClick={handleGoHome}
              variant="outline"
              className="w-full"
            >
              <Home className="w-4 h-4 mr-2" />
              Go Home
            </Button>
          </div>

          <div className="text-center pt-4 border-t border-gray-200">
            <p className="text-sm text-gray-600">
              If this problem persists, please contact support with the error reference above.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

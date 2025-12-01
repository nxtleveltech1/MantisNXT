// @ts-nocheck
'use client';
import React from 'react';
import { AlertTriangle, RefreshCw, ServerOff, Database, WifiOff, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface ErrorStateProps {
  error: Error | string;
  onRetry?: () => void;
  context?: string;
  fullPage?: boolean;
}

interface ErrorDisplayConfig {
  icon: React.ReactNode;
  title: string;
  description: string;
  color: string;
}

const getErrorConfig = (error: Error | string): ErrorDisplayConfig => {
  const errorMessage = typeof error === 'string' ? error : error.message;
  const errorLower = errorMessage.toLowerCase();

  if (errorLower.includes('timeout') || errorLower.includes('timed out')) {
    return {
      icon: <WifiOff className="h-12 w-12" />,
      title: 'Request Timeout',
      description:
        'The server took too long to respond. Please check your connection and try again.',
      color: 'text-orange-600',
    };
  }

  if (errorLower.includes('network') || errorLower.includes('fetch')) {
    return {
      icon: <WifiOff className="h-12 w-12" />,
      title: 'Network Error',
      description: 'Unable to connect to the server. Please check your internet connection.',
      color: 'text-red-600',
    };
  }

  if (errorLower.includes('database') || errorLower.includes('sql')) {
    return {
      icon: <Database className="h-12 w-12" />,
      title: 'Database Error',
      description: 'There was a problem accessing the database. Our team has been notified.',
      color: 'text-red-600',
    };
  }

  if (errorLower.includes('server') || errorLower.includes('500')) {
    return {
      icon: <ServerOff className="h-12 w-12" />,
      title: 'Server Error',
      description: 'The server encountered an error. Please try again later.',
      color: 'text-red-600',
    };
  }

  if (errorLower.includes('unauthorized') || errorLower.includes('401')) {
    return {
      icon: <ShieldAlert className="h-12 w-12" />,
      title: 'Authentication Required',
      description: 'You need to be logged in to access this resource.',
      color: 'text-yellow-600',
    };
  }

  if (errorLower.includes('forbidden') || errorLower.includes('403')) {
    return {
      icon: <ShieldAlert className="h-12 w-12" />,
      title: 'Access Denied',
      description: 'You do not have permission to access this resource.',
      color: 'text-red-600',
    };
  }

  if (errorLower.includes('not found') || errorLower.includes('404')) {
    return {
      icon: <AlertTriangle className="h-12 w-12" />,
      title: 'Resource Not Found',
      description: 'The requested resource could not be found.',
      color: 'text-orange-600',
    };
  }

  return {
    icon: <AlertTriangle className="h-12 w-12" />,
    title: 'Something Went Wrong',
    description: 'An unexpected error occurred. Please try again.',
    color: 'text-red-600',
  };
};

export const ErrorState: React.FC<ErrorStateProps> = ({
  error,
  onRetry,
  context,
  fullPage = false,
}) => {
  const config = getErrorConfig(error);
  const errorMessage = typeof error === 'string' ? error : error.message;

  const containerClass = fullPage
    ? 'flex items-center justify-center min-h-screen p-6'
    : 'flex items-center justify-center p-6';

  return (
    <div className={containerClass} role="alert" aria-live="assertive">
      <Card className="w-full max-w-md border-red-200 bg-red-50">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center text-center">
            <div className={`mb-4 ${config.color}`} aria-hidden="true">
              {config.icon}
            </div>

            <h2 className="mb-2 text-xl font-semibold text-gray-900">{config.title}</h2>

            <p className="mb-4 text-gray-700">{config.description}</p>

            {context && <p className="mb-4 text-sm text-gray-600">Context: {context}</p>}

            {process.env.NODE_ENV === 'development' && (
              <details className="mb-4 w-full text-left">
                <summary className="cursor-pointer text-sm text-gray-600 hover:text-gray-800">
                  Technical Details
                </summary>
                <pre className="mt-2 max-h-32 overflow-auto rounded bg-gray-100 p-3 text-xs">
                  {errorMessage}
                </pre>
              </details>
            )}

            {onRetry && (
              <Button
                onClick={onRetry}
                variant="default"
                size="sm"
                className="w-full sm:w-auto"
                aria-label="Retry the failed operation"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Try Again
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export const InlineErrorState: React.FC<ErrorStateProps> = ({ error, onRetry, context }) => {
  const config = getErrorConfig(error);
  const errorMessage = typeof error === 'string' ? error : error.message;

  return (
    <div
      className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4"
      role="alert"
      aria-live="polite"
    >
      <div className={`flex-shrink-0 ${config.color}`} aria-hidden="true">
        <AlertTriangle className="h-5 w-5" />
      </div>

      <div className="min-w-0 flex-1">
        <h3 className="text-sm font-medium text-red-900">{config.title}</h3>
        <p className="mt-1 text-sm text-red-700">{config.description}</p>

        {context && <p className="mt-1 text-xs text-red-600">{context}</p>}

        {process.env.NODE_ENV === 'development' && (
          <details className="mt-2">
            <summary className="cursor-pointer text-xs text-red-600 hover:text-red-800">
              Details
            </summary>
            <pre className="mt-1 max-h-24 overflow-auto rounded bg-red-100 p-2 text-xs">
              {errorMessage}
            </pre>
          </details>
        )}
      </div>

      {onRetry && (
        <Button
          onClick={onRetry}
          variant="ghost"
          size="sm"
          className="flex-shrink-0"
          aria-label="Retry"
        >
          <RefreshCw className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
};

export const MinimalErrorState: React.FC<ErrorStateProps> = ({ error, onRetry }) => {
  const errorMessage = typeof error === 'string' ? error : error.message;

  return (
    <div
      className="flex items-center justify-between gap-2 rounded border border-red-200 bg-red-50 p-3"
      role="alert"
      aria-live="polite"
    >
      <div className="flex min-w-0 items-center gap-2">
        <AlertTriangle className="h-4 w-4 flex-shrink-0 text-red-600" aria-hidden="true" />
        <p className="truncate text-sm text-red-700">{errorMessage}</p>
      </div>

      {onRetry && (
        <Button
          onClick={onRetry}
          variant="ghost"
          size="sm"
          className="h-8 flex-shrink-0"
          aria-label="Retry"
        >
          <RefreshCw className="h-3 w-3" />
        </Button>
      )}
    </div>
  );
};

export default ErrorState;

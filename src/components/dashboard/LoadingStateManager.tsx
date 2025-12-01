'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw, Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface LoadingStateManagerProps {
  loading: boolean;
  error: unknown;
  data: unknown;
  onRetry?: () => void;
  loadingComponent?: React.ReactNode;
  errorComponent?: React.ReactNode;
  emptyComponent?: React.ReactNode;
  children: React.ReactNode;
  retryable?: boolean;
}

const DefaultLoadingSkeleton = () => (
  <div className="animate-pulse">
    <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
      {[...Array(4)].map((_, i) => (
        <Card key={i}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1 space-y-2">
                <div className="h-4 w-20 rounded bg-gray-200"></div>
                <div className="h-8 w-16 rounded bg-gray-300"></div>
                <div className="h-3 w-24 rounded bg-gray-200"></div>
              </div>
              <div className="h-10 w-10 rounded-full bg-gray-200"></div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  </div>
);

const DefaultErrorState = ({
  error,
  onRetry,
  retryable,
}: {
  error: unknown;
  onRetry?: () => void;
  retryable?: boolean;
}) => {
  const [isRetrying, setIsRetrying] = React.useState(false);

  const handleRetry = async () => {
    if (!onRetry) return;

    setIsRetrying(true);
    try {
      await onRetry();
    } finally {
      setIsRetrying(false);
    }
  };

  const getErrorMessage = (error: unknown): string => {
    if (typeof error === 'string') return error;
    if (error?.message) return error.message;
    if (error?.error) return error.error;
    return 'An unexpected error occurred';
  };

  const isTimeoutError = (error: unknown): boolean => {
    const message = getErrorMessage(error).toLowerCase();
    return message.includes('timeout') || message.includes('timed out');
  };

  const isNetworkError = (error: unknown): boolean => {
    const message = getErrorMessage(error).toLowerCase();
    return (
      message.includes('fetch') || message.includes('network') || message.includes('connection')
    );
  };

  const errorMessage = getErrorMessage(error);
  const isTemporary = isTimeoutError(error) || isNetworkError(error);

  return (
    <Alert className="border-red-200 bg-red-50">
      <AlertTriangle className="h-4 w-4 text-red-600" />
      <AlertDescription className="text-red-800">
        <div className="space-y-3">
          <div>
            <p className="font-medium">
              {isTimeoutError(error)
                ? 'Request Timeout'
                : isNetworkError(error)
                  ? 'Network Error'
                  : 'Data Loading Failed'}
            </p>
            <p className="mt-1 text-sm">{errorMessage}</p>
            {isTemporary && (
              <p className="mt-1 text-xs text-red-600">
                This appears to be a temporary issue. Please try again.
              </p>
            )}
          </div>

          {(retryable ?? true) && onRetry && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleRetry}
              disabled={isRetrying}
              className="border-red-300 text-red-700 hover:bg-red-100"
            >
              {isRetrying ? (
                <>
                  <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                  Retrying...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-1 h-3 w-3" />
                  Try Again
                </>
              )}
            </Button>
          )}
        </div>
      </AlertDescription>
    </Alert>
  );
};

const DefaultEmptyState = () => (
  <Alert>
    <AlertDescription>
      No data available at the moment. Please check back later or contact support if this persists.
    </AlertDescription>
  </Alert>
);

const LoadingStateManager: React.FC<LoadingStateManagerProps> = ({
  loading,
  error,
  data,
  onRetry,
  loadingComponent,
  errorComponent,
  emptyComponent,
  children,
  retryable = true,
}) => {
  // Show loading state
  if (loading) {
    return <>{loadingComponent || <DefaultLoadingSkeleton />}</>;
  }

  // Show error state
  if (error) {
    return (
      <>
        {errorComponent || (
          <DefaultErrorState error={error} onRetry={onRetry} retryable={retryable} />
        )}
      </>
    );
  }

  // Show empty state
  if (!data || (Array.isArray(data) && data.length === 0)) {
    return <>{emptyComponent || <DefaultEmptyState />}</>;
  }

  // Show children when data is available
  return <>{children}</>;
};

// Specialized component for metric cards
interface MetricLoadingStateProps {
  loading: boolean;
  error: unknown;
  onRetry?: () => void;
  children: React.ReactNode;
}

export const MetricLoadingState: React.FC<MetricLoadingStateProps> = ({
  loading,
  error,
  onRetry,
  children,
}) => {
  if (loading) {
    return (
      <Card className="animate-pulse">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <div className="h-4 w-20 rounded bg-gray-200"></div>
              <div className="h-8 w-16 rounded bg-gray-300"></div>
              <div className="h-3 w-24 rounded bg-gray-200"></div>
            </div>
            <div className="h-10 w-10 rounded-full bg-gray-200"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-red-200">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <div className="text-sm font-medium text-red-600">Error</div>
              <div className="text-xs text-red-500">Failed to load</div>
              {onRetry && (
                <Button size="sm" variant="outline" onClick={onRetry} className="h-6 px-2 text-xs">
                  <RefreshCw className="mr-1 h-3 w-3" />
                  Retry
                </Button>
              )}
            </div>
            <AlertTriangle className="h-10 w-10 text-red-400" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return <>{children}</>;
};

export default LoadingStateManager;

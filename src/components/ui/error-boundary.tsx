'use client';

import type { ReactNode } from 'react';
import React, { Component } from 'react';
import { AlertTriangle, RefreshCw, Home, Bug, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface ErrorInfo {
  componentStack: string;
  errorBoundary?: string;
  errorBoundaryStack?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  retryCount: number;
  showDetails: boolean;
}

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: React.ComponentType<ErrorFallbackProps>;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  isolate?: boolean;
  level?: 'page' | 'section' | 'component';
  context?: string;
}

export interface ErrorFallbackProps {
  error: Error | null;
  errorInfo: ErrorInfo | null;
  resetError: () => void;
  retryCount: number;
  level?: 'page' | 'section' | 'component';
  context?: string;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private retryTimeoutId: NodeJS.Timeout | null = null;
  private maxRetries = 3;

  constructor(props: ErrorBoundaryProps) {
    super(props);

    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0,
      showDetails: false,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({
      errorInfo,
    });

    // Call custom error handler
    this.props.onError?.(error, errorInfo);

    // Log error details
    console.error('ErrorBoundary caught an error:', {
      error,
      errorInfo,
      context: this.props.context,
      level: this.props.level,
      retryCount: this.state.retryCount,
    });

    // Report to monitoring service (e.g., Sentry)
    this.reportError(error, errorInfo);
  }

  private reportError = (error: Error, errorInfo: ErrorInfo) => {
    // Add your error reporting logic here
    if (typeof window !== 'undefined' && (window as unknown).gtag) {
      (window as unknown).gtag('event', 'exception', {
        description: error.toString(),
        fatal: this.props.level === 'page',
        custom_map: {
          context: this.props.context,
          level: this.props.level,
          component_stack: errorInfo.componentStack,
        },
      });
    }
  };

  private resetError = () => {
    const newRetryCount = this.state.retryCount + 1;

    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: newRetryCount,
      showDetails: false,
    });

    // Auto-retry with exponential backoff for certain error types
    if (this.shouldAutoRetry() && newRetryCount <= this.maxRetries) {
      const delay = Math.min(1000 * Math.pow(2, newRetryCount - 1), 10000);

      this.retryTimeoutId = setTimeout(() => {
        this.forceUpdate();
      }, delay);
    }
  };

  private shouldAutoRetry = (): boolean => {
    const error = this.state.error;
    if (!error) return false;

    // Auto-retry for network errors, chunk load errors, etc.
    const autoRetryPatterns = [/loading chunk/i, /network error/i, /fetch/i, /timeout/i];

    return autoRetryPatterns.some(pattern => pattern.test(error.message));
  };

  componentWillUnmount() {
    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId);
    }
  }

  render() {
    if (this.state.hasError) {
      const FallbackComponent = this.props.fallback || DefaultErrorFallback;

      return (
        <FallbackComponent
          error={this.state.error}
          errorInfo={this.state.errorInfo}
          resetError={this.resetError}
          retryCount={this.state.retryCount}
          level={this.props.level}
          context={this.props.context}
        />
      );
    }

    return this.props.children;
  }
}

// Default error fallback component
const DefaultErrorFallback: React.FC<ErrorFallbackProps> = ({
  error,
  errorInfo,
  resetError,
  retryCount,
  level = 'component',
  context,
}) => {
  const [showDetails, setShowDetails] = React.useState(false);

  const getErrorSeverity = () => {
    if (level === 'page') return 'critical';
    if (level === 'section') return 'high';
    return 'medium';
  };

  const getErrorIcon = () => {
    switch (level) {
      case 'page':
        return <AlertTriangle className="h-8 w-8 text-red-500" />;
      case 'section':
        return <AlertTriangle className="h-6 w-6 text-red-500" />;
      default:
        return <Bug className="h-5 w-5 text-red-500" />;
    }
  };

  const getContainerClasses = () => {
    switch (level) {
      case 'page':
        return 'min-h-[400px] p-8';
      case 'section':
        return 'min-h-[200px] p-6';
      default:
        return 'min-h-[100px] p-4';
    }
  };

  const canRetry = retryCount < 3;
  const isNetworkError =
    error?.message?.toLowerCase().includes('network') ||
    error?.message?.toLowerCase().includes('fetch');

  return (
    <Card className={`border-red-200 bg-red-50/50 ${getContainerClasses()}`}>
      <CardContent className="flex flex-col items-center justify-center space-y-4 text-center">
        {getErrorIcon()}

        <div className="space-y-2">
          <h3 className="text-lg font-semibold text-red-900">
            {level === 'page'
              ? 'Page Error'
              : level === 'section'
                ? 'Section Error'
                : 'Component Error'}
          </h3>

          <p className="max-w-md text-red-700">
            {isNetworkError
              ? "We're having trouble connecting to our servers. Please check your internet connection and try again."
              : 'Something went wrong while loading this content. Our team has been notified.'}
          </p>

          {context && (
            <Badge variant="outline" className="border-red-300 text-red-600">
              {context}
            </Badge>
          )}

          {retryCount > 0 && <p className="text-sm text-red-600">Retry attempt: {retryCount}/3</p>}
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          {canRetry && (
            <Button
              onClick={resetError}
              variant="outline"
              size="sm"
              className="border-red-300 text-red-700 hover:bg-red-100"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Try Again
            </Button>
          )}

          {level === 'page' && (
            <Button
              onClick={() => (window.location.href = '/')}
              variant="outline"
              size="sm"
              className="border-red-300 text-red-700 hover:bg-red-100"
            >
              <Home className="mr-2 h-4 w-4" />
              Go Home
            </Button>
          )}

          <Button
            onClick={() => window.location.reload()}
            variant="outline"
            size="sm"
            className="border-red-300 text-red-700 hover:bg-red-100"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Reload Page
          </Button>
        </div>

        {/* Error Details (Collapsible) */}
        <Collapsible open={showDetails} onOpenChange={setShowDetails} className="w-full max-w-md">
          <CollapsibleTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="text-red-600 hover:bg-red-100 hover:text-red-700"
            >
              {showDetails ? (
                <>
                  <ChevronUp className="mr-2 h-4 w-4" />
                  Hide Details
                </>
              ) : (
                <>
                  <ChevronDown className="mr-2 h-4 w-4" />
                  Show Details
                </>
              )}
            </Button>
          </CollapsibleTrigger>

          <CollapsibleContent className="mt-4">
            <div className="rounded-lg border border-red-200 bg-red-100 p-3 text-left">
              <div className="space-y-2">
                <div>
                  <p className="text-xs font-semibold tracking-wider text-red-800 uppercase">
                    Error Message
                  </p>
                  <p className="font-mono text-sm break-all text-red-700">
                    {error?.message || 'Unknown error'}
                  </p>
                </div>

                {error?.stack && (
                  <div>
                    <p className="text-xs font-semibold tracking-wider text-red-800 uppercase">
                      Stack Trace
                    </p>
                    <pre className="max-h-32 overflow-auto font-mono text-xs whitespace-pre-wrap text-red-600">
                      {error.stack}
                    </pre>
                  </div>
                )}

                <div>
                  <p className="text-xs font-semibold tracking-wider text-red-800 uppercase">
                    Error ID
                  </p>
                  <p className="font-mono text-xs text-red-600">
                    {Date.now().toString(36).toUpperCase()}
                  </p>
                </div>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
};

// Specialized error boundaries for different UI levels
export const PageErrorBoundary: React.FC<Omit<ErrorBoundaryProps, 'level'>> = props => (
  <ErrorBoundary {...props} level="page" />
);

export const SectionErrorBoundary: React.FC<Omit<ErrorBoundaryProps, 'level'>> = props => (
  <ErrorBoundary {...props} level="section" />
);

export const ComponentErrorBoundary: React.FC<Omit<ErrorBoundaryProps, 'level'>> = props => (
  <ErrorBoundary {...props} level="component" />
);

// Hook for programmatic error boundaries
export const useErrorHandler = () => {
  const [error, setError] = React.useState<Error | null>(null);

  const resetError = React.useCallback(() => {
    setError(null);
  }, []);

  const captureError = React.useCallback((error: Error) => {
    setError(error);
  }, []);

  React.useEffect(() => {
    if (error) {
      throw error;
    }
  }, [error]);

  return { captureError, resetError };
};

export default ErrorBoundary;

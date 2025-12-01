/**
 * Comprehensive Fallback UI Components
 * User-friendly fallback states for various error scenarios
 * Implements WCAG AAA accessibility standards
 *
 * Error Boundary Fallback Hierarchy:
 * - Global: Critical application errors (full-page)
 * - Page: Page-level errors (full-page with navigation)
 * - Section: Section-level errors (inline with retry)
 * - Component: Component-level errors (minimal inline)
 * - Data: Data loading errors (specialized for fetch failures)
 */

'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import {
  AlertTriangle,
  Database,
  Clock,
  Wifi,
  RefreshCw,
  Search,
  Package,
  Users,
  BarChart3,
  XCircle,
  InfoIcon,
  Home,
  ArrowLeft,
  Mail,
  Server,
  Network,
  Bug,
} from 'lucide-react';

// ============================================================================
// EMPTY STATE COMPONENTS
// ============================================================================

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export function EmptyState({ icon, title, description, action, className = '' }: EmptyStateProps) {
  return (
    <Card className={`border-dashed ${className}`}>
      <CardContent className="flex flex-col items-center justify-center px-6 py-12">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
          {icon || <Search className="h-8 w-8 text-gray-400" />}
        </div>
        <h3 className="mb-2 text-lg font-semibold text-gray-900">{title}</h3>
        <p className="mb-4 max-w-md text-center text-sm text-gray-600">{description}</p>
        {action && (
          <Button onClick={action.onClick} variant="outline" size="sm">
            {action.label}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

export function NoDataFound({
  resourceName = 'items',
  onReset,
}: {
  resourceName?: string;
  onReset?: () => void;
}) {
  return (
    <EmptyState
      icon={<Search className="h-8 w-8 text-gray-400" />}
      title="No results found"
      description={`We couldn't find any ${resourceName} matching your criteria. Try adjusting your filters or search terms.`}
      action={
        onReset
          ? {
              label: 'Clear Filters',
              onClick: onReset,
            }
          : undefined
      }
    />
  );
}

export function NoInventoryItems({ onCreate }: { onCreate?: () => void }) {
  return (
    <EmptyState
      icon={<Package className="h-8 w-8 text-gray-400" />}
      title="No inventory items"
      description="You haven't added any inventory items yet. Start by adding your first product to begin tracking stock."
      action={
        onCreate
          ? {
              label: 'Add First Item',
              onClick: onCreate,
            }
          : undefined
      }
    />
  );
}

export function NoSuppliers({ onCreate }: { onCreate?: () => void }) {
  return (
    <EmptyState
      icon={<Users className="h-8 w-8 text-gray-400" />}
      title="No suppliers found"
      description="You don't have any suppliers in your system yet. Add suppliers to start managing your procurement."
      action={
        onCreate
          ? {
              label: 'Add Supplier',
              onClick: onCreate,
            }
          : undefined
      }
    />
  );
}

// ============================================================================
// ERROR STATE COMPONENTS
// ============================================================================

interface ErrorStateProps {
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  showErrorId?: boolean;
  errorId?: string;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  className?: string;
}

export function ErrorState({
  title,
  description,
  action,
  showErrorId = false,
  errorId,
  severity = 'medium',
  className = '',
}: ErrorStateProps) {
  const severityColors = {
    low: 'border-yellow-200 bg-yellow-50',
    medium: 'border-orange-200 bg-orange-50',
    high: 'border-red-200 bg-red-50',
    critical: 'border-red-300 bg-red-100',
  };

  const iconColors = {
    low: 'text-yellow-600',
    medium: 'text-orange-600',
    high: 'text-red-600',
    critical: 'text-red-700',
  };

  return (
    <Card className={`${severityColors[severity]} ${className}`}>
      <CardContent className="flex flex-col items-center justify-center px-6 py-8">
        <div
          className={`h-12 w-12 ${severityColors[severity]} mb-3 flex items-center justify-center rounded-full`}
        >
          <AlertTriangle className={`h-6 w-6 ${iconColors[severity]}`} />
        </div>
        <h3 className="mb-1 text-base font-semibold text-gray-900">{title}</h3>
        <p className="mb-4 max-w-md text-center text-sm text-gray-700">{description}</p>
        {action && (
          <Button onClick={action.onClick} variant="outline" size="sm">
            <RefreshCw className="mr-2 h-4 w-4" />
            {action.label}
          </Button>
        )}
        {showErrorId && errorId && (
          <p className="mt-3 font-mono text-xs text-gray-500">Error ID: {errorId}</p>
        )}
      </CardContent>
    </Card>
  );
}

export function DatabaseError({ onRetry }: { onRetry?: () => void }) {
  return (
    <ErrorState
      title="Database connection error"
      description="We're having trouble connecting to the database. This is usually temporary and should resolve shortly."
      action={
        onRetry
          ? {
              label: 'Try Again',
              onClick: onRetry,
            }
          : undefined
      }
      severity="high"
    />
  );
}

export function QueryTimeoutError({ onRetry }: { onRetry?: () => void }) {
  return (
    <ErrorState
      title="Request timed out"
      description="The request took too long to complete. Try using filters to narrow down the results."
      action={
        onRetry
          ? {
              label: 'Retry',
              onClick: onRetry,
            }
          : undefined
      }
      severity="medium"
    />
  );
}

export function NetworkError({ onRetry }: { onRetry?: () => void }) {
  return (
    <Card className="border-orange-200 bg-orange-50">
      <CardContent className="flex flex-col items-center justify-center px-6 py-8">
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-orange-100">
          <Wifi className="h-6 w-6 text-orange-600" />
        </div>
        <h3 className="mb-1 text-base font-semibold text-gray-900">Connection lost</h3>
        <p className="mb-4 max-w-md text-center text-sm text-gray-700">
          Unable to connect to the server. Please check your internet connection and try again.
        </p>
        {onRetry && (
          <Button onClick={onRetry} variant="outline" size="sm">
            <RefreshCw className="mr-2 h-4 w-4" />
            Retry Connection
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================================================
// LOADING STATE COMPONENTS
// ============================================================================

export function LoadingCard({ message = 'Loading...' }: { message?: string }) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-12">
        <div className="relative mb-4 h-12 w-12">
          <div className="absolute inset-0 rounded-full border-4 border-gray-200"></div>
          <div className="absolute inset-0 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
        </div>
        <p className="text-sm text-gray-600">{message}</p>
      </CardContent>
    </Card>
  );
}

export function LoadingSkeleton() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="h-8 w-1/4 rounded bg-gray-200"></div>
      <div className="h-4 w-full rounded bg-gray-200"></div>
      <div className="h-4 w-5/6 rounded bg-gray-200"></div>
      <div className="h-4 w-4/6 rounded bg-gray-200"></div>
    </div>
  );
}

export function TableLoadingSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex animate-pulse gap-4">
          <div className="h-12 flex-1 rounded bg-gray-200"></div>
          <div className="h-12 flex-1 rounded bg-gray-200"></div>
          <div className="h-12 flex-1 rounded bg-gray-200"></div>
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// INLINE ERROR COMPONENTS
// ============================================================================

interface InlineErrorProps {
  message: string;
  onDismiss?: () => void;
  severity?: 'info' | 'warning' | 'error';
}

export function InlineError({ message, onDismiss, severity = 'error' }: InlineErrorProps) {
  const severityConfig = {
    info: {
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      text: 'text-blue-800',
      icon: InfoIcon,
    },
    warning: {
      bg: 'bg-yellow-50',
      border: 'border-yellow-200',
      text: 'text-yellow-800',
      icon: AlertTriangle,
    },
    error: {
      bg: 'bg-red-50',
      border: 'border-red-200',
      text: 'text-red-800',
      icon: XCircle,
    },
  };

  const config = severityConfig[severity];
  const Icon = config.icon;

  return (
    <Alert className={`${config.bg} ${config.border}`}>
      <Icon className="h-4 w-4" />
      <AlertDescription className={config.text}>
        {message}
        {onDismiss && (
          <button onClick={onDismiss} className="ml-auto text-xs underline hover:no-underline">
            Dismiss
          </button>
        )}
      </AlertDescription>
    </Alert>
  );
}

// ============================================================================
// SECTION ERROR FALLBACKS
// ============================================================================

export function DashboardSectionError({
  sectionName,
  onRetry,
}: {
  sectionName: string;
  onRetry?: () => void;
}) {
  return (
    <Card className="border-red-200 bg-red-50/50">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm text-red-800">
          <BarChart3 className="h-4 w-4" />
          {sectionName} Unavailable
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="mb-3 text-xs text-red-700">
          This section could not be loaded due to a temporary error.
        </p>
        {onRetry && (
          <Button onClick={onRetry} variant="outline" size="sm" className="h-7 text-xs">
            <RefreshCw className="mr-1 h-3 w-3" />
            Retry
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

export function ChartError({
  chartName = 'Chart',
  onRetry,
}: {
  chartName?: string;
  onRetry?: () => void;
}) {
  return (
    <Card className="border-blue-200 bg-blue-50/50">
      <CardContent className="flex flex-col items-center justify-center py-8">
        <BarChart3 className="mb-2 h-8 w-8 text-blue-500" />
        <h3 className="text-sm font-medium text-blue-800">{chartName} unavailable</h3>
        <p className="mb-3 text-xs text-blue-600">Unable to render chart data</p>
        {onRetry && (
          <Button onClick={onRetry} variant="outline" size="sm" className="text-xs">
            <RefreshCw className="mr-1 h-3 w-3" />
            Retry
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

export function DataTableError({
  tableName = 'Data',
  onRetry,
}: {
  tableName?: string;
  onRetry?: () => void;
}) {
  return (
    <Card className="border-orange-200 bg-orange-50/50">
      <CardContent className="flex flex-col items-center justify-center py-8">
        <Database className="mb-2 h-8 w-8 text-orange-500" />
        <h3 className="text-sm font-medium text-orange-800">
          Unable to load {tableName.toLowerCase()}
        </h3>
        <p className="mb-3 text-xs text-orange-600">The table data could not be displayed</p>
        {onRetry && (
          <Button onClick={onRetry} variant="outline" size="sm" className="text-xs">
            <RefreshCw className="mr-1 h-3 w-3" />
            Reload
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================================================
// ERROR BOUNDARY FALLBACK COMPONENTS
// ============================================================================

export interface ErrorBoundaryFallbackProps {
  error: Error | null;
  errorInfo?: {
    componentStack?: string;
    digest?: string;
  };
  resetError: () => void;
  retryCount?: number;
  level?: 'global' | 'page' | 'section' | 'component';
  context?: string;
}

/**
 * Global Error Fallback
 * Full-page error state for critical application errors
 */
export function GlobalErrorBoundaryFallback({
  error,
  errorInfo,
  resetError,
  retryCount = 0,
}: ErrorBoundaryFallbackProps) {
  const errorId = React.useMemo(() => {
    return (
      errorInfo?.digest ||
      `err_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 9)}`
    );
  }, [errorInfo]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-red-50 via-white to-red-50 p-4">
      <Card className="w-full max-w-2xl border-red-300 shadow-2xl">
        <CardHeader className="space-y-6 border-b border-red-200 bg-red-50">
          <div className="flex items-start space-x-4">
            <div className="rounded-full bg-red-100 p-4">
              <AlertTriangle className="h-10 w-10 text-red-600" aria-hidden="true" />
            </div>
            <div className="flex-1">
              <CardTitle className="mb-2 text-3xl text-red-900">Application Error</CardTitle>
              <CardDescription className="text-base text-red-700">
                We encountered a critical error and could not complete your request
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6 p-6">
          <Alert variant="destructive" className="border-red-300 bg-red-50">
            <AlertTriangle className="h-5 w-5" />
            <AlertDescription>
              <p className="mb-2 font-semibold">What happened?</p>
              <p className="text-sm text-red-800">
                A critical system error occurred. This could be due to a server issue, network
                problem, or an unexpected condition. Our team has been automatically notified.
              </p>
            </AlertDescription>
          </Alert>

          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
            <p className="mb-2 text-xs font-semibold text-gray-700">Error Reference ID</p>
            <code className="font-mono text-sm break-all text-gray-900 select-all">{errorId}</code>
            <p className="mt-2 text-xs text-gray-600">
              Please include this ID when contacting support
            </p>
          </div>

          {retryCount > 0 && (
            <div className="flex items-center space-x-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
              <Clock className="h-4 w-4" />
              <span>Retry attempt {retryCount} of 3</span>
            </div>
          )}

          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <Button
              onClick={resetError}
              className="w-full bg-blue-600 hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              aria-label="Try to recover from error"
            >
              <RefreshCw className="mr-2 h-4 w-4" aria-hidden="true" />
              Try Again
            </Button>
            <Button
              onClick={() => window.history.back()}
              variant="outline"
              className="w-full focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
              aria-label="Go back to previous page"
            >
              <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" />
              Go Back
            </Button>
            <Button
              onClick={() => (window.location.href = '/')}
              variant="outline"
              className="w-full focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
              aria-label="Return to home page"
            >
              <Home className="mr-2 h-4 w-4" aria-hidden="true" />
              Home
            </Button>
          </div>

          <div className="space-y-3 border-t border-gray-200 pt-4">
            <p className="text-sm font-semibold text-gray-900">Need help?</p>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <a
                href="mailto:support@mantisnxt.com"
                className="flex items-center space-x-2 text-sm text-blue-600 hover:text-blue-700 focus:underline"
              >
                <Mail className="h-4 w-4" />
                <span>support@mantisnxt.com</span>
              </a>
              <a
                href="/status"
                className="flex items-center space-x-2 text-sm text-blue-600 hover:text-blue-700 focus:underline"
              >
                <Server className="h-4 w-4" />
                <span>System Status</span>
              </a>
            </div>
          </div>

          {process.env.NODE_ENV === 'development' && error && (
            <details className="mt-4 rounded-lg border border-gray-200 bg-gray-50">
              <summary className="cursor-pointer rounded-lg px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-100">
                Developer Information
              </summary>
              <div className="space-y-3 border-t border-gray-200 p-4">
                <div>
                  <p className="mb-1 text-xs font-semibold text-gray-600">Error Message:</p>
                  <pre className="overflow-x-auto rounded border border-gray-200 bg-white p-3 text-xs">
                    {error.message}
                  </pre>
                </div>
                {error.stack && (
                  <div>
                    <p className="mb-1 text-xs font-semibold text-gray-600">Stack Trace:</p>
                    <pre className="max-h-64 overflow-x-auto rounded border border-gray-200 bg-white p-3 text-xs">
                      {error.stack}
                    </pre>
                  </div>
                )}
                {errorInfo?.componentStack && (
                  <div>
                    <p className="mb-1 text-xs font-semibold text-gray-600">Component Stack:</p>
                    <pre className="max-h-48 overflow-x-auto rounded border border-gray-200 bg-white p-3 text-xs">
                      {errorInfo.componentStack}
                    </pre>
                  </div>
                )}
              </div>
            </details>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Page Error Fallback
 * Full-page error state for page-level errors
 */
export function PageErrorBoundaryFallback({
  error,
  errorInfo,
  resetError,
  retryCount = 0,
  context,
}: ErrorBoundaryFallbackProps) {
  const errorId = React.useMemo(() => {
    return (
      errorInfo?.digest ||
      `err_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 9)}`
    );
  }, [errorInfo]);

  const getErrorIcon = () => {
    if (error?.message.toLowerCase().includes('network'))
      return <Network className="h-8 w-8 text-red-600" />;
    if (error?.message.toLowerCase().includes('database'))
      return <Database className="h-8 w-8 text-red-600" />;
    if (error?.message.toLowerCase().includes('server'))
      return <Server className="h-8 w-8 text-red-600" />;
    return <AlertTriangle className="h-8 w-8 text-red-600" />;
  };

  return (
    <div className="flex min-h-[600px] items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-xl border-red-200 shadow-lg">
        <CardHeader className="space-y-4 text-center">
          <div className="flex justify-center">
            <div className="rounded-full bg-red-100 p-3">{getErrorIcon()}</div>
          </div>
          <div>
            <CardTitle className="text-2xl text-red-900">Page Load Error</CardTitle>
            <CardDescription className="mt-2 text-base">
              We could not load this page
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {context && (
            <Badge variant="outline" className="mx-auto block w-fit border-red-300 text-red-700">
              {context}
            </Badge>
          )}

          <Alert className="border-red-200 bg-red-50">
            <AlertDescription className="text-sm text-red-800">
              <p className="mb-2 font-semibold">What can you do?</p>
              <ul className="ml-2 list-inside list-disc space-y-1">
                <li>Refresh the page to try again</li>
                <li>Check your internet connection</li>
                <li>Go back and try a different action</li>
                <li>Contact support if this persists</li>
              </ul>
            </AlertDescription>
          </Alert>

          <div className="rounded-lg border border-gray-200 bg-gray-100 p-3 text-center">
            <p className="mb-1 text-xs text-gray-600">Error ID</p>
            <code className="font-mono text-xs text-gray-800 select-all">{errorId}</code>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button
              onClick={resetError}
              className="flex-1 bg-blue-600 hover:bg-blue-700"
              aria-label="Retry loading page"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Retry
            </Button>
            <Button
              onClick={() => window.history.back()}
              variant="outline"
              className="flex-1"
              aria-label="Navigate back"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Go Back
            </Button>
            <Button
              onClick={() => (window.location.href = '/')}
              variant="outline"
              className="flex-1"
              aria-label="Go to homepage"
            >
              <Home className="mr-2 h-4 w-4" />
              Home
            </Button>
          </div>

          {retryCount > 0 && (
            <p className="text-center text-xs text-gray-600">Retry attempt {retryCount} of 3</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Section Error Fallback
 * Inline error state for section-level errors
 */
export function SectionErrorBoundaryFallback({
  error,
  resetError,
  context,
}: ErrorBoundaryFallbackProps) {
  const isNetworkError =
    error?.message.toLowerCase().includes('network') ||
    error?.message.toLowerCase().includes('fetch');

  return (
    <Card className="flex min-h-[200px] items-center justify-center border-red-200 bg-red-50/50">
      <CardContent className="space-y-4 py-8 text-center">
        <div className="flex justify-center">
          <div className="rounded-full bg-red-100 p-2">
            <AlertTriangle className="h-6 w-6 text-red-600" />
          </div>
        </div>

        <div className="space-y-2">
          <h3 className="text-lg font-semibold text-red-900">{context || 'Section Error'}</h3>
          <p className="mx-auto max-w-md text-sm text-red-700">
            {isNetworkError
              ? 'Unable to load this section due to connection issues. Please check your network and try again.'
              : 'This section encountered an error. You can continue using other parts of the application.'}
          </p>
        </div>

        <div className="flex flex-col justify-center gap-2 sm:flex-row">
          <Button
            onClick={resetError}
            size="sm"
            variant="outline"
            className="border-red-300 text-red-700 hover:bg-red-100"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Retry
          </Button>
          <Button
            onClick={() => window.location.reload()}
            size="sm"
            variant="outline"
            className="border-red-300 text-red-700 hover:bg-red-100"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Reload Page
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Component Error Fallback
 * Minimal inline error state for component-level errors
 */
export function ComponentErrorBoundaryFallback({
  error,
  resetError,
  context,
}: ErrorBoundaryFallbackProps) {
  return (
    <div className="flex min-h-[100px] items-center justify-center rounded-lg border border-red-200 bg-red-50 p-4">
      <div className="space-y-3 text-center">
        <div className="flex items-center justify-center space-x-2">
          <Bug className="h-5 w-5 text-red-600" />
          <span className="text-sm font-semibold text-red-900">{context || 'Component Error'}</span>
        </div>

        <p className="max-w-xs text-xs text-red-700">
          This component encountered an issue. Other features should still work.
        </p>

        <Button
          onClick={resetError}
          size="sm"
          variant="outline"
          className="border-red-300 text-xs text-red-700 hover:bg-red-100"
        >
          <RefreshCw className="mr-1 h-3 w-3" />
          Retry
        </Button>
      </div>
    </div>
  );
}

/**
 * Data Loading Error Fallback
 * Specialized fallback for data fetching errors
 */
export function DataLoadingErrorFallback({
  error,
  onRetry,
  retryable = true,
  context,
}: ErrorBoundaryFallbackProps & {
  onRetry?: () => void;
  retryable?: boolean;
}) {
  const isNetworkError =
    error?.message.toLowerCase().includes('network') ||
    error?.message.toLowerCase().includes('fetch') ||
    error?.message.toLowerCase().includes('timeout');

  const isDatabaseError =
    error?.message.toLowerCase().includes('database') ||
    error?.message.toLowerCase().includes('query');

  const getErrorMessage = () => {
    if (isNetworkError)
      return 'Unable to connect to the server. Please check your internet connection.';
    if (isDatabaseError) return 'Database error. Our team has been notified.';
    return 'Failed to load data. Please try again.';
  };

  return (
    <Card className="border-amber-200 bg-amber-50/50">
      <CardContent className="flex flex-col items-center justify-center space-y-4 py-8 text-center">
        <div className="rounded-full bg-amber-100 p-3">
          {isNetworkError && <Network className="h-6 w-6 text-amber-600" />}
          {isDatabaseError && <Database className="h-6 w-6 text-amber-600" />}
          {!isNetworkError && !isDatabaseError && (
            <AlertTriangle className="h-6 w-6 text-amber-600" />
          )}
        </div>

        <div className="space-y-2">
          <h3 className="text-base font-semibold text-amber-900">{context || 'Data Load Error'}</h3>
          <p className="max-w-md text-sm text-amber-700">{getErrorMessage()}</p>
        </div>

        {retryable && onRetry && (
          <Button
            onClick={onRetry}
            size="sm"
            className="bg-amber-600 text-white hover:bg-amber-700"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Retry Loading
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

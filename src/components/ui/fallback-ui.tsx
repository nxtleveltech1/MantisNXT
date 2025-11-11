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
  Bug
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
      <CardContent className="flex flex-col items-center justify-center py-12 px-6">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
          {icon || <Search className="w-8 h-8 text-gray-400" />}
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
        <p className="text-sm text-gray-600 text-center mb-4 max-w-md">{description}</p>
        {action && (
          <Button onClick={action.onClick} variant="outline" size="sm">
            {action.label}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

export function NoDataFound({ resourceName = 'items', onReset }: { resourceName?: string; onReset?: () => void }) {
  return (
    <EmptyState
      icon={<Search className="w-8 h-8 text-gray-400" />}
      title="No results found"
      description={`We couldn't find any ${resourceName} matching your criteria. Try adjusting your filters or search terms.`}
      action={onReset ? {
        label: 'Clear Filters',
        onClick: onReset
      } : undefined}
    />
  );
}

export function NoInventoryItems({ onCreate }: { onCreate?: () => void }) {
  return (
    <EmptyState
      icon={<Package className="w-8 h-8 text-gray-400" />}
      title="No inventory items"
      description="You haven't added any inventory items yet. Start by adding your first product to begin tracking stock."
      action={onCreate ? {
        label: 'Add First Item',
        onClick: onCreate
      } : undefined}
    />
  );
}

export function NoSuppliers({ onCreate }: { onCreate?: () => void }) {
  return (
    <EmptyState
      icon={<Users className="w-8 h-8 text-gray-400" />}
      title="No suppliers found"
      description="You don't have any suppliers in your system yet. Add suppliers to start managing your procurement."
      action={onCreate ? {
        label: 'Add Supplier',
        onClick: onCreate
      } : undefined}
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
  className = ''
}: ErrorStateProps) {
  const severityColors = {
    low: 'border-yellow-200 bg-yellow-50',
    medium: 'border-orange-200 bg-orange-50',
    high: 'border-red-200 bg-red-50',
    critical: 'border-red-300 bg-red-100'
  };

  const iconColors = {
    low: 'text-yellow-600',
    medium: 'text-orange-600',
    high: 'text-red-600',
    critical: 'text-red-700'
  };

  return (
    <Card className={`${severityColors[severity]} ${className}`}>
      <CardContent className="flex flex-col items-center justify-center py-8 px-6">
        <div className={`w-12 h-12 ${severityColors[severity]} rounded-full flex items-center justify-center mb-3`}>
          <AlertTriangle className={`w-6 h-6 ${iconColors[severity]}`} />
        </div>
        <h3 className="text-base font-semibold text-gray-900 mb-1">{title}</h3>
        <p className="text-sm text-gray-700 text-center mb-4 max-w-md">{description}</p>
        {action && (
          <Button onClick={action.onClick} variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            {action.label}
          </Button>
        )}
        {showErrorId && errorId && (
          <p className="text-xs text-gray-500 mt-3 font-mono">Error ID: {errorId}</p>
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
      action={onRetry ? {
        label: 'Try Again',
        onClick: onRetry
      } : undefined}
      severity="high"
    />
  );
}

export function QueryTimeoutError({ onRetry }: { onRetry?: () => void }) {
  return (
    <ErrorState
      title="Request timed out"
      description="The request took too long to complete. Try using filters to narrow down the results."
      action={onRetry ? {
        label: 'Retry',
        onClick: onRetry
      } : undefined}
      severity="medium"
    />
  );
}

export function NetworkError({ onRetry }: { onRetry?: () => void }) {
  return (
    <Card className="border-orange-200 bg-orange-50">
      <CardContent className="flex flex-col items-center justify-center py-8 px-6">
        <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mb-3">
          <Wifi className="w-6 h-6 text-orange-600" />
        </div>
        <h3 className="text-base font-semibold text-gray-900 mb-1">Connection lost</h3>
        <p className="text-sm text-gray-700 text-center mb-4 max-w-md">
          Unable to connect to the server. Please check your internet connection and try again.
        </p>
        {onRetry && (
          <Button onClick={onRetry} variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />
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
        <div className="relative w-12 h-12 mb-4">
          <div className="absolute inset-0 border-4 border-gray-200 rounded-full"></div>
          <div className="absolute inset-0 border-4 border-blue-600 rounded-full border-t-transparent animate-spin"></div>
        </div>
        <p className="text-sm text-gray-600">{message}</p>
      </CardContent>
    </Card>
  );
}

export function LoadingSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-8 bg-gray-200 rounded w-1/4"></div>
      <div className="h-4 bg-gray-200 rounded w-full"></div>
      <div className="h-4 bg-gray-200 rounded w-5/6"></div>
      <div className="h-4 bg-gray-200 rounded w-4/6"></div>
    </div>
  );
}

export function TableLoadingSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4 animate-pulse">
          <div className="h-12 bg-gray-200 rounded flex-1"></div>
          <div className="h-12 bg-gray-200 rounded flex-1"></div>
          <div className="h-12 bg-gray-200 rounded flex-1"></div>
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
      icon: InfoIcon
    },
    warning: {
      bg: 'bg-yellow-50',
      border: 'border-yellow-200',
      text: 'text-yellow-800',
      icon: AlertTriangle
    },
    error: {
      bg: 'bg-red-50',
      border: 'border-red-200',
      text: 'text-red-800',
      icon: XCircle
    }
  };

  const config = severityConfig[severity];
  const Icon = config.icon;

  return (
    <Alert className={`${config.bg} ${config.border}`}>
      <Icon className="h-4 w-4" />
      <AlertDescription className={config.text}>
        {message}
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="ml-auto text-xs underline hover:no-underline"
          >
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

export function DashboardSectionError({ sectionName, onRetry }: { sectionName: string; onRetry?: () => void }) {
  return (
    <Card className="border-red-200 bg-red-50/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm text-red-800 flex items-center gap-2">
          <BarChart3 className="w-4 h-4" />
          {sectionName} Unavailable
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-xs text-red-700 mb-3">
          This section could not be loaded due to a temporary error.
        </p>
        {onRetry && (
          <Button onClick={onRetry} variant="outline" size="sm" className="text-xs h-7">
            <RefreshCw className="w-3 h-3 mr-1" />
            Retry
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

export function ChartError({ chartName = 'Chart', onRetry }: { chartName?: string; onRetry?: () => void }) {
  return (
    <Card className="border-blue-200 bg-blue-50/50">
      <CardContent className="flex flex-col items-center justify-center py-8">
        <BarChart3 className="h-8 w-8 text-blue-500 mb-2" />
        <h3 className="font-medium text-blue-800 text-sm">{chartName} unavailable</h3>
        <p className="text-xs text-blue-600 mb-3">Unable to render chart data</p>
        {onRetry && (
          <Button onClick={onRetry} variant="outline" size="sm" className="text-xs">
            <RefreshCw className="w-3 h-3 mr-1" />
            Retry
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

export function DataTableError({ tableName = 'Data', onRetry }: { tableName?: string; onRetry?: () => void }) {
  return (
    <Card className="border-orange-200 bg-orange-50/50">
      <CardContent className="flex flex-col items-center justify-center py-8">
        <Database className="h-8 w-8 text-orange-500 mb-2" />
        <h3 className="font-medium text-orange-800 text-sm">Unable to load {tableName.toLowerCase()}</h3>
        <p className="text-xs text-orange-600 mb-3">The table data could not be displayed</p>
        {onRetry && (
          <Button onClick={onRetry} variant="outline" size="sm" className="text-xs">
            <RefreshCw className="w-3 h-3 mr-1" />
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
    return errorInfo?.digest || `err_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 9)}`;
  }, [errorInfo]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-red-50 flex items-center justify-center p-4">
      <Card className="max-w-2xl w-full border-red-300 shadow-2xl">
        <CardHeader className="space-y-6 bg-red-50 border-b border-red-200">
          <div className="flex items-start space-x-4">
            <div className="p-4 bg-red-100 rounded-full">
              <AlertTriangle className="w-10 h-10 text-red-600" aria-hidden="true" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-3xl text-red-900 mb-2">
                Application Error
              </CardTitle>
              <CardDescription className="text-base text-red-700">
                We encountered a critical error and could not complete your request
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6 p-6">
          <Alert variant="destructive" className="bg-red-50 border-red-300">
            <AlertTriangle className="h-5 w-5" />
            <AlertDescription>
              <p className="font-semibold mb-2">What happened?</p>
              <p className="text-sm text-red-800">
                A critical system error occurred. This could be due to a server issue, network problem,
                or an unexpected condition. Our team has been automatically notified.
              </p>
            </AlertDescription>
          </Alert>

          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
            <p className="text-xs font-semibold text-gray-700 mb-2">Error Reference ID</p>
            <code className="text-sm font-mono text-gray-900 break-all select-all">
              {errorId}
            </code>
            <p className="text-xs text-gray-600 mt-2">
              Please include this ID when contacting support
            </p>
          </div>

          {retryCount > 0 && (
            <div className="flex items-center space-x-2 text-sm text-amber-700 bg-amber-50 p-3 rounded-lg border border-amber-200">
              <Clock className="w-4 h-4" />
              <span>Retry attempt {retryCount} of 3</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Button
              onClick={resetError}
              className="w-full bg-blue-600 hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              aria-label="Try to recover from error"
            >
              <RefreshCw className="w-4 h-4 mr-2" aria-hidden="true" />
              Try Again
            </Button>
            <Button
              onClick={() => window.history.back()}
              variant="outline"
              className="w-full focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
              aria-label="Go back to previous page"
            >
              <ArrowLeft className="w-4 h-4 mr-2" aria-hidden="true" />
              Go Back
            </Button>
            <Button
              onClick={() => window.location.href = '/'}
              variant="outline"
              className="w-full focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
              aria-label="Return to home page"
            >
              <Home className="w-4 h-4 mr-2" aria-hidden="true" />
              Home
            </Button>
          </div>

          <div className="border-t border-gray-200 pt-4 space-y-3">
            <p className="text-sm font-semibold text-gray-900">Need help?</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <a
                href="mailto:support@mantisnxt.com"
                className="flex items-center space-x-2 text-sm text-blue-600 hover:text-blue-700 focus:underline"
              >
                <Mail className="w-4 h-4" />
                <span>support@mantisnxt.com</span>
              </a>
              <a
                href="/status"
                className="flex items-center space-x-2 text-sm text-blue-600 hover:text-blue-700 focus:underline"
              >
                <Server className="w-4 h-4" />
                <span>System Status</span>
              </a>
            </div>
          </div>

          {process.env.NODE_ENV === 'development' && error && (
            <details className="mt-4 border border-gray-200 rounded-lg bg-gray-50">
              <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg">
                Developer Information
              </summary>
              <div className="p-4 space-y-3 border-t border-gray-200">
                <div>
                  <p className="text-xs font-semibold text-gray-600 mb-1">Error Message:</p>
                  <pre className="text-xs bg-white p-3 rounded border border-gray-200 overflow-x-auto">
                    {error.message}
                  </pre>
                </div>
                {error.stack && (
                  <div>
                    <p className="text-xs font-semibold text-gray-600 mb-1">Stack Trace:</p>
                    <pre className="text-xs bg-white p-3 rounded border border-gray-200 overflow-x-auto max-h-64">
                      {error.stack}
                    </pre>
                  </div>
                )}
                {errorInfo?.componentStack && (
                  <div>
                    <p className="text-xs font-semibold text-gray-600 mb-1">Component Stack:</p>
                    <pre className="text-xs bg-white p-3 rounded border border-gray-200 overflow-x-auto max-h-48">
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
    return errorInfo?.digest || `err_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 9)}`;
  }, [errorInfo]);

  const getErrorIcon = () => {
    if (error?.message.toLowerCase().includes('network')) return <Network className="w-8 h-8 text-red-600" />;
    if (error?.message.toLowerCase().includes('database')) return <Database className="w-8 h-8 text-red-600" />;
    if (error?.message.toLowerCase().includes('server')) return <Server className="w-8 h-8 text-red-600" />;
    return <AlertTriangle className="w-8 h-8 text-red-600" />;
  };

  return (
    <div className="min-h-[600px] flex items-center justify-center p-4 bg-gray-50">
      <Card className="max-w-xl w-full border-red-200 shadow-lg">
        <CardHeader className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="p-3 bg-red-100 rounded-full">
              {getErrorIcon()}
            </div>
          </div>
          <div>
            <CardTitle className="text-2xl text-red-900">
              Page Load Error
            </CardTitle>
            <CardDescription className="text-base mt-2">
              We could not load this page
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {context && (
            <Badge variant="outline" className="text-red-700 border-red-300 mx-auto block w-fit">
              {context}
            </Badge>
          )}

          <Alert className="bg-red-50 border-red-200">
            <AlertDescription className="text-sm text-red-800">
              <p className="font-semibold mb-2">What can you do?</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Refresh the page to try again</li>
                <li>Check your internet connection</li>
                <li>Go back and try a different action</li>
                <li>Contact support if this persists</li>
              </ul>
            </AlertDescription>
          </Alert>

          <div className="bg-gray-100 p-3 rounded-lg border border-gray-200 text-center">
            <p className="text-xs text-gray-600 mb-1">Error ID</p>
            <code className="text-xs font-mono text-gray-800 select-all">
              {errorId}
            </code>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              onClick={resetError}
              className="flex-1 bg-blue-600 hover:bg-blue-700"
              aria-label="Retry loading page"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Retry
            </Button>
            <Button
              onClick={() => window.history.back()}
              variant="outline"
              className="flex-1"
              aria-label="Navigate back"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Go Back
            </Button>
            <Button
              onClick={() => window.location.href = '/'}
              variant="outline"
              className="flex-1"
              aria-label="Go to homepage"
            >
              <Home className="w-4 h-4 mr-2" />
              Home
            </Button>
          </div>

          {retryCount > 0 && (
            <p className="text-xs text-center text-gray-600">
              Retry attempt {retryCount} of 3
            </p>
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
  const isNetworkError = error?.message.toLowerCase().includes('network') ||
                        error?.message.toLowerCase().includes('fetch');

  return (
    <Card className="border-red-200 bg-red-50/50 min-h-[200px] flex items-center justify-center">
      <CardContent className="text-center space-y-4 py-8">
        <div className="flex justify-center">
          <div className="p-2 bg-red-100 rounded-full">
            <AlertTriangle className="w-6 h-6 text-red-600" />
          </div>
        </div>

        <div className="space-y-2">
          <h3 className="text-lg font-semibold text-red-900">
            {context || 'Section Error'}
          </h3>
          <p className="text-sm text-red-700 max-w-md mx-auto">
            {isNetworkError
              ? "Unable to load this section due to connection issues. Please check your network and try again."
              : "This section encountered an error. You can continue using other parts of the application."
            }
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 justify-center">
          <Button
            onClick={resetError}
            size="sm"
            variant="outline"
            className="border-red-300 text-red-700 hover:bg-red-100"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Retry
          </Button>
          <Button
            onClick={() => window.location.reload()}
            size="sm"
            variant="outline"
            className="border-red-300 text-red-700 hover:bg-red-100"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
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
    <div className="border border-red-200 bg-red-50 rounded-lg p-4 min-h-[100px] flex items-center justify-center">
      <div className="text-center space-y-3">
        <div className="flex items-center justify-center space-x-2">
          <Bug className="w-5 h-5 text-red-600" />
          <span className="text-sm font-semibold text-red-900">
            {context || 'Component Error'}
          </span>
        </div>

        <p className="text-xs text-red-700 max-w-xs">
          This component encountered an issue. Other features should still work.
        </p>

        <Button
          onClick={resetError}
          size="sm"
          variant="outline"
          className="border-red-300 text-red-700 hover:bg-red-100 text-xs"
        >
          <RefreshCw className="w-3 h-3 mr-1" />
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
  const isNetworkError = error?.message.toLowerCase().includes('network') ||
                        error?.message.toLowerCase().includes('fetch') ||
                        error?.message.toLowerCase().includes('timeout');

  const isDatabaseError = error?.message.toLowerCase().includes('database') ||
                         error?.message.toLowerCase().includes('query');

  const getErrorMessage = () => {
    if (isNetworkError) return "Unable to connect to the server. Please check your internet connection.";
    if (isDatabaseError) return "Database error. Our team has been notified.";
    return "Failed to load data. Please try again.";
  };

  return (
    <Card className="border-amber-200 bg-amber-50/50">
      <CardContent className="flex flex-col items-center justify-center text-center space-y-4 py-8">
        <div className="p-3 bg-amber-100 rounded-full">
          {isNetworkError && <Network className="w-6 h-6 text-amber-600" />}
          {isDatabaseError && <Database className="w-6 h-6 text-amber-600" />}
          {!isNetworkError && !isDatabaseError && <AlertTriangle className="w-6 h-6 text-amber-600" />}
        </div>

        <div className="space-y-2">
          <h3 className="text-base font-semibold text-amber-900">
            {context || 'Data Load Error'}
          </h3>
          <p className="text-sm text-amber-700 max-w-md">
            {getErrorMessage()}
          </p>
        </div>

        {retryable && onRetry && (
          <Button
            onClick={onRetry}
            size="sm"
            className="bg-amber-600 hover:bg-amber-700 text-white"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Retry Loading
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

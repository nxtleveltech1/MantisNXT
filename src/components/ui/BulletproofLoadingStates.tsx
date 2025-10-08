/**
 * BULLETPROOF LOADING STATES
 * Comprehensive loading state components with accessibility and performance
 * WCAG AAA compliant with proper ARIA attributes
 */

'use client'

import React from 'react'
import { Loader2, RefreshCw, AlertTriangle, Inbox } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'

// Loading Spinner Component
export const LoadingSpinner: React.FC<{
  size?: 'sm' | 'md' | 'lg'
  className?: string
  label?: string
}> = ({ size = 'md', className = '', label = 'Loading' }) => {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12'
  }

  return (
    <div
      className={`flex items-center justify-center ${className}`}
      role="status"
      aria-live="polite"
      aria-label={label}
    >
      <Loader2
        className={`${sizeClasses[size]} animate-spin text-primary`}
        aria-hidden="true"
      />
      <span className="sr-only">{label}</span>
    </div>
  )
}

// Skeleton Card for Metric Cards
export const MetricCardSkeleton: React.FC<{ count?: number }> = ({ count = 4 }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {[...Array(count)].map((_, i) => (
        <Card key={i} className="animate-pulse">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-2 flex-1">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-8 w-16" />
                <Skeleton className="h-3 w-24" />
              </div>
              <Skeleton className="h-10 w-10 rounded-full" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

// Skeleton for Activity Feed
export const ActivityFeedSkeleton: React.FC<{ count?: number }> = ({ count = 5 }) => {
  return (
    <div className="space-y-4" role="status" aria-label="Loading activities">
      {[...Array(count)].map((_, i) => (
        <div key={i} className="animate-pulse flex items-start gap-3 p-3 rounded-lg border">
          <Skeleton className="h-8 w-8 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
          <span className="sr-only">Loading activity {i + 1}</span>
        </div>
      ))}
    </div>
  )
}

// Skeleton for Alert Panel
export const AlertPanelSkeleton: React.FC<{ count?: number }> = ({ count = 3 }) => {
  return (
    <div className="space-y-3" role="status" aria-label="Loading alerts">
      {[...Array(count)].map((_, i) => (
        <div key={i} className="animate-pulse p-3 border rounded-lg">
          <div className="flex items-start gap-3">
            <Skeleton className="h-4 w-4 rounded" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
          <span className="sr-only">Loading alert {i + 1}</span>
        </div>
      ))}
    </div>
  )
}

// Skeleton for Data Table
export const TableSkeleton: React.FC<{
  rows?: number
  columns?: number
}> = ({ rows = 10, columns = 5 }) => {
  return (
    <div className="w-full" role="status" aria-label="Loading table data">
      <div className="border rounded-lg overflow-hidden">
        {/* Header */}
        <div className="bg-muted p-4 border-b">
          <div className="flex gap-4">
            {[...Array(columns)].map((_, i) => (
              <Skeleton key={`header-${i}`} className="h-4 flex-1" />
            ))}
          </div>
        </div>

        {/* Rows */}
        <div className="divide-y">
          {[...Array(rows)].map((_, rowIndex) => (
            <div key={`row-${rowIndex}`} className="p-4 animate-pulse">
              <div className="flex gap-4">
                {[...Array(columns)].map((_, colIndex) => (
                  <Skeleton
                    key={`cell-${rowIndex}-${colIndex}`}
                    className="h-4 flex-1"
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
      <span className="sr-only">Loading {rows} rows of data</span>
    </div>
  )
}

// Empty State Component
export const EmptyState: React.FC<{
  icon?: React.ReactNode
  title: string
  description?: string
  action?: {
    label: string
    onClick: () => void
  }
}> = ({ icon, title, description, action }) => {
  return (
    <div
      className="flex flex-col items-center justify-center py-12 px-4 text-center"
      role="status"
      aria-live="polite"
    >
      <div className="mb-4 text-muted-foreground">
        {icon || <Inbox className="h-12 w-12" aria-hidden="true" />}
      </div>
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      {description && (
        <p className="text-sm text-muted-foreground mb-4 max-w-md">{description}</p>
      )}
      {action && (
        <Button onClick={action.onClick} variant="outline">
          {action.label}
        </Button>
      )}
    </div>
  )
}

// Error State Component
export const ErrorState: React.FC<{
  title?: string
  message: string
  onRetry?: () => void
  showDetails?: boolean
  error?: Error
}> = ({
  title = 'Error Loading Data',
  message,
  onRetry,
  showDetails = false,
  error
}) => {
  return (
    <div
      className="flex flex-col items-center justify-center py-8 px-4 text-center"
      role="alert"
      aria-live="assertive"
    >
      <div className="mb-4">
        <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-full inline-block">
          <AlertTriangle
            className="h-8 w-8 text-red-600 dark:text-red-400"
            aria-hidden="true"
          />
        </div>
      </div>

      <h3 className="text-lg font-semibold text-red-900 dark:text-red-100 mb-2">
        {title}
      </h3>

      <p className="text-sm text-red-700 dark:text-red-300 mb-4 max-w-md">
        {message}
      </p>

      {showDetails && error && (
        <details className="mb-4 text-left w-full max-w-md">
          <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground">
            Show error details
          </summary>
          <pre className="mt-2 text-xs bg-muted p-3 rounded-lg overflow-auto max-h-40">
            {error.message}
            {error.stack && `\n\n${error.stack}`}
          </pre>
        </details>
      )}

      {onRetry && (
        <Button onClick={onRetry} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" aria-hidden="true" />
          Try Again
        </Button>
      )}
    </div>
  )
}

// Progressive Loading Component
export const ProgressiveLoader: React.FC<{
  progress: number
  label?: string
  showPercentage?: boolean
}> = ({ progress, label = 'Loading', showPercentage = true }) => {
  return (
    <div
      className="w-full max-w-md mx-auto space-y-3 py-8"
      role="progressbar"
      aria-valuenow={progress}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
    >
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">{label}</span>
        {showPercentage && (
          <span className="text-muted-foreground">{Math.round(progress)}%</span>
        )}
      </div>
      <Progress value={progress} className="h-2" />
    </div>
  )
}

// Full Page Loader
export const FullPageLoader: React.FC<{
  message?: string
}> = ({ message = 'Loading application...' }) => {
  return (
    <div
      className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50"
      role="status"
      aria-live="polite"
      aria-label={message}
    >
      <Card className="w-full max-w-sm">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center space-y-4">
            <Loader2 className="h-12 w-12 animate-spin text-primary" aria-hidden="true" />
            <p className="text-sm text-muted-foreground text-center">{message}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// Conditional Loading Wrapper
export const ConditionalLoader: React.FC<{
  loading: boolean
  error?: Error | null
  data?: any
  onRetry?: () => void
  loadingComponent?: React.ReactNode
  errorComponent?: React.ReactNode
  emptyComponent?: React.ReactNode
  children: React.ReactNode
  showErrorDetails?: boolean
}> = ({
  loading,
  error,
  data,
  onRetry,
  loadingComponent,
  errorComponent,
  emptyComponent,
  children,
  showErrorDetails = process.env.NODE_ENV === 'development'
}) => {
  // Loading state
  if (loading) {
    return loadingComponent || <LoadingSpinner label="Loading data" />
  }

  // Error state
  if (error) {
    return (
      errorComponent || (
        <ErrorState
          message={error.message || 'An error occurred while loading data'}
          onRetry={onRetry}
          showDetails={showErrorDetails}
          error={error}
        />
      )
    )
  }

  // Empty state
  if (!data || (Array.isArray(data) && data.length === 0)) {
    return (
      emptyComponent || (
        <EmptyState
          title="No Data Available"
          description="There is currently no data to display"
        />
      )
    )
  }

  // Success state - render children
  return <>{children}</>
}

// Export all components
export default {
  LoadingSpinner,
  MetricCardSkeleton,
  ActivityFeedSkeleton,
  AlertPanelSkeleton,
  TableSkeleton,
  EmptyState,
  ErrorState,
  ProgressiveLoader,
  FullPageLoader,
  ConditionalLoader
}

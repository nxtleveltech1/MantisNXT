"use client"

import React, { ReactNode } from 'react'
import { AlertTriangle, RefreshCw, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
  errorInfo: any
}

interface BuildSafeErrorBoundaryProps {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: any) => void
  showDetails?: boolean
  level?: 'page' | 'component' | 'feature'
}

/**
 * Build-Safe Error Boundary that prevents component failures from crashing the entire system
 * Provides graceful degradation with appropriate fallbacks for different levels
 */
export class BuildSafeErrorBoundary extends React.Component<
  BuildSafeErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: BuildSafeErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null, errorInfo: null }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error, errorInfo: null }
  }

  componentDidCatch(error: Error, errorInfo: any) {
    this.setState({ errorInfo })

    // Report error to monitoring system
    console.error('[BuildSafeErrorBoundary] Component error caught:', error)
    console.error('[BuildSafeErrorBoundary] Error details:', errorInfo)

    this.props.onError?.(error, errorInfo)
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null })
  }

  private handleReload = () => {
    window.location.reload()
  }

  private renderPageLevelError() {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="border-red-200 bg-red-50 max-w-lg mx-auto shadow-lg">
          <CardContent className="p-8 text-center">
            <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-6">
              <AlertTriangle className="h-8 w-8 text-red-600" />
            </div>
            <h1 className="text-2xl font-bold text-red-900 mb-3">
              System Temporarily Unavailable
            </h1>
            <p className="text-red-700 mb-6">
              We're experiencing a technical issue. The system is running in safe mode.
            </p>
            <div className="space-y-3">
              <Button
                onClick={this.handleReset}
                className="w-full bg-red-600 hover:bg-red-700"
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Try Again
              </Button>
              <Button
                variant="outline"
                onClick={this.handleReload}
                className="w-full border-red-300 text-red-700 hover:bg-red-50"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Reload Application
              </Button>
            </div>
            {this.props.showDetails && this.state.error && (
              <details className="mt-6 text-left">
                <summary className="text-sm text-red-600 cursor-pointer mb-2">
                  Technical Details
                </summary>
                <pre className="text-xs text-red-700 bg-red-100 p-3 rounded overflow-auto">
                  {this.state.error.toString()}
                </pre>
              </details>
            )}
          </CardContent>
        </Card>
      </div>
    )
  }

  private renderComponentLevelError() {
    return (
      <div className="min-h-64 flex items-center justify-center">
        <Card className="border-amber-200 bg-amber-50 max-w-md mx-auto">
          <CardContent className="p-6 text-center">
            <div className="mx-auto w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mb-4">
              <AlertTriangle className="h-6 w-6 text-amber-600" />
            </div>
            <h3 className="text-lg font-semibold text-amber-900 mb-2">
              Component Temporarily Unavailable
            </h3>
            <p className="text-amber-700 mb-4 text-sm">
              This feature is running in safe mode due to a technical issue.
            </p>
            <Button
              onClick={this.handleReset}
              variant="outline"
              size="sm"
              className="border-amber-300 text-amber-700 hover:bg-amber-100"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  private renderFeatureLevelError() {
    return (
      <div className="p-4 bg-gray-100 rounded-lg border-2 border-dashed border-gray-300">
        <div className="flex items-center gap-3 text-gray-600">
          <AlertTriangle className="h-5 w-5" />
          <div className="flex-1">
            <p className="font-medium">Feature temporarily disabled</p>
            <p className="text-sm text-gray-500">
              System is running in safe mode
            </p>
          </div>
          <Button
            onClick={this.handleReset}
            variant="ghost"
            size="sm"
            className="text-gray-600 hover:text-gray-800"
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
        </div>
      </div>
    )
  }

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback
      }

      // Render appropriate error UI based on level
      switch (this.props.level) {
        case 'page':
          return this.renderPageLevelError()
        case 'component':
          return this.renderComponentLevelError()
        case 'feature':
        default:
          return this.renderFeatureLevelError()
      }
    }

    return this.props.children
  }
}

/**
 * Higher-order component for wrapping components with build-safe error boundaries
 */
export function withBuildSafeErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  options: {
    level?: 'page' | 'component' | 'feature'
    fallback?: ReactNode
    onError?: (error: Error, errorInfo: any) => void
  } = {}
) {
  return function SafeComponent(props: P) {
    return (
      <BuildSafeErrorBoundary
        level={options.level || 'component'}
        fallback={options.fallback}
        onError={options.onError}
      >
        <Component {...props} />
      </BuildSafeErrorBoundary>
    )
  }
}

/**
 * Suspense wrapper with error boundary for lazy-loaded components
 */
export function SafeLazyWrapper({
  children,
  fallback,
  level = 'component'
}: {
  children: ReactNode
  fallback?: ReactNode
  level?: 'page' | 'component' | 'feature'
}) {
  const defaultFallback = (
    <div className="flex items-center justify-center min-h-32">
      <div className="flex items-center gap-3 text-gray-600">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600"></div>
        <span>Loading...</span>
      </div>
    </div>
  )

  return (
    <BuildSafeErrorBoundary level={level}>
      <React.Suspense fallback={fallback || defaultFallback}>
        {children}
      </React.Suspense>
    </BuildSafeErrorBoundary>
  )
}
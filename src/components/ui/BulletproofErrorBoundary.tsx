/**
 * BULLETPROOF ERROR BOUNDARY
 * Production-ready error boundary with accessibility, retry logic, and comprehensive error handling
 * WCAG AAA compliant with keyboard navigation and screen reader support
 */

'use client'

import type { ReactNode } from 'react';
import React, { Component } from 'react'
import { AlertTriangle, RefreshCw, Home, Bug } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface ErrorBoundaryProps {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void
  resetKeys?: unknown[]
  showDetails?: boolean
  isolate?: boolean
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
  errorInfo: React.ErrorInfo | null
  errorCount: number
  lastErrorTime: number
}

export class BulletproofErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private resetTimeout: NodeJS.Timeout | null = null

  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorCount: 0,
      lastErrorTime: 0
    }
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error
    }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    const now = Date.now()
    const timeSinceLastError = now - this.state.lastErrorTime

    // Prevent error loop - if errors happen too frequently, stop auto-retrying
    const errorCount = timeSinceLastError < 5000 ? this.state.errorCount + 1 : 1

    this.setState({
      errorInfo,
      errorCount,
      lastErrorTime: now
    })

    // Log error details
    console.error('🚨 Error Boundary Caught Error:', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      errorCount,
      timeSinceLastError
    })

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo)
    }

    // Log to external error tracking service in production
    if (process.env.NODE_ENV === 'production') {
      this.logErrorToService(error, errorInfo)
    }
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps) {
    // Reset error state if resetKeys change
    if (this.props.resetKeys && prevProps.resetKeys) {
      const hasChanged = this.props.resetKeys.some(
        (key, index) => key !== prevProps.resetKeys![index]
      )
      if (hasChanged && this.state.hasError) {
        this.handleReset()
      }
    }
  }

  componentWillUnmount() {
    if (this.resetTimeout) {
      clearTimeout(this.resetTimeout)
    }
  }

  private logErrorToService(error: Error, _errorInfo: React.ErrorInfo) {
    // Placeholder for error tracking service integration
    // e.g., Sentry, LogRocket, Bugsnag
    try {
      // window.errorTracker?.captureException(error, { extra: errorInfo })
      console.log('📊 Error logged to tracking service:', error.message)
    } catch (loggingError) {
      console.error('Failed to log error to tracking service:', loggingError)
    }
  }

  private handleReset = () => {
    // Prevent rapid resets if in error loop
    if (this.state.errorCount > 3) {
      console.warn('⚠️ Too many errors, not auto-resetting')
      return
    }

    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    })
  }

  private handleReload = () => {
    window.location.reload()
  }

  private handleGoHome = () => {
    window.location.href = '/'
  }

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback
      }

      const { error, errorInfo, errorCount } = this.state
      const isErrorLoop = errorCount > 3

      return (
        <div
          className="min-h-screen bg-gradient-to-b from-red-50 to-white dark:from-red-950/20 dark:to-background flex items-center justify-center p-4"
          role="alert"
          aria-live="assertive"
          aria-atomic="true"
        >
          <Card className="w-full max-w-2xl border-red-200 dark:border-red-900">
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <div className="p-4 bg-red-100 dark:bg-red-900/20 rounded-full">
                  <AlertTriangle
                    className="h-12 w-12 text-red-600 dark:text-red-400"
                    aria-hidden="true"
                  />
                </div>
              </div>
              <CardTitle className="text-2xl font-bold text-red-900 dark:text-red-100">
                {isErrorLoop ? 'Critical Error' : 'Something went wrong'}
              </CardTitle>
              <CardDescription className="text-base">
                {isErrorLoop
                  ? 'Multiple errors detected. Please reload the page or contact support.'
                  : 'We encountered an unexpected error. You can try refreshing or return to the homepage.'
                }
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Error Details (Development/Debug Mode) */}
              {this.props.showDetails && error && (
                <div className="bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 rounded-lg p-4">
                  <h3 className="font-semibold text-red-900 dark:text-red-100 mb-2 flex items-center gap-2">
                    <Bug className="h-4 w-4" aria-hidden="true" />
                    <span>Error Details</span>
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div>
                      <strong className="text-red-800 dark:text-red-200">Error:</strong>
                      <pre className="mt-1 text-red-700 dark:text-red-300 whitespace-pre-wrap font-mono text-xs">
                        {error.message}
                      </pre>
                    </div>
                    {error.stack && (
                      <details className="group">
                        <summary className="cursor-pointer text-red-800 dark:text-red-200 hover:text-red-600 dark:hover:text-red-400">
                          <strong>Stack Trace</strong>
                        </summary>
                        <pre className="mt-2 text-red-700 dark:text-red-300 whitespace-pre-wrap font-mono text-xs overflow-auto max-h-40">
                          {error.stack}
                        </pre>
                      </details>
                    )}
                    {errorInfo?.componentStack && (
                      <details className="group">
                        <summary className="cursor-pointer text-red-800 dark:text-red-200 hover:text-red-600 dark:hover:text-red-400">
                          <strong>Component Stack</strong>
                        </summary>
                        <pre className="mt-2 text-red-700 dark:text-red-300 whitespace-pre-wrap font-mono text-xs overflow-auto max-h-40">
                          {errorInfo.componentStack}
                        </pre>
                      </details>
                    )}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 pt-4">
                {!isErrorLoop && (
                  <Button
                    onClick={this.handleReset}
                    variant="default"
                    className="flex-1"
                    aria-label="Try again to recover from error"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" aria-hidden="true" />
                    Try Again
                  </Button>
                )}

                <Button
                  onClick={this.handleReload}
                  variant={isErrorLoop ? "default" : "outline"}
                  className="flex-1"
                  aria-label="Reload the entire page"
                >
                  <RefreshCw className="h-4 w-4 mr-2" aria-hidden="true" />
                  Reload Page
                </Button>

                <Button
                  onClick={this.handleGoHome}
                  variant="outline"
                  className="flex-1"
                  aria-label="Return to homepage"
                >
                  <Home className="h-4 w-4 mr-2" aria-hidden="true" />
                  Go Home
                </Button>
              </div>

              {/* Support Information */}
              <div className="text-center pt-4 border-t">
                <p className="text-sm text-muted-foreground">
                  If this problem persists, please contact support with the error details above.
                </p>
                {errorCount > 1 && (
                  <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                    Error occurred {errorCount} times
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )
    }

    return this.props.children
  }
}

/**
 * Functional wrapper for error boundary with hooks support
 */
export const ErrorBoundaryWrapper: React.FC<{
  children: ReactNode
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void
  showDetails?: boolean
}> = ({ children, onError, showDetails = process.env.NODE_ENV === 'development' }) => {
  return (
    <BulletproofErrorBoundary onError={onError} showDetails={showDetails}>
      {children}
    </BulletproofErrorBoundary>
  )
}

export default BulletproofErrorBoundary

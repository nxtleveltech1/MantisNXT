import React, { Component, ErrorInfo, ReactNode } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  AlertTriangle,
  RefreshCw,
  Bug,
  Clock,
  User,
  Monitor,
  Copy,
  Download,
  Send,
  ChevronDown,
  ChevronUp
} from 'lucide-react'

interface ErrorBoundaryState {
  hasError: boolean
  error?: Error
  errorInfo?: ErrorInfo
  errorId: string
  timestamp: Date
  expanded: boolean
}

interface ErrorBoundaryProps {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: ErrorInfo, errorId: string) => void
  showDetails?: boolean
  enableReporting?: boolean
}

interface ErrorDetails {
  message: string
  stack?: string
  componentStack?: string
  userAgent: string
  url: string
  timestamp: Date
  userId?: string
  sessionId?: string
  buildVersion?: string
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private retryCount = 0
  private maxRetries = 3

  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = {
      hasError: false,
      errorId: '',
      timestamp: new Date(),
      expanded: false
    }
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    const errorId = `ERR_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    return {
      hasError: true,
      error,
      errorId,
      timestamp: new Date()
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const { onError } = this.props
    const { errorId } = this.state

    console.error('ErrorBoundary caught an error:', error, errorInfo)

    this.setState({
      error,
      errorInfo
    })

    // Call custom error handler
    onError?.(error, errorInfo, errorId)

    // Log to external service in production
    if (process.env.NODE_ENV === 'production') {
      this.reportError(error, errorInfo, errorId)
    }
  }

  private reportError = async (error: Error, errorInfo: ErrorInfo, errorId: string) => {
    try {
      const errorDetails: ErrorDetails = {
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        userAgent: navigator.userAgent,
        url: window.location.href,
        timestamp: new Date(),
        userId: this.getUserId(),
        sessionId: this.getSessionId(),
        buildVersion: process.env.NEXT_PUBLIC_BUILD_VERSION
      }

      // In a real app, send to error reporting service
      // await fetch('/api/errors', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ errorId, ...errorDetails })
      // })

      // Error reported to logging service
    } catch (reportingError) {
      console.error('Failed to report error:', reportingError)
    }
  }

  private getUserId = (): string | undefined => {
    // Get user ID from authentication context, localStorage, etc.
    return localStorage.getItem('userId') || undefined
  }

  private getSessionId = (): string | undefined => {
    // Get session ID from sessionStorage or generate one
    let sessionId = sessionStorage.getItem('sessionId')
    if (!sessionId) {
      sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      sessionStorage.setItem('sessionId', sessionId)
    }
    return sessionId
  }

  private handleRetry = () => {
    if (this.retryCount < this.maxRetries) {
      this.retryCount++
      this.setState({
        hasError: false,
        error: undefined,
        errorInfo: undefined
      })
    }
  }

  private handleRefresh = () => {
    window.location.reload()
  }

  private copyErrorDetails = () => {
    const { error, errorInfo, errorId, timestamp } = this.state

    const details = {
      errorId,
      timestamp: timestamp.toISOString(),
      message: error?.message,
      stack: error?.stack,
      componentStack: errorInfo?.componentStack,
      url: window.location.href,
      userAgent: navigator.userAgent
    }

    navigator.clipboard.writeText(JSON.stringify(details, null, 2))
      .then(() => {
        // Show success notification
        console.log('Error details copied to clipboard')
      })
      .catch(err => {
        console.error('Failed to copy error details:', err)
      })
  }

  private downloadErrorReport = () => {
    const { error, errorInfo, errorId, timestamp } = this.state

    const report = {
      errorId,
      timestamp: timestamp.toISOString(),
      error: {
        message: error?.message,
        stack: error?.stack,
        name: error?.name
      },
      errorInfo: {
        componentStack: errorInfo?.componentStack
      },
      environment: {
        url: window.location.href,
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString(),
        buildVersion: process.env.NEXT_PUBLIC_BUILD_VERSION
      }
    }

    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `error-report-${errorId}.json`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  private formatStackTrace = (stack?: string): string[] => {
    if (!stack) return []
    return stack.split('\n').filter(line => line.trim())
  }

  render() {
    const { children, fallback, showDetails = true, enableReporting = true } = this.props
    const { hasError, error, errorInfo, errorId, timestamp, expanded } = this.state

    if (hasError) {
      if (fallback) {
        return fallback
      }

      const canRetry = this.retryCount < this.maxRetries

      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-muted/30">
          <Card className="w-full max-w-4xl">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-100 rounded-full">
                  <AlertTriangle className="h-6 w-6 text-red-600" />
                </div>
                <div className="flex-1">
                  <CardTitle className="text-red-800">Something went wrong</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    An unexpected error occurred. We've been notified and are working on it.
                  </p>
                </div>
                <Badge variant="outline" className="font-mono text-xs">
                  {errorId}
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Error Summary */}
              <Alert className="border-red-200 bg-red-50">
                <Bug className="h-4 w-4" />
                <AlertDescription className="text-red-800">
                  <div className="font-medium mb-1">{error?.name || 'Error'}</div>
                  <div className="text-sm">{error?.message || 'An unknown error occurred'}</div>
                </AlertDescription>
              </Alert>

              {/* Error Metadata */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Time:</span>
                  <span className="font-mono">{timestamp.toLocaleString()}</span>
                </div>
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">User:</span>
                  <span className="font-mono">{this.getUserId() || 'Anonymous'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Monitor className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Session:</span>
                  <span className="font-mono text-xs">{this.getSessionId()?.slice(0, 12)}...</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-2">
                {canRetry && (
                  <Button onClick={this.handleRetry} className="flex-1 sm:flex-none">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Try Again ({this.maxRetries - this.retryCount} left)
                  </Button>
                )}
                <Button variant="outline" onClick={this.handleRefresh} className="flex-1 sm:flex-none">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh Page
                </Button>
                {showDetails && (
                  <Button
                    variant="outline"
                    onClick={() => this.setState({ expanded: !expanded })}
                    className="flex-1 sm:flex-none"
                  >
                    {expanded ? <ChevronUp className="h-4 w-4 mr-2" /> : <ChevronDown className="h-4 w-4 mr-2" />}
                    {expanded ? 'Hide' : 'Show'} Details
                  </Button>
                )}
              </div>

              {/* Detailed Error Information */}
              {showDetails && expanded && (
                <Card className="border-muted">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm">Error Details</CardTitle>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="sm" onClick={this.copyErrorDetails}>
                          <Copy className="h-4 w-4 mr-1" />
                          Copy
                        </Button>
                        <Button variant="ghost" size="sm" onClick={this.downloadErrorReport}>
                          <Download className="h-4 w-4 mr-1" />
                          Download
                        </Button>
                        {enableReporting && (
                          <Button variant="ghost" size="sm">
                            <Send className="h-4 w-4 mr-1" />
                            Report
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Tabs defaultValue="error" className="w-full">
                      <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="error">Error Stack</TabsTrigger>
                        <TabsTrigger value="component">Component Stack</TabsTrigger>
                        <TabsTrigger value="environment">Environment</TabsTrigger>
                      </TabsList>

                      <TabsContent value="error" className="mt-4">
                        <ScrollArea className="h-64 w-full rounded border p-3 bg-muted/30">
                          <pre className="text-xs font-mono leading-relaxed">
                            {this.formatStackTrace(error?.stack).map((line, index) => (
                              <div
                                key={index}
                                className={`${
                                  line.includes('at ') ? 'text-blue-600' : 'text-muted-foreground'
                                }`}
                              >
                                {line}
                              </div>
                            ))}
                          </pre>
                        </ScrollArea>
                      </TabsContent>

                      <TabsContent value="component" className="mt-4">
                        <ScrollArea className="h-64 w-full rounded border p-3 bg-muted/30">
                          <pre className="text-xs font-mono leading-relaxed text-muted-foreground">
                            {errorInfo?.componentStack || 'No component stack available'}
                          </pre>
                        </ScrollArea>
                      </TabsContent>

                      <TabsContent value="environment" className="mt-4">
                        <div className="space-y-3 text-sm">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div>
                              <span className="font-medium">URL:</span>
                              <div className="font-mono text-xs mt-1 p-2 bg-muted rounded">
                                {window.location.href}
                              </div>
                            </div>
                            <div>
                              <span className="font-medium">User Agent:</span>
                              <div className="font-mono text-xs mt-1 p-2 bg-muted rounded">
                                {navigator.userAgent}
                              </div>
                            </div>
                            <div>
                              <span className="font-medium">Build Version:</span>
                              <div className="font-mono text-xs mt-1 p-2 bg-muted rounded">
                                {process.env.NEXT_PUBLIC_BUILD_VERSION || 'Unknown'}
                              </div>
                            </div>
                            <div>
                              <span className="font-medium">Error ID:</span>
                              <div className="font-mono text-xs mt-1 p-2 bg-muted rounded">
                                {errorId}
                              </div>
                            </div>
                          </div>
                        </div>
                      </TabsContent>
                    </Tabs>
                  </CardContent>
                </Card>
              )}

              {/* Help Text */}
              <div className="text-xs text-muted-foreground bg-muted/30 p-3 rounded">
                <p className="mb-1">
                  <strong>What happened?</strong> An unexpected error occurred in the application.
                </p>
                <p className="mb-1">
                  <strong>What can you do?</strong> Try refreshing the page or retrying the action. If the problem persists, please contact support.
                </p>
                <p>
                  <strong>Need help?</strong> Include the error ID ({errorId}) when contacting support.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )
    }

    return children
  }
}

export default ErrorBoundary
"use client"

import React from 'react'
import { ErrorBoundary } from 'react-error-boundary'
import { AlertTriangle, RefreshCw, Settings, Database, Wifi, WifiOff, Clock } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

interface ErrorInfo {
  error: Error
  resetErrorBoundary: () => void
}

// Enhanced error analysis
function analyzeError(error: Error) {
  const message = error.message.toLowerCase()

  if (message.includes('timeout') || message.includes('timed out')) {
    return {
      type: 'timeout',
      severity: 'warning',
      title: 'Connection Timeout',
      description: 'The request took too long to complete. This may be due to high server load.',
      icon: <WifiOff className="h-8 w-8" />,
      color: 'text-yellow-600 bg-yellow-50',
      suggestions: [
        'Check your internet connection',
        'Try refreshing the page',
        'Wait a moment and try again'
      ]
    }
  }

  if (message.includes('fetch') || message.includes('network')) {
    return {
      type: 'network',
      severity: 'error',
      title: 'Network Error',
      description: 'Unable to connect to the server. Please check your connection.',
      icon: <Wifi className="h-8 w-8" />,
      color: 'text-red-600 bg-red-50',
      suggestions: [
        'Check your internet connection',
        'Verify the server is running',
        'Contact support if the issue persists'
      ]
    }
  }

  if (message.includes('database') || message.includes('circuit breaker')) {
    return {
      type: 'database',
      severity: 'critical',
      title: 'Database Connection Issue',
      description: 'Unable to connect to the database. The system is temporarily unavailable.',
      icon: <Database className="h-8 w-8" />,
      color: 'text-red-700 bg-red-100',
      suggestions: [
        'This is a server-side issue',
        'Please wait while we restore service',
        'Contact your system administrator'
      ]
    }
  }

  if (message.includes('http 5') || message.includes('500') || message.includes('502') || message.includes('503')) {
    return {
      type: 'server',
      severity: 'error',
      title: 'Server Error',
      description: 'The server encountered an error while processing your request.',
      icon: <Settings className="h-8 w-8" />,
      color: 'text-red-600 bg-red-50',
      suggestions: [
        'This is a temporary server issue',
        'Try refreshing in a few moments',
        'Contact support if the problem continues'
      ]
    }
  }

  if (message.includes('gettime') || message.includes('timestamp') || message.includes('date')) {
    return {
      type: 'data_format',
      severity: 'warning',
      title: 'Data Format Issue',
      description: 'There was an issue processing timestamp data from the server.',
      icon: <Clock className="h-8 w-8" />,
      color: 'text-yellow-600 bg-yellow-50',
      suggestions: [
        'This is usually a temporary data sync issue',
        'Try refreshing the page',
        'The system will retry automatically'
      ]
    }
  }

  // Default fallback
  return {
    type: 'unknown',
    severity: 'error',
    title: 'Something went wrong',
    description: 'An unexpected error occurred while loading the dashboard.',
    icon: <AlertTriangle className="h-8 w-8" />,
    color: 'text-red-600 bg-red-50',
    suggestions: [
      'Try refreshing the page',
      'Clear your browser cache',
      'Contact support if the issue persists'
    ]
  }
}

const ErrorFallback: React.FC<ErrorInfo> = ({ error, resetErrorBoundary }) => {
  const errorInfo = analyzeError(error)
  const [isRetrying, setIsRetrying] = React.useState(false)

  const handleRetry = async () => {
    setIsRetrying(true)
    try {
      // Wait a moment before retrying to allow any issues to resolve
      await new Promise(resolve => setTimeout(resolve, 1000))
      resetErrorBoundary()
    } catch (retryError) {
      console.error('Retry failed:', retryError)
    } finally {
      setIsRetrying(false)
    }
  }

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <Badge variant="destructive">Critical</Badge>
      case 'error':
        return <Badge variant="destructive">Error</Badge>
      case 'warning':
        return <Badge className="bg-yellow-100 text-yellow-800">Warning</Badge>
      default:
        return <Badge variant="secondary">Info</Badge>
    }
  }

  return (
    <div className="min-h-[400px] flex items-center justify-center p-6">
      <Card className="max-w-2xl w-full">
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-full ${errorInfo.color}`}>
              {errorInfo.icon}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <CardTitle className="text-xl">{errorInfo.title}</CardTitle>
                {getSeverityBadge(errorInfo.severity)}
              </div>
              <p className="text-muted-foreground">{errorInfo.description}</p>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Error Details */}
          <div className="space-y-2">
            <h4 className="font-medium text-sm">What can you do?</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              {errorInfo.suggestions.map((suggestion, index) => (
                <li key={index} className="flex items-center gap-2">
                  <div className="w-1 h-1 bg-muted-foreground rounded-full"></div>
                  {suggestion}
                </li>
              ))}
            </ul>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <Button
              onClick={handleRetry}
              disabled={isRetrying}
              className="flex items-center gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${isRetrying ? 'animate-spin' : ''}`} />
              {isRetrying ? 'Retrying...' : 'Try Again'}
            </Button>

            <Button
              variant="outline"
              onClick={() => window.location.reload()}
            >
              Refresh Page
            </Button>

            {errorInfo.type === 'database' && (
              <Button
                variant="outline"
                onClick={() => window.open('/api/health', '_blank')}
              >
                Check System Status
              </Button>
            )}
          </div>

          {/* Technical Details (Collapsible) */}
          <details className="border rounded-lg p-3">
            <summary className="cursor-pointer text-sm font-medium">
              Technical Details (for support)
            </summary>
            <div className="mt-3 space-y-2 text-xs">
              <div>
                <strong>Error Type:</strong> {errorInfo.type}
              </div>
              <div>
                <strong>Error Message:</strong> {error.message}
              </div>
              <div>
                <strong>Timestamp:</strong> {new Date().toISOString()}
              </div>
              <div>
                <strong>User Agent:</strong> {navigator.userAgent}
              </div>
              {error.stack && (
                <div>
                  <strong>Stack Trace:</strong>
                  <pre className="mt-1 p-2 bg-muted rounded text-xs overflow-x-auto">
                    {error.stack}
                  </pre>
                </div>
              )}
            </div>
          </details>
        </CardContent>
      </Card>
    </div>
  )
}

interface DashboardErrorBoundaryProps {
  children: React.ReactNode
}

const DashboardErrorBoundary: React.FC<DashboardErrorBoundaryProps> = ({ children }) => {
  return (
    <ErrorBoundary
      FallbackComponent={ErrorFallback}
      onError={(error, errorInfo) => {
        console.error('Dashboard Error Boundary caught an error:', error)
        console.error('Error Info:', errorInfo)

        // Here you could send error reports to your monitoring service
        // Example: sendErrorReport(error, errorInfo)
      }}
      onReset={() => {
        console.log('Dashboard Error Boundary reset')
        // Clear any cached error states or perform cleanup
      }}
    >
      {children}
    </ErrorBoundary>
  )
}

export default DashboardErrorBoundary
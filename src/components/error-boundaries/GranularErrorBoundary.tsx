/**
 * Granular Error Boundary Components
 * Provides section-specific error isolation for dashboard components
 */

import React, { Component, ErrorInfo, ReactNode } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import {
  AlertTriangle,
  RefreshCw,
  Bug,
  Clock,
  Shield,
  Database,
  BarChart3,
  Package,
  Users,
  ShoppingCart,
  Settings,
  FileText,
  Activity
} from 'lucide-react'

// ============================================================================
// BASE GRANULAR ERROR BOUNDARY
// ============================================================================

interface GranularErrorBoundaryState {
  hasError: boolean
  error?: Error
  errorInfo?: ErrorInfo
  errorId: string
  timestamp: Date
  retryCount: number
}

interface GranularErrorBoundaryProps {
  children: ReactNode
  sectionName: string
  icon?: ReactNode
  fallbackComponent?: ReactNode
  showRetry?: boolean
  maxRetries?: number
  onError?: (error: Error, errorInfo: ErrorInfo, sectionName: string) => void
  className?: string
}

class GranularErrorBoundary extends Component<
  GranularErrorBoundaryProps,
  GranularErrorBoundaryState
> {
  constructor(props: GranularErrorBoundaryProps) {
    super(props)
    this.state = {
      hasError: false,
      errorId: '',
      timestamp: new Date(),
      retryCount: 0
    }
  }

  static getDerivedStateFromError(error: Error): Partial<GranularErrorBoundaryState> {
    const errorId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    return {
      hasError: true,
      error,
      errorId,
      timestamp: new Date()
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const { onError, sectionName } = this.props

    console.error(`Error in ${sectionName}:`, error, errorInfo)

    this.setState({
      error,
      errorInfo
    })

    onError?.(error, errorInfo, sectionName)
  }

  private handleRetry = () => {
    const { maxRetries = 3 } = this.props
    const { retryCount } = this.state

    if (retryCount < maxRetries) {
      this.setState({
        hasError: false,
        error: undefined,
        errorInfo: undefined,
        retryCount: retryCount + 1,
        timestamp: new Date()
      })
    }
  }

  render() {
    const {
      children,
      sectionName,
      icon,
      fallbackComponent,
      showRetry = true,
      maxRetries = 3,
      className = ''
    } = this.props

    const { hasError, error, errorId, timestamp, retryCount } = this.state

    if (hasError) {
      if (fallbackComponent) {
        return fallbackComponent
      }

      const canRetry = showRetry && retryCount < maxRetries

      return (
        <Card className={`border-red-200 bg-red-50/50 ${className}`}>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-red-100 rounded-full">
                {icon || <AlertTriangle className="h-4 w-4 text-red-600" />}
              </div>
              <div className="flex-1">
                <CardTitle className="text-sm text-red-800">
                  {sectionName} Error
                </CardTitle>
                <p className="text-xs text-red-600 mt-0.5">
                  This section encountered an issue
                </p>
              </div>
              <Badge variant="outline" className="text-xs font-mono">
                {errorId.slice(-8)}
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="space-y-3">
            <Alert className="border-red-200 bg-red-50">
              <Bug className="h-3 w-3" />
              <AlertDescription className="text-red-800 text-xs">
                <div className="font-medium">{error?.name || 'Error'}</div>
                <div className="text-xs opacity-80">
                  {error?.message || 'An unexpected error occurred'}
                </div>
              </AlertDescription>
            </Alert>

            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {timestamp.toLocaleTimeString()}
              </div>
              {retryCount > 0 && (
                <div>Retries: {retryCount}/{maxRetries}</div>
              )}
            </div>

            {canRetry && (
              <Button
                size="sm"
                variant="outline"
                onClick={this.handleRetry}
                className="w-full text-xs h-7"
              >
                <RefreshCw className="h-3 w-3 mr-1" />
                Try Again ({maxRetries - retryCount} left)
              </Button>
            )}
          </CardContent>
        </Card>
      )
    }

    return children
  }
}

// ============================================================================
// SPECIALIZED ERROR BOUNDARIES
// ============================================================================

/**
 * Dashboard Section Error Boundary
 */
export const DashboardSectionBoundary: React.FC<{
  children: ReactNode
  sectionName: string
  className?: string
}> = ({ children, sectionName, className }) => (
  <GranularErrorBoundary
    sectionName={sectionName}
    icon={<BarChart3 className="h-4 w-4 text-red-600" />}
    className={className}
  >
    {children}
  </GranularErrorBoundary>
)

/**
 * Data Table Error Boundary
 */
export const DataTableBoundary: React.FC<{
  children: ReactNode
  tableName?: string
  className?: string
}> = ({ children, tableName = 'Data Table', className }) => (
  <GranularErrorBoundary
    sectionName={tableName}
    icon={<Database className="h-4 w-4 text-red-600" />}
    className={className}
    fallbackComponent={
      <Card className={`border-orange-200 bg-orange-50/50 ${className}`}>
        <CardContent className="flex flex-col items-center justify-center py-8">
          <Database className="h-8 w-8 text-orange-500 mb-2" />
          <h3 className="font-medium text-orange-800">Unable to load data</h3>
          <p className="text-sm text-orange-600">The table data could not be displayed</p>
        </CardContent>
      </Card>
    }
  >
    {children}
  </GranularErrorBoundary>
)

/**
 * Chart Error Boundary
 */
export const ChartBoundary: React.FC<{
  children: ReactNode
  chartName?: string
  className?: string
}> = ({ children, chartName = 'Chart', className }) => (
  <GranularErrorBoundary
    sectionName={chartName}
    icon={<BarChart3 className="h-4 w-4 text-red-600" />}
    className={className}
    fallbackComponent={
      <Card className={`border-blue-200 bg-blue-50/50 ${className}`}>
        <CardContent className="flex flex-col items-center justify-center py-8">
          <BarChart3 className="h-8 w-8 text-blue-500 mb-2" />
          <h3 className="font-medium text-blue-800">Chart unavailable</h3>
          <p className="text-sm text-blue-600">Unable to render chart data</p>
        </CardContent>
      </Card>
    }
  >
    {children}
  </GranularErrorBoundary>
)

/**
 * Inventory Section Error Boundary
 */
export const InventoryBoundary: React.FC<{
  children: ReactNode
  className?: string
}> = ({ children, className }) => (
  <GranularErrorBoundary
    sectionName="Inventory"
    icon={<Package className="h-4 w-4 text-red-600" />}
    className={className}
  >
    {children}
  </GranularErrorBoundary>
)

/**
 * Supplier Section Error Boundary
 */
export const SupplierBoundary: React.FC<{
  children: ReactNode
  className?: string
}> = ({ children, className }) => (
  <GranularErrorBoundary
    sectionName="Suppliers"
    icon={<Users className="h-4 w-4 text-red-600" />}
    className={className}
  >
    {children}
  </GranularErrorBoundary>
)

/**
 * Purchase Orders Error Boundary
 */
export const PurchaseOrderBoundary: React.FC<{
  children: ReactNode
  className?: string
}> = ({ children, className }) => (
  <GranularErrorBoundary
    sectionName="Purchase Orders"
    icon={<ShoppingCart className="h-4 w-4 text-red-600" />}
    className={className}
  >
    {children}
  </GranularErrorBoundary>
)

/**
 * Analytics Error Boundary
 */
export const AnalyticsBoundary: React.FC<{
  children: ReactNode
  className?: string
}> = ({ children, className }) => (
  <GranularErrorBoundary
    sectionName="Analytics"
    icon={<Activity className="h-4 w-4 text-red-600" />}
    className={className}
  >
    {children}
  </GranularErrorBoundary>
)

/**
 * Settings Error Boundary
 */
export const SettingsBoundary: React.FC<{
  children: ReactNode
  className?: string
}> = ({ children, className }) => (
  <GranularErrorBoundary
    sectionName="Settings"
    icon={<Settings className="h-4 w-4 text-red-600" />}
    className={className}
  >
    {children}
  </GranularErrorBoundary>
)

/**
 * Reports Error Boundary
 */
export const ReportsBoundary: React.FC<{
  children: ReactNode
  className?: string
}> = ({ children, className }) => (
  <GranularErrorBoundary
    sectionName="Reports"
    icon={<FileText className="h-4 w-4 text-red-600" />}
    className={className}
  >
    {children}
  </GranularErrorBoundary>
)

// ============================================================================
// HIGHER-ORDER COMPONENT
// ============================================================================

/**
 * HOC to wrap any component with error boundary
 */
export function withErrorBoundary<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  sectionName: string,
  icon?: ReactNode
) {
  const WithErrorBoundaryComponent = (props: P) => (
    <GranularErrorBoundary sectionName={sectionName} icon={icon}>
      <WrappedComponent {...props} />
    </GranularErrorBoundary>
  )

  WithErrorBoundaryComponent.displayName = `withErrorBoundary(${
    WrappedComponent.displayName || WrappedComponent.name
  })`

  return WithErrorBoundaryComponent
}

// ============================================================================
// HOOK FOR ERROR REPORTING
// ============================================================================

/**
 * Hook to manually report errors from within components
 */
export function useErrorReporting() {
  const reportError = React.useCallback((
    error: Error,
    context: string,
    additionalData?: Record<string, unknown>
  ) => {
    console.error(`Manual error report from ${context}:`, error, additionalData)

    // In production, send to error tracking service
    if (process.env.NODE_ENV === 'production') {
      // Example: Send to error tracking service
      // errorTrackingService.reportError(error, context, additionalData)
    }
  }, [])

  return { reportError }
}

export default GranularErrorBoundary